import { normalizeUsername, validateUsername } from './username';

describe('validateUsername', () => {
  const reserved = ['admin', 'pnk', 'root'];

  it('accepts valid names', () => {
    expect(validateUsername('alice', reserved)).toBeNull();
    expect(validateUsername('bob.smith', reserved)).toBeNull();
    expect(validateUsername('user_01', reserved)).toBeNull();
  });

  it('rejects length and reserved', () => {
    expect(validateUsername('ab', reserved)).toBe('too_short');
    expect(validateUsername('a'.repeat(31), reserved)).toBe('too_long');
    expect(validateUsername('Admin', reserved)).toBe('reserved');
  });

  it('rejects bad chars and double specials', () => {
    expect(validateUsername('bad name', reserved)).toBe('invalid_chars');
    expect(validateUsername('user__name', reserved)).toBe('double_special');
    expect(validateUsername('.leading', reserved)).toBe('invalid_chars');
  });

  it('normalizes to lowercase', () => {
    expect(normalizeUsername('  Alice  ')).toBe('alice');
  });
});
