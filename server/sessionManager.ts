import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { TransferSession, FileMetadata, SessionStatus } from './types.js';

// Determine safe storage directory: use os.tmpdir() on Vercel / serverless to prevent EROFS errors
const isVercel = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const UPLOAD_DIR = process.env.UPLOAD_DIR || (isVercel ? path.join(os.tmpdir(), 'jsdr_uploads') : path.join(process.cwd(), 'uploads'));

function ensureDirectory(dirPath: string) {
  try {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  } catch (err) {
    console.error(`[STORAGE] Failed to ensure directory ${dirPath}:`, err);
  }
}

ensureDirectory(UPLOAD_DIR);
const SESSIONS_DIR = path.join(UPLOAD_DIR, 'sessions');
const CODES_DIR = path.join(UPLOAD_DIR, 'codes');
ensureDirectory(SESSIONS_DIR);
ensureDirectory(CODES_DIR);

// Session Expiration Time: 30 minutes (in ms)
export const SESSION_TTL_MS = 30 * 60 * 1000;
export const MAX_FAILED_ATTEMPTS = 5;

class SessionManager {
  private sessions: Map<string, TransferSession> = new Map();
  private codeToSessionMap: Map<string, string> = new Map();
  private failedIpAttempts: Map<string, { count: number; lockedUntil: number }> = new Map();

  constructor() {
    // Run automated cleanup every 60 seconds (safe timer)
    try {
      const timer = setInterval(() => this.cleanupExpiredSessions(), 60 * 1000);
      if (timer && typeof timer.unref === 'function') {
        timer.unref(); // Allow node process to exit gracefully in serverless/test
      }
    } catch (e) {
      // Ignored
    }
  }

  public getUploadDir(): string {
    ensureDirectory(UPLOAD_DIR);
    return UPLOAD_DIR;
  }

  private persistSession(session: TransferSession): void {
    try {
      ensureDirectory(SESSIONS_DIR);
      ensureDirectory(CODES_DIR);

      const sessionFilePath = path.join(SESSIONS_DIR, `${session.sessionId}.json`);
      fs.writeFileSync(sessionFilePath, JSON.stringify(session, null, 2), 'utf-8');

      const codeFilePath = path.join(CODES_DIR, `${session.code}.json`);
      fs.writeFileSync(codeFilePath, JSON.stringify({ sessionId: session.sessionId, expiresAt: session.expiresAt }), 'utf-8');
    } catch (err) {
      console.error('[STORAGE] Error persisting session to disk:', err);
    }
  }

  private loadSessionFromDisk(sessionId: string): TransferSession | undefined {
    try {
      const sessionFilePath = path.join(SESSIONS_DIR, `${sessionId}.json`);
      if (fs.existsSync(sessionFilePath)) {
        const raw = fs.readFileSync(sessionFilePath, 'utf-8');
        const session: TransferSession = JSON.parse(raw);
        if (Date.now() > session.expiresAt) {
          this.deleteSession(sessionId);
          return undefined;
        }
        this.sessions.set(session.sessionId, session);
        this.codeToSessionMap.set(session.code, session.sessionId);
        return session;
      }
    } catch (err) {
      console.error(`[STORAGE] Error reading session ${sessionId} from disk:`, err);
    }
    return undefined;
  }

  private loadSessionByCodeFromDisk(code: string): TransferSession | undefined {
    try {
      const codeFilePath = path.join(CODES_DIR, `${code}.json`);
      if (fs.existsSync(codeFilePath)) {
        const raw = fs.readFileSync(codeFilePath, 'utf-8');
        const { sessionId, expiresAt } = JSON.parse(raw);
        if (Date.now() > expiresAt) {
          this.deleteSession(sessionId);
          return undefined;
        }
        return this.getSessionById(sessionId);
      }
    } catch (err) {
      console.error(`[STORAGE] Error reading code ${code} from disk:`, err);
    }
    return undefined;
  }

  public createSession(senderIp: string): TransferSession {
    const sessionId = crypto.randomUUID();
    const code = this.generateUnique5DigitCode();

    const now = Date.now();
    const session: TransferSession = {
      sessionId,
      code,
      createdAt: now,
      expiresAt: now + SESSION_TTL_MS,
      status: 'WAITING',
      files: {},
      failedCodeAttempts: 0,
      senderIp,
    };

    this.sessions.set(sessionId, session);
    this.codeToSessionMap.set(code, sessionId);

    // Create session storage folder
    const sessionFolder = path.join(UPLOAD_DIR, sessionId);
    ensureDirectory(sessionFolder);

    this.persistSession(session);

    return session;
  }

  public getSessionById(sessionId: string): TransferSession | undefined {
    let session = this.sessions.get(sessionId);
    if (!session) {
      session = this.loadSessionFromDisk(sessionId);
    }
    if (!session) return undefined;

    if (Date.now() > session.expiresAt) {
      this.deleteSession(sessionId);
      return undefined;
    }
    return session;
  }

  public getSessionByCode(code: string, clientIp: string): { session?: TransferSession; error?: string } {
    const cleanCode = code.trim();

    // Check IP lock status
    const ipLock = this.failedIpAttempts.get(clientIp);
    if (ipLock && Date.now() < ipLock.lockedUntil) {
      const waitSec = Math.ceil((ipLock.lockedUntil - Date.now()) / 1000);
      return { error: `Too many failed code attempts. Please try again in ${waitSec} seconds.` };
    }

    let sessionId = this.codeToSessionMap.get(cleanCode);
    let session = sessionId ? this.getSessionById(sessionId) : undefined;

    if (!session) {
      session = this.loadSessionByCodeFromDisk(cleanCode);
      if (session) {
        sessionId = session.sessionId;
      }
    }

    if (!session) {
      this.registerFailedAttempt(clientIp);
      return { error: 'Invalid or expired 5-digit transfer code.' };
    }

    // Reset failed IP attempts on success
    this.failedIpAttempts.delete(clientIp);
    return { session };
  }

  private registerFailedAttempt(clientIp: string) {
    const current = this.failedIpAttempts.get(clientIp) || { count: 0, lockedUntil: 0 };
    current.count += 1;
    if (current.count >= MAX_FAILED_ATTEMPTS) {
      current.lockedUntil = Date.now() + 15 * 60 * 1000; // Lock for 15 mins
    }
    this.failedIpAttempts.set(clientIp, current);
  }

  private generateUnique5DigitCode(): string {
    let code: string;
    let attempts = 0;
    do {
      // Cryptographically random 5-digit number from 10000 to 99999
      code = crypto.randomInt(10000, 100000).toString();
      attempts++;
      if (attempts > 1000) {
        throw new Error('Unable to generate unique transfer code');
      }
    } while (this.codeToSessionMap.has(code) || fs.existsSync(path.join(CODES_DIR, `${code}.json`)));

    return code;
  }

  public updateSessionStatus(sessionId: string, status: SessionStatus): TransferSession | undefined {
    const session = this.getSessionById(sessionId);
    if (session) {
      session.status = status;
      this.persistSession(session);
    }
    return session;
  }

  public updateReceiverAction(sessionId: string, action: string): TransferSession | undefined {
    const session = this.getSessionById(sessionId);
    if (session) {
      session.receiverAction = action;
      if (action === 'VIEWING' && session.status === 'WAITING') {
        session.status = 'RECEIVER_CONNECTED';
        session.receiverConnectedAt = Date.now();
      } else if (action === 'DOWNLOADING') {
        session.status = 'TRANSFERRING';
      } else if (action === 'COMPLETED') {
        session.status = 'COMPLETED';
      }
      this.persistSession(session);
    }
    return session;
  }

  public addFileToSession(sessionId: string, fileMetadata: FileMetadata): TransferSession | undefined {
    const session = this.getSessionById(sessionId);
    if (session) {
      session.files[fileMetadata.id] = fileMetadata;
      this.persistSession(session);
    }
    return session;
  }

  public deleteSession(sessionId: string): void {
    const session = this.sessions.get(sessionId) || this.loadSessionFromDisk(sessionId);
    const code = session?.code;

    if (code) {
      this.codeToSessionMap.delete(code);
      try {
        const codeFile = path.join(CODES_DIR, `${code}.json`);
        if (fs.existsSync(codeFile)) fs.unlinkSync(codeFile);
      } catch (e) {
        // Ignored
      }
    }

    this.sessions.delete(sessionId);

    try {
      const sessionFile = path.join(SESSIONS_DIR, `${sessionId}.json`);
      if (fs.existsSync(sessionFile)) fs.unlinkSync(sessionFile);
    } catch (e) {
      // Ignored
    }

    // Permanently remove files from disk storage
    try {
      const sessionFolder = path.join(UPLOAD_DIR, sessionId);
      if (fs.existsSync(sessionFolder)) {
        fs.rmSync(sessionFolder, { recursive: true, force: true });
      }
    } catch (e) {
      // Ignored
    }
  }

  public cleanupExpiredSessions(): void {
    const now = Date.now();

    // Check memory sessions
    for (const [sessionId, session] of this.sessions.entries()) {
      if (now > session.expiresAt) {
        console.log(`[SESSION] Cleaning up expired session: ${sessionId} (Code: ${session.code})`);
        this.deleteSession(sessionId);
      }
    }

    // Also scan disk session files
    try {
      if (fs.existsSync(SESSIONS_DIR)) {
        const files = fs.readdirSync(SESSIONS_DIR);
        for (const file of files) {
          if (file.endsWith('.json')) {
            const sessionId = file.replace('.json', '');
            if (!this.sessions.has(sessionId)) {
              this.loadSessionFromDisk(sessionId); // Will trigger delete if expired
            }
          }
        }
      }
    } catch (err) {
      console.error('[CLEANUP] Error during disk session cleanup:', err);
    }
  }
}

export const sessionManager = new SessionManager();
