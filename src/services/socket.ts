import { io, Socket } from 'socket.io-client';

const rawUrl = (import.meta.env.VITE_API_URL || '').trim();
const socketUrl = rawUrl ? (rawUrl.endsWith('/') ? rawUrl.slice(0, -1) : rawUrl) : undefined;

export const socket: Socket = io(socketUrl, {
  autoConnect: true,
  transports: ['websocket', 'polling'],
  timeout: 5000,
  reconnectionAttempts: 5,
  reconnectionDelay: 2000,
});

// Suppress unhandled connection errors when running in serverless / static environments
socket.on('connect_error', (err) => {
  // Silent fallback to HTTP polling
});

export function joinSenderRoom(sessionId: string) {
  if (socket.connected) {
    socket.emit('join_sender', { sessionId });
  }
}

export function joinReceiverRoom(
  codeOrSessionId: string,
  callback: (response: { success: boolean; session?: any; error?: string }) => void
) {
  if (socket.connected) {
    socket.emit('join_receiver', { codeOrSessionId }, callback);
  } else {
    // If socket is not connected, callback immediately with error so caller can use HTTP
    callback({ success: false, error: 'Socket disconnected. Using HTTP fallback.' });
  }
}

export function notifyReceiverAction(sessionId: string, action: 'VIEWING' | 'DOWNLOADING' | 'COMPLETED' | string) {
  if (socket.connected) {
    socket.emit('receiver_action', { sessionId, action });
  }
}
