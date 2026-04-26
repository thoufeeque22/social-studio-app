import { describe, it, expect, vi } from 'vitest';
import { encrypt, decrypt } from '../../lib/core/encryption';

describe('Encryption Utility Security Audit', () => {
  it('should encrypt sensitive tokens and decrypt them back to the original value', () => {
    const originalToken = 'ya29.a0AfB_byDN123456789-secret-token';
    const encrypted = encrypt(originalToken);
    
    expect(encrypted).not.toBe(originalToken);
    expect(encrypted).toContain(':'); // IV:Tag:Data format
    
    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(originalToken);
  });

  it('should gracefully handle plain-text tokens (fallback for existing DB records)', () => {
    const plainToken = 'legacy-plain-text-token';
    const decrypted = decrypt(plainToken);
    
    // Should return as-is if not in our encrypted format
    expect(decrypted).toBe(plainToken);
  });

  it('should produce different ciphertexts for the same input (unique IVs)', () => {
    const token = 'same-token';
    const encrypted1 = encrypt(token);
    const encrypted2 = encrypt(token);
    
    expect(encrypted1).not.toBe(encrypted2);
    expect(decrypt(encrypted1)).toBe(token);
    expect(decrypt(encrypted2)).toBe(token);
  });
});
