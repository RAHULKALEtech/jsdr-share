import { io, Socket } from 'socket.io-client';

export const socket: Socket = io({
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
