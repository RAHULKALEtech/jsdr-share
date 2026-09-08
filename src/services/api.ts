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

export async function uploadFileChunked(
  sessionId: string,
  fileId: string,
  file: File,
  onProgress: (percent: number, uploadedBytes: number) => void
): Promise<{ success: boolean; sha256?: string; error?: string }> {
  try {
    const totalSize = file.size;
    const totalChunks = Math.max(1, Math.ceil(totalSize / CHUNK_SIZE));
    
    // Compute SHA-256 in background
    const sha256 = await calculateFileSHA256(file);

    for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
      const start = chunkIndex * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, totalSize);
      const chunkBlob = file.slice(start, end);

      const formData = new FormData();
      formData.append('chunk', chunkBlob, file.name);

      const res = await fetch(`${API_BASE_URL}/api/transfer/${sessionId}/upload-chunk`, {
        method: 'POST',
        headers: {
          'x-file-id': fileId,
          'x-file-name': encodeURIComponent(file.name),
          'x-file-size': totalSize.toString(),
          'x-file-type': file.type || 'application/octet-stream',
          'x-chunk-index': chunkIndex.toString(),
          'x-total-chunks': totalChunks.toString(),
          'x-sha256': sha256,
        },
        body: formData,
      });

      if (!res.ok) {
        const errorData = await parseJsonResponse(res).catch(e => ({ error: e.message }));
        throw new Error(errorData.error || `Chunk ${chunkIndex + 1} upload failed (${res.status})`);
      }

      const uploadedBytes = end;
      const percent = Math.min(100, Math.round((uploadedBytes / totalSize) * 100));
      onProgress(percent, uploadedBytes);
    }

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
