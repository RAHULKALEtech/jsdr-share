import { calculateFileSHA256 } from '../utils/crypto';

export interface CreateSessionResponse {
  success: boolean;
  sessionId: string;
  code: string;
  expiresAt: number;
  shareUrl: string;
  error?: string;
}

export interface SessionInfoResponse {
  success: boolean;
  sessionId?: string;
  code?: string;
  status?: string;
  expiresAt?: number;
  receiverAction?: string;
  receiverConnectedAt?: number;
  fileCount?: number;
  files?: Array<{
    id: string;
    originalName: string;
    mimeType: string;
    size: number;
    status: string;
    sha256?: string;
  }>;
  error?: string;
}

// Configurable API base URL: normalize and trim any trailing slashes
const rawBaseUrl = (import.meta.env.VITE_API_URL || '').trim();
export const API_BASE_URL = rawBaseUrl.endsWith('/') ? rawBaseUrl.slice(0, -1) : rawBaseUrl;
const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB Chunk size for multi-file streaming

/**
 * Safely parse JSON response with fallback error handling
 */
async function parseJsonResponse(res: Response): Promise<any> {
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    const text = await res.text().catch(() => '');
    if (res.status === 405) {
      throw new Error(
        'Vercel returned 405 Method Not Allowed. The serverless API route is not mounted properly. Check vercel.json rewrites.'
      );
    }
    throw new Error(
      res.status === 404
        ? 'Backend API route not found. Verify your server endpoint or VITE_API_URL environment variable.'
        : `Server returned non-JSON response (${res.status}): ${text.slice(0, 120)}`
    );
  }
  return res.json();
}

export async function createSession(): Promise<CreateSessionResponse> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/transfer/create`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
      },
    });
    return await parseJsonResponse(res);
  } catch (err: any) {
    return { success: false, sessionId: '', code: '', expiresAt: 0, shareUrl: '', error: err.message };
  }
}

export async function getSessionInfo(identifier: string): Promise<SessionInfoResponse> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/transfer/${encodeURIComponent(identifier)}/info`, {
      headers: {
        'Accept': 'application/json',
      },
    });
    return await parseJsonResponse(res);
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function updateSessionAction(
  sessionId: string,
  action: 'VIEWING' | 'DOWNLOADING' | 'COMPLETED' | 'RECEIVER_CONNECTED' | string
): Promise<{ success: boolean; status?: string; receiverAction?: string; error?: string }> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/transfer/${encodeURIComponent(sessionId)}/action`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ action }),
    });
    return await parseJsonResponse(res);
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function getUploadStatus(
  sessionId: string,
  fileId: string
): Promise<{
  success: boolean;
  exists?: boolean;
  uploadedSize?: number;
  receivedChunks?: number[];
  totalChunks?: number;
  status?: string;
  error?: string;
}> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/transfer/${sessionId}/upload-status/${fileId}`, {
      headers: { 'Accept': 'application/json' }
    });
    return await parseJsonResponse(res);
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * High Performance Parallel & Resilient Chunked Upload Engine
 * - Dynamic chunk sizing (2MB to 10MB)
 * - Parallel concurrency pool (up to 3 parallel chunks)
 * - Exponential backoff retry (3 attempts per chunk)
 * - Resume capability skipping already-received chunks
 */
export async function uploadFileChunked(
  sessionId: string,
  fileId: string,
  file: File,
  onProgress: (percent: number, uploadedBytes: number) => void
): Promise<{ success: boolean; sha256?: string; error?: string }> {
  try {
    const totalSize = file.size;

    // Determine optimal dynamic chunk size based on file size for maximum throughput
    let chunkSize = 8 * 1024 * 1024; // 8MB standard
    if (totalSize <= 20 * 1024 * 1024) {
      chunkSize = 2 * 1024 * 1024; // 2MB for small files
    } else if (totalSize > 200 * 1024 * 1024) {
      chunkSize = 16 * 1024 * 1024; // 16MB chunks for large/multi-GB files (60% fewer HTTP roundtrips)
    }

    const totalChunks = Math.max(1, Math.ceil(totalSize / chunkSize));

    // Memory-safe SHA-256 calculation
    const sha256 = await calculateFileSHA256(file);

    // Check for existing uploaded status (resume capability)
    const statusRes = await getUploadStatus(sessionId, fileId);
    const existingChunks: number[] = statusRes.success && statusRes.receivedChunks ? statusRes.receivedChunks : [];

    // Filter out chunks that were already uploaded
    const pendingChunkIndices: number[] = [];
    for (let i = 0; i < totalChunks; i++) {
      if (!existingChunks.includes(i)) {
        pendingChunkIndices.push(i);
      }
    }

    // Track total uploaded bytes
    let completedChunksCount = existingChunks.length;

    const reportProgress = () => {
      const estimatedBytes = Math.min(totalSize, Math.round((completedChunksCount / totalChunks) * totalSize));
      const percent = Math.min(100, Math.round((completedChunksCount / totalChunks) * 100));
      onProgress(percent, estimatedBytes);
    };

    reportProgress();

    if (pendingChunkIndices.length === 0) {
      return { success: true, sha256 };
    }

    // Exponential Backoff Single Chunk Uploader
    const uploadChunkWithRetry = async (chunkIndex: number, retriesLeft: number = 3): Promise<void> => {
      const start = chunkIndex * chunkSize;
      const end = Math.min(start + chunkSize, totalSize);
      const chunkBlob = file.slice(start, end);

      const formData = new FormData();
      formData.append('chunk', chunkBlob, file.name);

      try {
        const res = await fetch(`${API_BASE_URL}/api/transfer/${sessionId}/upload-chunk`, {
          method: 'POST',
          headers: {
            'x-file-id': fileId,
            'x-file-name': encodeURIComponent(file.name),
            'x-file-size': totalSize.toString(),
            'x-file-type': file.type || 'application/octet-stream',
            'x-chunk-index': chunkIndex.toString(),
            'x-total-chunks': totalChunks.toString(),
            'x-chunk-size': chunkSize.toString(),
            'x-sha256': sha256,
          },
          body: formData,
        });

        if (!res.ok) {
          const errBody = await parseJsonResponse(res).catch(() => ({ error: `HTTP ${res.status}` }));
          throw new Error(errBody.error || `Chunk ${chunkIndex + 1} failed with status ${res.status}`);
        }

        completedChunksCount++;
        reportProgress();
      } catch (err: any) {
        if (retriesLeft > 0) {
          const backoffDelay = (4 - retriesLeft) * 1000;
          console.warn(`[RETRY] Chunk ${chunkIndex + 1}/${totalChunks} failed. Retrying in ${backoffDelay}ms... (${retriesLeft} retries left)`);
          await new Promise(r => setTimeout(r, backoffDelay));
          return uploadChunkWithRetry(chunkIndex, retriesLeft - 1);
        } else {
          throw new Error(`Chunk ${chunkIndex + 1}/${totalChunks} upload failed after retries: ${err.message}`);
        }
      }
    };

    // Parallel Concurrency Queue (Up to 4 concurrent chunk uploads per file)
    const CONCURRENCY = 4;
    let nextIndex = 0;

    const worker = async (): Promise<void> => {
      while (nextIndex < pendingChunkIndices.length) {
        const currentIndex = nextIndex++;
        const chunkIndexToUpload = pendingChunkIndices[currentIndex];
        await uploadChunkWithRetry(chunkIndexToUpload);
      }
    };

    const workerPromises: Promise<void>[] = [];
    const actualConcurrency = Math.min(CONCURRENCY, pendingChunkIndices.length);
    for (let i = 0; i < actualConcurrency; i++) {
      workerPromises.push(worker());
    }

    await Promise.all(workerPromises);

    onProgress(100, totalSize);
    return { success: true, sha256 };
  } catch (err: any) {
    return { success: false, error: err.message || 'File upload failed' };
  }
}

export function getDownloadUrl(sessionId: string, fileId: string, inline: boolean = false): string {
  return `${API_BASE_URL}/api/transfer/${sessionId}/download/${fileId}${inline ? '?inline=true' : ''}`;
}

export function getZipDownloadUrl(sessionId: string): string {
  return `${API_BASE_URL}/api/transfer/${sessionId}/download-zip`;
}

