/**
 * UTILITY FUNCTION TESTS
 * Unit tests for common utility functions in the application.
 * Covers:
 * - formatHandle: Converting names/emails into social media handles.
 * - extractAccountName: Deriving display names from complex social profile objects.
 */

import { describe, it, expect } from 'vitest';
import { formatHandle, extractAccountName } from '../../lib/utils/utils';

describe('formatHandle utility', () => {
  it('returns fallback if name is null', () => {
    expect(formatHandle(null, 'Fallback')).toBe('Fallback');
  });

  it('preserves names that already start with @', () => {
    expect(formatHandle('@alreadyhandle', 'Fallback')).toBe('@alreadyhandle');
  });

  it('preserves names that include "Account" (case-insensitive)', () => {
    expect(formatHandle('YouTube Account', 'Fallback')).toBe('YouTube Account');
    expect(formatHandle('My account', 'Fallback')).toBe('My account');
  });

  it('converts names with spaces into lowercase handles with @ prefix', () => {
    expect(formatHandle('John Doe', 'Fallback')).toBe('@johndoe');
    expect(formatHandle('Thoufeeque AR', 'Fallback')).toBe('@thoufeequear');
  });

  it('converts names to lower case and removes whitespace', () => {
    expect(formatHandle('  Test User  ', 'Fallback')).toBe('@testuser');
  });

  it('handles empty strings by applying handle formatting if not @ or Account', () => {
    // Though empty string won't happen often, it should handle it
    expect(formatHandle('', 'Fallback')).toBe('Fallback');
  });
});

describe('extractAccountName utility', () => {

  it('uses username if present', () => {
    expect(extractAccountName({ username: 'johndoe' })).toBe('johndoe');
  });

  it('uses handle if username is missing', () => {
    expect(extractAccountName({ handle: 'johndoe_handle' })).toBe('johndoe_handle');
  });

  it('extracts name from email if no handle exists', () => {
    expect(extractAccountName({ email: 'testuser@gmail.com' })).toBe('testuser');
  });

  it('uses display name as final fallback', () => {
    expect(extractAccountName({ name: 'Real Name' })).toBe('Real Name');
  });

  it('returns default fallback if profile is empty', () => {
    expect(extractAccountName({})).toBe('Connected Account');
  });
});
