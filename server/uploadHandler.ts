import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import multer from 'multer';
import JSZip from 'jszip';
import { sessionManager } from './sessionManager.js';
import { FileMetadata } from './types.js';

const router = Router();

// Configure Multer memory storage for chunk processing
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB per chunk limit
});

function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const forwardedStr = Array.isArray(forwarded) ? forwarded[0] : forwarded;
    return forwardedStr.split(',')[0].trim();
  }
  return req.ip || req.socket.remoteAddress || '127.0.0.1';
}

function safeDecodeFileName(raw: string | string[] | undefined): string {
  if (!raw) return 'unnamed_file';
  const val = Array.isArray(raw) ? raw[0] : raw;
  try {
    return decodeURIComponent(val);
  } catch {
    return val;
  }
}

async function computeFileSha256(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    stream.on('data', chunk => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}

/**
 * Health check endpoint
 */
router.get('/health', (_req: Request, res: Response): void => {
  res.json({ status: 'ok', time: Date.now(), uploadDir: sessionManager.getUploadDir() });
});

/**
 * Create a new Transfer Session
 */
router.post('/create', (req: Request, res: Response): void => {
  try {
    const clientIp = getClientIp(req);
    const session = sessionManager.createSession(clientIp);

    const rawProto = (req.headers['x-forwarded-proto'] as string) || req.protocol || 'http';
    const protocol = rawProto.split(',')[0].trim();
    const rawHost = (req.headers['x-forwarded-host'] as string) || req.get('host') || 'localhost:3000';
    const host = rawHost.split(',')[0].trim();
    const shareUrl = `${protocol}://${host}/#receive?code=${session.code}&sid=${session.sessionId}`;

    res.json({
      success: true,
      sessionId: session.sessionId,
      code: session.code,
      expiresAt: session.expiresAt,
      shareUrl,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to create transfer session' });
  }
});

/**
 * Validate & Fetch Session Info by ID or Code
 */
router.get('/:identifier/info', (req: Request, res: Response): void => {
  const identifier = req.params.identifier as string;
  const clientIp = getClientIp(req);

  let session = sessionManager.getSessionById(identifier);
  if (!session && /^\d{5}$/.test(identifier.trim())) {
    const result = sessionManager.getSessionByCode(identifier.trim(), clientIp);
    if (result.error) {
      res.status(400).json({ success: false, error: result.error });
      return;
    }
    session = result.session;
  }

  if (!session) {
    res.status(404).json({ success: false, error: 'Transfer session expired or not found.' });
    return;
  }

  res.json({
    success: true,
    sessionId: session.sessionId,
    code: session.code,
    status: session.status,
    expiresAt: session.expiresAt,
    receiverAction: session.receiverAction,
    receiverConnectedAt: session.receiverConnectedAt,
    fileCount: Object.keys(session.files).length,
    files: Object.values(session.files).map(f => ({
      id: f.id,
      originalName: f.originalName,
      mimeType: f.mimeType,
      size: f.size,
      status: f.status,
      sha256: f.sha256
    }))
  });
});

/**
 * Update Receiver Action via REST (Fallback for serverless / non-websocket hosting)
 */
router.post('/:sessionId/action', (req: Request, res: Response): void => {
  const sessionId = req.params.sessionId as string;
  const { action } = req.body || {};

  if (!action || typeof action !== 'string') {
    res.status(400).json({ success: false, error: 'Missing or invalid action.' });
    return;
  }

  const session = sessionManager.updateReceiverAction(sessionId, action);
  if (!session) {
    res.status(404).json({ success: false, error: 'Session not found or expired.' });
    return;
  }

  res.json({
    success: true,
    status: session.status,
    receiverAction: session.receiverAction
  });
});

/**
 * Fetch Upload Status & Received Chunks (For Resume & Sync)
 */
router.get('/:sessionId/upload-status/:fileId', (req: Request, res: Response): void => {
  const sessionId = req.params.sessionId as string;
  const fileId = req.params.fileId as string;
  const session = sessionManager.getSessionById(sessionId);

  if (!session) {
    res.status(404).json({ success: false, error: 'Session expired or invalid.' });
    return;
  }

  const file = session.files[fileId];
  if (!file) {
    res.json({ success: true, exists: false, uploadedSize: 0, receivedChunks: [] });
    return;
  }

  res.json({
    success: true,
    exists: true,
    fileId: file.id,
    uploadedSize: file.uploadedSize,
    totalSize: file.size,
    status: file.status,
    receivedChunks: file.receivedChunks || [],
    totalChunks: file.totalChunks || 0,
    sha256: file.sha256
  });
});

/**
 * Upload Chunk Endpoint
 * Handles progressive, parallel chunk writing at explicit offsets
 */
router.post('/:sessionId/upload-chunk', upload.single('chunk'), async (req: Request, res: Response): Promise<void> => {
  try {
    const sessionId = req.params.sessionId as string;
    const session = sessionManager.getSessionById(sessionId);

    if (!session) {
      res.status(404).json({ success: false, error: 'Session expired or not found.' });
      return;
    }

    const fileId = (req.headers['x-file-id'] as string) || (req.body?.fileId as string) || '';
    const rawFileName = req.headers['x-file-name'] || req.body?.fileName;
    const fileName = safeDecodeFileName(rawFileName);

    const totalSizeHeader = req.headers['x-file-size'] || req.body?.fileSize;
    const totalSize = parseInt((Array.isArray(totalSizeHeader) ? totalSizeHeader[0] : totalSizeHeader) || '0', 10);

    const chunkIndexHeader = req.headers['x-chunk-index'] || req.body?.chunkIndex;
    const chunkIndex = parseInt((Array.isArray(chunkIndexHeader) ? chunkIndexHeader[0] : chunkIndexHeader) || '0', 10);

    const totalChunksHeader = req.headers['x-total-chunks'] || req.body?.totalChunks;
    const totalChunks = parseInt((Array.isArray(totalChunksHeader) ? totalChunksHeader[0] : totalChunksHeader) || '1', 10);

    const chunkSizeHeader = req.headers['x-chunk-size'] || req.body?.chunkSize;
    const chunkSize = parseInt((Array.isArray(chunkSizeHeader) ? chunkSizeHeader[0] : chunkSizeHeader) || '5242880', 10);

    const mimeTypeHeader = req.headers['x-file-type'] || req.body?.fileType;
    const mimeType = (Array.isArray(mimeTypeHeader) ? mimeTypeHeader[0] : mimeTypeHeader) || 'application/octet-stream';

    const sha256Header = req.headers['x-sha256'] || req.body?.sha256;
    const clientSha256 = Array.isArray(sha256Header) ? sha256Header[0] : sha256Header;

    if (!req.file || !fileId) {
      res.status(400).json({ success: false, error: 'Missing chunk data or file headers.' });
      return;
    }

    const sessionFolder = path.join(sessionManager.getUploadDir(), sessionId);
    if (!fs.existsSync(sessionFolder)) {
      fs.mkdirSync(sessionFolder, { recursive: true });
    }

    const safeBaseName = path.basename(fileName).replace(/[^a-zA-Z0-9._-]/g, '_') || 'file';
    const safeFileName = `${fileId}_${safeBaseName}`;
    const filePath = path.join(sessionFolder, safeFileName);

    // Create file if it doesn't exist yet
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, Buffer.alloc(0));
    }

    // Write chunk at exact byte offset (chunkIndex * chunkSize) for safe parallel writing
    const startOffset = chunkIndex * chunkSize;
    const fd = fs.openSync(filePath, 'r+');
    try {
      fs.writeSync(fd, req.file.buffer, 0, req.file.buffer.length, startOffset);
    } finally {
      fs.closeSync(fd);
    }

    const stats = fs.statSync(filePath);

    let fileMeta: FileMetadata = session.files[fileId] || {
      id: fileId,
      originalName: fileName,
      mimeType,
      size: totalSize || stats.size,
      uploadedSize: stats.size,
      receivedChunks: [],
      totalChunks,
      savedPath: filePath,
      status: 'UPLOADING',
      createdAt: Date.now(),
    };

    if (!fileMeta.receivedChunks) {
      fileMeta.receivedChunks = [];
    }

    if (!fileMeta.receivedChunks.includes(chunkIndex)) {
      fileMeta.receivedChunks.push(chunkIndex);
    }

    fileMeta.uploadedSize = stats.size;
    fileMeta.totalChunks = totalChunks;
    fileMeta.savedPath = filePath;

    // Is upload completed (all chunks arrived)?
    const isCompleted = fileMeta.receivedChunks.length >= totalChunks || stats.size >= (totalSize || stats.size);

    if (isCompleted) {
      fileMeta.status = 'READY';

      // Compute SHA-256 hash using Node stream pipeline for 100% bit-for-bit integrity validation
      const computedHash = await computeFileSha256(filePath);
      fileMeta.sha256 = computedHash;

      if (clientSha256 && clientSha256 !== 'deferred_server_verification' && clientSha256.toLowerCase() !== computedHash.toLowerCase()) {
        console.warn(`[HASH MISMATCH] File ${fileName}: client ${clientSha256} vs server ${computedHash}`);
      }
    }

    sessionManager.addFileToSession(sessionId, fileMeta);

    res.json({
      success: true,
      fileId,
      chunkIndex,
      uploadedSize: stats.size,
      totalSize: fileMeta.size,
      status: fileMeta.status,
      sha256: fileMeta.sha256,
      receivedChunks: fileMeta.receivedChunks,
      progress: Math.min(100, Math.round((fileMeta.receivedChunks.length / totalChunks) * 100))
    });
  } catch (err: any) {
    console.error('Upload chunk error:', err);
    res.status(500).json({ success: false, error: err.message || 'Chunk upload failed' });
  }
});

/**
 * Stream Exact Original File Download with Range Support
 * Preserves 100% bit-for-bit quality with zero compression or conversion
 */
router.get('/:sessionId/download/:fileId', (req: Request, res: Response): void => {
  const sessionId = req.params.sessionId as string;
  const fileId = req.params.fileId as string;
  const session = sessionManager.getSessionById(sessionId);

  if (!session) {
    res.status(404).json({ success: false, error: 'Transfer session expired or invalid.' });
    return;
  }

  const file = session.files[fileId];
  if (!file || !fs.existsSync(file.savedPath)) {
    res.status(404).json({ success: false, error: 'File not found on storage server.' });
    return;
  }

  const stat = fs.statSync(file.savedPath);
  const range = req.headers.range;

  // Handle preview requests or standard full binary stream download
  const isInline = req.query.inline === 'true';

  if (range) {
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
    const chunksize = (end - start) + 1;
    const readStream = fs.createReadStream(file.savedPath, { start, end });

    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${stat.size}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': file.mimeType || 'application/octet-stream',
      'Content-Disposition': isInline 
        ? `inline; filename="${encodeURIComponent(file.originalName)}"`
        : `attachment; filename="${encodeURIComponent(file.originalName)}"`,
      'X-File-SHA256': file.sha256 || ''
    });

    readStream.pipe(res);
  } else {
    res.writeHead(200, {
      'Content-Length': stat.size,
      'Content-Type': file.mimeType || 'application/octet-stream',
      'Content-Disposition': isInline 
        ? `inline; filename="${encodeURIComponent(file.originalName)}"`
        : `attachment; filename="${encodeURIComponent(file.originalName)}"`,
      'X-File-SHA256': file.sha256 || ''
    });

    fs.createReadStream(file.savedPath).pipe(res);
  }
});

/**
 * Download All Files as Zip Archive (No Quality Change)
 */
router.get('/:sessionId/download-zip', async (req: Request, res: Response): Promise<void> => {
  try {
    const sessionId = req.params.sessionId as string;
    const session = sessionManager.getSessionById(sessionId);

    if (!session) {
      res.status(404).json({ success: false, error: 'Transfer session expired.' });
      return;
    }

    const files = Object.values(session.files).filter(f => f.status === 'READY' && fs.existsSync(f.savedPath));
    if (files.length === 0) {
      res.status(400).json({ success: false, error: 'No files available to download.' });
      return;
    }

    const zip = new JSZip();
    for (const file of files) {
      const fileData = fs.readFileSync(file.savedPath);
      zip.file(file.originalName, fileData, { binary: true });
    }

    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'STORE' }); // STORE = Zero compression!

    res.writeHead(200, {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="JSDR_Share_${session.code}.zip"`,
      'Content-Length': zipBuffer.length
    });

    res.end(zipBuffer);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Zip creation failed' });
  }
});

export default router;
