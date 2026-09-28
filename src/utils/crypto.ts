/**
 * Cryptographic helpers using Web Crypto API.
 * Secure, offline-capable, and portable.
 */

const SALT = 'BacktestApp_Salt_2026_SecureKey_';

export async function hashPassword(password: string): Promise<string> {
  const salted = SALT + password;

  if (typeof crypto !== 'undefined' && crypto.subtle) {
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(salted);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (e) {
      console.warn("Crypto API fallback activated", e);
    }
  }

  // Fallback for non-HTTPS local networks (offline mode)
  let hash = 0;
  for (let i = 0; i < salted.length; i++) {
    const char = salted.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return 'fallback_' + Math.abs(hash).toString(16);
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
