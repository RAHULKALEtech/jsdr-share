import { Server as SocketIOServer, Socket } from 'socket.io';
import { sessionManager } from './sessionManager.js';
import { ClientToServerEvents, ServerToClientEvents } from './types.js';

export function setupSocketHandlers(io: SocketIOServer<ClientToServerEvents, ServerToClientEvents>) {
  io.on('connection', (socket: Socket<ClientToServerEvents, ServerToClientEvents>) => {
    let currentSessionId: string | null = null;
    let isSender = false;

    /**
     * Sender Joins Session Room
     */
    socket.on('join_sender', ({ sessionId }) => {
      const session = sessionManager.getSessionById(sessionId);
      if (session) {
        currentSessionId = sessionId;
        isSender = true;
        session.senderSocketId = socket.id;

        const roomName = `session:${sessionId}`;
        socket.join(roomName);
        console.log(`[SOCKET] Sender connected to room ${roomName} (Socket: ${socket.id})`);
      }
    });

    /**
     * Receiver Joins Session Room via PIN Code or Session ID
     */
    socket.on('join_receiver', ({ codeOrSessionId }, callback) => {
      const clientIp = socket.handshake.address || '127.0.0.1';

      let session = sessionManager.getSessionById(codeOrSessionId);
      if (!session && /^\d{5}$/.test(codeOrSessionId.trim())) {
        const result = sessionManager.getSessionByCode(codeOrSessionId.trim(), clientIp);
        if (result.error) {
          callback({ success: false, error: result.error });
          return;
        }
        session = result.session;
      }

      if (!session) {
        callback({ success: false, error: 'Invalid or expired 5-digit transfer code.' });
        return;
      }

      currentSessionId = session.sessionId;
      isSender = false;
      session.receiverSocketId = socket.id;
      sessionManager.updateSessionStatus(session.sessionId, 'RECEIVER_CONNECTED');

      const roomName = `session:${session.sessionId}`;
      socket.join(roomName);

      // Notify sender room immediately
      io.to(roomName).emit('receiver_connected', {
        receiverSocketId: socket.id,
        timestamp: Date.now(),
      });

      console.log(`[SOCKET] Receiver joined room ${roomName} (Code: ${session.code})`);

      callback({
        success: true,
        session: {
          sessionId: session.sessionId,
          code: session.code,
          status: session.status,
          expiresAt: session.expiresAt,
          files: Object.values(session.files).map(f => ({
            id: f.id,
            originalName: f.originalName,
            mimeType: f.mimeType,
            size: f.size,
            status: f.status,
            sha256: f.sha256
          }))
        }
      });
    });

    /**
     * Receiver Status Notification (Viewing, Downloading, Completed)
     */
    socket.on('receiver_action', ({ sessionId, action }, callback) => {
      if (sessionId) {
        io.to(`session:${sessionId}`).emit('receiver_status_update', { action });
        if (action === 'COMPLETED') {
          sessionManager.updateSessionStatus(sessionId, 'COMPLETED');
        }
        if (callback) callback({ success: true });
      }
    });

    /**
     * Heartbeat / Ping Session
     */
    socket.on('ping_session', ({ sessionId }) => {
      const session = sessionManager.getSessionById(sessionId);
      if (session) {
        socket.emit('session_updated', { session });
      } else {
        socket.emit('session_expired', { message: 'Transfer session has expired.' });
      }
    });

    /**
     * Socket Disconnect
     */
    socket.on('disconnect', () => {
      if (currentSessionId) {
        const roomName = `session:${currentSessionId}`;
        if (isSender) {
          io.to(roomName).emit('sender_disconnected', { message: 'Sender disconnected' });
        } else {
          io.to(roomName).emit('receiver_status_update', { action: 'RECEIVER_DISCONNECTED' });
        }
      }
    });
  });
}
