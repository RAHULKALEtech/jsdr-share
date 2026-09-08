import http from 'http';
import path from 'path';
import express from 'express';
import { Server as SocketIOServer } from 'socket.io';
import app from './app.js';
import { setupSocketHandlers } from './socketHandler.js';

const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

// Socket.IO Server configuration
const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  maxHttpBufferSize: 1e8, // 100MB buffer safety
});

// Initialize Socket.IO connection handlers
setupSocketHandlers(io);

// Serve Vite frontend build in standalone production mode
const distPath = path.join(process.cwd(), 'dist');
app.use(express.static(distPath));
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api') && !req.path.startsWith('/transfer') && !req.path.startsWith('/socket.io')) {
    res.sendFile(path.join(distPath, 'index.html'), (err) => {
      if (err) {
        res.status(200).send('JSDR Share Backend API is running.');
      }
    });
  }
});

server.listen(PORT, () => {
  console.log(`=================================================`);
  console.log(`  🚀 JSDR Share Server running on port ${PORT}`);
  console.log(`  👉 Local:   http://localhost:${PORT}`);
  console.log(`  ⚡ Socket:  ws://localhost:${PORT}`);
  console.log(`=================================================`);
});

export default server;
