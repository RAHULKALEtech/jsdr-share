/**
 * Format bytes to human readable string (KB, MB, GB)
 */
export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Format remaining milliseconds to MM:SS or HH:MM:SS
 */
export function formatTimeRemaining(ms: number): string {
  if (ms <= 0) return 'Expired';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Get category badge color and file icon type
 */
export function getFileTypeCategory(mimeType: string, filename: string): { category: string; color: string } {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  
  if (mimeType.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) {
    return { category: 'IMAGE', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' };
  }
  if (mimeType.startsWith('video/') || ['mp4', 'webm', 'mkv', 'mov', 'avi'].includes(ext)) {
    return { category: 'VIDEO', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' };
  }
  if (mimeType.startsWith('audio/') || ['mp3', 'wav', 'ogg', 'flac', 'm4a'].includes(ext)) {
    return { category: 'AUDIO', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' };
  }
  if (mimeType.includes('pdf') || ext === 'pdf') {
    return { category: 'PDF', color: 'bg-rose-500/20 text-rose-400 border-rose-500/30' };
  }
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
    return { category: 'ARCHIVE', color: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30' };
  }
  return { category: ext.toUpperCase() || 'FILE', color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' };
}

/**
 * Format SHA-256 string for UI display
 */
export function formatHash(hash?: string): string {
  if (!hash) return 'Calculating...';
  if (hash.length < 12) return hash;
  return `${hash.slice(0, 6)}...${hash.slice(-6)}`;
}
