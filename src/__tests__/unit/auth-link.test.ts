/**
 * AUTH LINKING LOGIC TESTS
 * Verifies the logic used during OAuth events to extract account identities.
 * Ensures consistent account name generation for YouTube, TikTok, and Instagram.
 */

import { describe, it, expect } from 'vitest';
import { extractAccountName } from '../../lib/utils/utils';

describe('extractAccountName logic (OAuth Events)', () => {
  it('prioritizes username/handle/login (TikTok/Insta/X)', () => {
    expect(extractAccountName({ username: 'user_handle', email: 'test@gmail.com' })).toBe('user_handle');
    expect(extractAccountName({ handle: '@handle', name: 'John Doe' })).toBe('@handle');
    expect(extractAccountName({ login: 'git_login', email: 'git@local.com' })).toBe('git_login');
  });

  it('strips email domain if no handle is present (YouTube/Google fallback)', () => {
    expect(extractAccountName({ name: 'Thoufeeque Rafique', email: 'thoufeeque.rafique@gmail.com' }))
      .toBe('thoufeeque.rafique');
  });

  it('falls back to raw name if no handle or email is present', () => {
    expect(extractAccountName({ name: 'Guest User' })).toBe('Guest User');
  });

  it('returns "Connected Account" if profile is completely empty', () => {
    expect(extractAccountName({})).toBe('Connected Account');
  });
});
