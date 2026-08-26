/**
 * Compute SHA-256 checksum of a File object using browser Web Crypto API
 * Returns exact 64-character hexadecimal SHA-256 string
 */
export async function calculateFileSHA256(
  file: File,
  onProgress?: (progress: number) => void
): Promise<string> {
  if (!window.crypto || !window.crypto.subtle) {
    console.warn('Web Crypto API not available in browser');
    return 'crypto_unavailable';
  }

  try {
    // Read complete arrayBuffer to guarantee exact byte-for-byte SHA-256 hash matching backend
    const arrayBuffer = await file.arrayBuffer();
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hexHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    if (onProgress) onProgress(100);
    return hexHash;
  } catch (err) {
    console.error('SHA-256 calculation error:', err);
    return 'error_calculating_hash';
  }
}
