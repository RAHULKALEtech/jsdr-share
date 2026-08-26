export interface FileMetadata {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  uploadedSize: number;
  sha256?: string;
  savedPath: string;
  status: 'UPLOADING' | 'READY' | 'ERROR';
  createdAt: number;
}

export type SessionStatus = 'WAITING' | 'RECEIVER_CONNECTED' | 'TRANSFERRING' | 'COMPLETED' | 'EXPIRED';

export interface TransferSession {
  sessionId: string; // UUIDv4
  code: string;      // 5-digit numeric PIN
  createdAt: number;
  expiresAt: number;
  status: SessionStatus;
  files: Record<string, FileMetadata>;
  senderSocketId?: string;
  receiverSocketId?: string;
  failedCodeAttempts: number;
  senderIp: string;
}

export interface ClientToServerEvents {
  join_sender: (data: { sessionId: string }) => void;
  join_receiver: (data: { codeOrSessionId: string }, callback: (response: { success: boolean; session?: any; error?: string }) => void) => void;
  receiver_action: (data: { sessionId: string; action: 'VIEWING' | 'DOWNLOADING' | 'COMPLETED' }, callback?: (res: any) => void) => void;
  ping_session: (data: { sessionId: string }) => void;
}

export interface ServerToClientEvents {
  receiver_connected: (data: { receiverSocketId: string; timestamp: number }) => void;
  receiver_status_update: (data: { action: string; fileId?: string }) => void;
  session_updated: (data: { session: any }) => void;
  session_expired: (data: { message: string }) => void;
  sender_disconnected: (data: { message: string }) => void;
}
