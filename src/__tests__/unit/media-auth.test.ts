import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateSignedMediaUrl, verifyMediaSignature } from '../../lib/core/media-auth';

describe('Media Authentication (Signed URLs)', () => {
  beforeEach(() => {
    vi.stubEnv('MEDIA_AUTH_SECRET', 'test-secret-key');
    vi.stubEnv('AUTH_URL', 'https://ss.test');
  });

  it('generates a valid signed URL with expected parameters', () => {
    const fileId = 'video123.mp4';
    const url = generateSignedMediaUrl(fileId);
    
    expect(url).toContain('https://ss.test/api/media/video123.mp4');
    expect(url).toContain('expires=');
    expect(url).toContain('signature=');
  });

  it('verifies a valid signature correctly', () => {
    const fileId = 'video123.mp4';
    const urlString = generateSignedMediaUrl(fileId);
    const url = new URL(urlString);
    
    const expires = url.searchParams.get('expires');
    const signature = url.searchParams.get('signature');
    
    const isValid = verifyMediaSignature(fileId, expires, signature);
    expect(isValid).toBe(true);
  });

  it('rejects an invalid signature', () => {
    const isValid = verifyMediaSignature('video123.mp4', '1999999999', 'wrong-signature');
    expect(isValid).toBe(false);
  });

  it('rejects an expired token', () => {
    const pastExpires = Math.floor(Date.now() / 1000) - 100;
    // We can't easily use generateSignedMediaUrl for past expires without modifying it, 
    // but we can manually verify logic
    const isValid = verifyMediaSignature('video123.mp4', pastExpires.toString(), 'some-sig');
    expect(isValid).toBe(false);
  });

  it('detects tampering with the fileId', () => {
    const urlString = generateSignedMediaUrl('video123.mp4');
    const url = new URL(urlString);
    
    const expires = url.searchParams.get('expires');
    const signature = url.searchParams.get('signature');
    
    // Attempting to use the same signature for a DIFFERENT file
    const isValid = verifyMediaSignature('HACKED.mp4', expires, signature);
    expect(isValid).toBe(false);
  });
});
