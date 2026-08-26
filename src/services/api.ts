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

const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB Chunk size for ultra-fast multi-file streaming

export async function createSession(): Promise<CreateSessionResponse> {
  const res = await fetch('/api/transfer/create', { method: 'POST' });
  return res.json();
}

export async function getSessionInfo(identifier: string): Promise<SessionInfoResponse> {
  const res = await fetch(`/api/transfer/${encodeURIComponent(identifier)}/info`);
  return res.json();
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

      const res = await fetch(`/api/transfer/${sessionId}/upload-chunk`, {
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
        const errorData = await res.json().catch(() => ({ error: 'Upload chunk failed' }));
        throw new Error(errorData.error || `Chunk ${chunkIndex + 1} upload failed`);
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
  return `/api/transfer/${sessionId}/download/${fileId}${inline ? '?inline=true' : ''}`;
}

export function getZipDownloadUrl(sessionId: string): string {
  return `/api/transfer/${sessionId}/download-zip`;
}
