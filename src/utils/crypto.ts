/**
 * Compute SHA-256 checksum of a File object using browser Web Crypto API safely.
 * For large files, reads in slices or relies on server stream verification to prevent browser OOM crashes.
 */
export async function calculateFileSHA256(
  file: File,
  onProgress?: (progress: number) => void
): Promise<string> {
  if (!window.crypto || !window.crypto.subtle) {
    console.warn('Web Crypto API not available in browser');
    return 'crypto_unavailable';
  }

  // For files larger than 100MB, skip browser upfront memory allocation
  // The backend Node.js stream calculator will generate the authoritative SHA-256 hash byte-for-byte.
  if (file.size > 100 * 1024 * 1024) {
    console.log(`[SHA-256] File size ${file.size} bytes exceeds 100MB threshold. Utilizing server-side stream verification.`);
    if (onProgress) onProgress(100);
    return 'deferred_server_verification';
  }

  try {
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

