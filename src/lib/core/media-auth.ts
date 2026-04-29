import crypto from 'crypto';

/**
 * MEDIA AUTHENTICATION UTILITIES
 * Used to generate and verify time-limited signed URLs for the media server.
 * Prevents unauthorized access to hosted video files.
 */

const MEDIA_AUTH_SECRET = process.env.MEDIA_AUTH_SECRET || 'ss-media-secret-9911';

/**
 * Generates a signed URL for a media file.
 * Defaults to 1 hour expiry.
 */
export function generateSignedMediaUrl(fileId: string, expiryMinutes: number = 60): string {
  const expires = Math.floor(Date.now() / 1000) + (expiryMinutes * 60);
  const dataToSign = `${fileId}:${expires}`;
  
  const signature = crypto
    .createHmac('sha256', MEDIA_AUTH_SECRET)
    .update(dataToSign)
    .digest('hex');
    
  // Resolve the canonical base URL for the application
  const baseUrl = process.env.AUTH_URL || 
                  process.env.NEXTAUTH_URL || 
                  process.env.NEXT_PUBLIC_APP_URL || 
                  '';
                  
  const cleanBaseUrl = baseUrl.replace(/\/$/, '');
  return `${cleanBaseUrl}/api/media/${fileId}?expires=${expires}&signature=${signature}`;
}

/**
 * Verifies if the provided signature and expiry are valid for the given fileId.
 */
export function verifyMediaSignature(fileId: string, expires: string | null, signature: string | null): boolean {
  if (!expires || !signature) return false;
  
  const expiresNum = parseInt(expires, 10);
  if (isNaN(expiresNum)) return false;
  
  // Check if token has expired
  const now = Math.floor(Date.now() / 1000);
  if (expiresNum < now) {
    console.warn(`🔐 [MEDIA-AUTH] Token expired for ${fileId}`);
    return false;
  }
  
  const dataToSign = `${fileId}:${expires}`;
  const expectedSignature = crypto
    .createHmac('sha256', MEDIA_AUTH_SECRET)
    .update(dataToSign)
    .digest('hex');
    
  const isValid = signature === expectedSignature;
  
  if (!isValid) {
    console.error(`🔐 [MEDIA-AUTH] Invalid signature attempt for ${fileId}`);
  }
  
  return isValid;
}
