import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { TransferSession, FileMetadata, SessionStatus } from './types.js';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Session Expiration Time: 30 minutes (in ms)
export const SESSION_TTL_MS = 30 * 60 * 1000;
export const MAX_FAILED_ATTEMPTS = 5;

class SessionManager {
  private sessions: Map<string, TransferSession> = new Map();
  private codeToSessionMap: Map<string, string> = new Map();
  private failedIpAttempts: Map<string, { count: number; lockedUntil: number }> = new Map();

  constructor() {
    // Run automated cleanup every 60 seconds
    setInterval(() => this.cleanupExpiredSessions(), 60 * 1000);
  }

  public getUploadDir(): string {
    return UPLOAD_DIR;
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
    if (!fs.existsSync(sessionFolder)) {
      fs.mkdirSync(sessionFolder, { recursive: true });
    }

    return session;
  }

  public getSessionById(sessionId: string): TransferSession | undefined {
    const session = this.sessions.get(sessionId);
    if (!session) return undefined;
    
    if (Date.now() > session.expiresAt) {
      this.deleteSession(sessionId);
      return undefined;
    }
    return session;
  }

  public getSessionByCode(code: string, clientIp: string): { session?: TransferSession; error?: string } {
    // Check IP lock status
    const ipLock = this.failedIpAttempts.get(clientIp);
    if (ipLock && Date.now() < ipLock.lockedUntil) {
      const waitSec = Math.ceil((ipLock.lockedUntil - Date.now()) / 1000);
      return { error: `Too many failed code attempts. Please try again in ${waitSec} seconds.` };
    }

    const sessionId = this.codeToSessionMap.get(code.trim());
    if (!sessionId) {
      this.registerFailedAttempt(clientIp);
      return { error: 'Invalid 5-digit transfer code.' };
    }

    const session = this.getSessionById(sessionId);
    if (!session) {
      this.codeToSessionMap.delete(code.trim());
      this.registerFailedAttempt(clientIp);
      return { error: 'Transfer session has expired or no longer exists.' };
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
    } while (this.codeToSessionMap.has(code));
    
    return code;
  }

  public updateSessionStatus(sessionId: string, status: SessionStatus): TransferSession | undefined {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.status = status;
    }
    return session;
  }

  public addFileToSession(sessionId: string, fileMetadata: FileMetadata): TransferSession | undefined {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.files[fileMetadata.id] = fileMetadata;
    }
    return session;
  }

  public deleteSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      this.codeToSessionMap.delete(session.code);
      this.sessions.delete(sessionId);

      // Permanently remove files from disk storage
      const sessionFolder = path.join(UPLOAD_DIR, sessionId);
      if (fs.existsSync(sessionFolder)) {
        fs.rmSync(sessionFolder, { recursive: true, force: true });
      }
    }
  }

  public cleanupExpiredSessions(): void {
    const now = Date.now();
    for (const [sessionId, session] of this.sessions.entries()) {
      if (now > session.expiresAt) {
        console.log(`[SESSION] Cleaning up expired session: ${sessionId} (Code: ${session.code})`);
        this.deleteSession(sessionId);
      }
    }
  }
}

export const sessionManager = new SessionManager();
