import { io, Socket } from 'socket.io-client';

const API_BASE_URL = import.meta.env.VITE_API_URL || undefined;

export const socket: Socket = io(API_BASE_URL, {
  autoConnect: true,
  transports: ['websocket', 'polling'],
});

export function joinSenderRoom(sessionId: string) {
  socket.emit('join_sender', { sessionId });
}

export function joinReceiverRoom(
  codeOrSessionId: string,
  callback: (response: { success: boolean; session?: any; error?: string }) => void
) {
  socket.emit('join_receiver', { codeOrSessionId }, callback);
}

export function notifyReceiverAction(sessionId: string, action: 'VIEWING' | 'DOWNLOADING' | 'COMPLETED') {
  socket.emit('receiver_action', { sessionId, action });
}
