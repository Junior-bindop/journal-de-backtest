/**
 * Cryptographic helpers using Web Crypto API.
 * Secure, offline-capable, and portable.
 */

import SHA256 from 'crypto-js/sha256';

const SALT = 'BacktestApp_Salt_2026_SecureKey_';

export async function hashPassword(password: string): Promise<string> {
  const salted = SALT + password;
  
  // We use crypto-js to ensure the hash is perfectly identical (SHA-256)
  // whether the user is online (HTTPS) or offline (HTTP local IP).
  return SHA256(salted).toString();
}

export async function verifyPassword(password: string, expectedHash: string): Promise<boolean> {
  const computedHash = await hashPassword(password);
  
  // Backward compatibility: If the old hash was subtle but we are now offline and generated a fallback hash,
  // we cannot easily verify it unless we have an offline JS SHA256 library.
  // For a purely local app, if this happens, the verification might fail.
  // However, this fallback ensures password changing doesn't crash entirely offline.
  return computedHash === expectedHash;
}

export function generateUUID(): string {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
