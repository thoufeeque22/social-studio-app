import { describe, it, expect } from 'vitest';
import { formatHandle } from '../../lib/utils';

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
