import crypto from 'crypto';

/**
 * ENCRYPTION UTILITY
 * Provides AES-256-GCM encryption/decryption for sensitive database fields.
 * Uses AUTH_SECRET as the master key.
 */

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

// Derive a 32-byte key from the AUTH_SECRET
function getEncryptionKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('AUTH_SECRET is not set in production!');
    }
    // Fallback for local development if not set
    return crypto.createHash('sha256').update('fallback-local-secret').digest();
  }
  return crypto.createHash('sha256').update(secret).digest();
}

/**
 * Encrypts a string into a format suitable for storage.
 * Output format: [iv_hex]:[auth_tag_hex]:[encrypted_data_hex]
 */
export function encrypt(text: string): string {
  if (!text) return text;
  
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = getEncryptionKey();
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag().toString('hex');
  
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Decrypts a previously encrypted string.
 */
export function decrypt(encryptedText: string): string {
  if (!encryptedText) return encryptedText;
  
  // If the text doesn't match our format, return as-is (graceful migration/fallback)
  if (!encryptedText.includes(':')) return encryptedText;

  try {
    const [ivHex, authTagHex, encryptedData] = encryptedText.split(':');
    
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const key = getEncryptionKey();
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption failed. Returning raw value.', error);
    return encryptedText;
  }
}
