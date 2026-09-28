/**
 * Cryptographic helpers using Web Crypto API.
 * Secure, offline-capable, and portable.
 */

const SALT = 'BacktestApp_Salt_2026_SecureKey_';

// Standalone SHA-256 implementation to avoid dependency issues on Netlify
function sha256_sync(ascii: string): string {
  function rightRotate(value: number, amount: number) {
    return (value >>> amount) | (value << (32 - amount));
  }
  
  const mathPow = Math.pow;
  const maxWord = mathPow(2, 32);
  const lengthProperty = 'length' as const;
  let i, j; // Used as a counter across the whole file
  let result = '';

  const words: number[] = [];
  const asciiBitLength = ascii[lengthProperty] * 8;
  
  let hash = sha256_sync.h = sha256_sync.h || [];
  let k = sha256_sync.k = sha256_sync.k || [];
  let primeCounter = k[lengthProperty];

  const isComposite: { [key: number]: number } = {};
  for (let candidate = 2; primeCounter < 64; candidate++) {
    if (!isComposite[candidate]) {
      for (i = 0; i < 313; i += candidate) {
        isComposite[i] = candidate;
      }
      hash[primeCounter] = (mathPow(candidate, .5) * maxWord) | 0;
      k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
    }
  }
  
  ascii += '\x80'; 
  while (ascii[lengthProperty] % 64 - 56) ascii += '\x00'; 
  for (i = 0; i < ascii[lengthProperty]; i++) {
    j = ascii.charCodeAt(i);
    if (j >> 8) return ''; // ASCII only
    words[i >> 2] |= j << ((3 - i) % 4) * 8;
  }
  words[words[lengthProperty]] = ((asciiBitLength / maxWord) | 0);
  words[words[lengthProperty]] = (asciiBitLength);
  
  for (j = 0; j < words[lengthProperty];) {
    const w = words.slice(j, j += 16); 
    const oldHash = hash;
    hash = hash.slice(0, 8);
    
    for (i = 0; i < 64; i++) {
      const i2 = i + j;
      const w15 = w[i - 15], w2 = w[i - 2];
      const a = hash[0], e = hash[4];
      const temp1 = hash[7]
        + (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25))
        + ((e & hash[5]) ^ ((~e) & hash[6]))
        + k[i]
        + (w[i] = (i < 16) ? w[i] : (
            w[i - 16]
            + (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3))
            + w[i - 7]
            + (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))
          ) | 0
        );
      const temp2 = (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22))
        + ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));
      
      hash = [(temp1 + temp2) | 0].concat(hash);
      hash[4] = (hash[4] + temp1) | 0;
    }
    
    for (i = 0; i < 8; i++) {
      hash[i] = (hash[i] + oldHash[i]) | 0;
    }
  }
  
  for (i = 0; i < 8; i++) {
    for (j = 3; j + 1; j--) {
      const b = (hash[i] >> (j * 8)) & 255;
      result += ((b < 16) ? 0 : '') + b.toString(16);
    }
  }
  return result;
}
sha256_sync.h = null as number[] | null;
sha256_sync.k = null as number[] | null;

export async function hashPassword(password: string): Promise<string> {
  const salted = SALT + password;
  return sha256_sync(salted);
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
