import { describe, it, expect } from 'vitest';

// The friendly mapper logic we implemented in PlatformSelection.tsx
const getFriendlyError = (err: string) => {
  if (!err) return 'Upload failed';
  
  let friendly = err;

  // 1. YouTube Limit
  if (err.includes('uploadLimitExceeded') || err.includes('exceeded the number of videos')) {
    return 'YouTube upload limit reached. Try again in 24h.';
  }

  // 2. Facebook/Instagram Rate Limit
  if (err.includes('limit how often you can post') || err.includes('protect the community from spam')) {
    return 'Platform limit reached. Please try again later.';
  }

  // 3. Clean up technical prefixes
  friendly = friendly.replace(/^Error: /i, '')
                   .replace(/^Reel Handshake Step \d+ Failed: /i, '')
                   .replace(/^YT Session Init Failed: /i, '')
                   .trim();

  // 4. Try to parse JSON if it's still there
  try {
    if (friendly.startsWith('{')) {
      const parsed = JSON.parse(friendly);
      friendly = parsed.error?.message || parsed.message || friendly;
    }
  } catch { /* ignore */ }

  // 5. Final cap on length
  return friendly.length > 80 ? friendly.substring(0, 77) + '...' : friendly;
};

describe('Friendly Error Mapping', () => {
  it('should translate YouTube upload limit errors', () => {
    const rawError = JSON.stringify({ error: { message: 'The user has exceeded the number of videos they may upload.' } });
    expect(getFriendlyError(rawError)).toBe('YouTube upload limit reached. Try again in 24h.');
  });

  it('should translate Facebook community protection errors', () => {
    const rawError = 'Reel Handshake Step 1 Failed: We limit how often you can post... to protect the community from spam.';
    expect(getFriendlyError(rawError)).toBe('Platform limit reached. Please try again later.');
  });

  it('should strip technical prefixes from generic errors', () => {
    const rawError = 'Error: Reel Handshake Step 1 Failed: Authentication failed';
    expect(getFriendlyError(rawError)).toBe('Authentication failed');
  });

  it('should truncate extremely long messages', () => {
    const longError = 'A'.repeat(100);
    expect(getFriendlyError(longError).length).toBe(80);
    expect(getFriendlyError(longError)).toContain('...');
  });
});
