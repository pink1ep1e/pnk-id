import {
  generateSixDigitCode,
  hashPasswordArgon2,
  safeEqualHex,
  sha256Hex,
  verifyPassword,
} from './crypto';

describe('crypto helpers', () => {
  it('hashes deterministically with sha256', () => {
    expect(sha256Hex('abc')).toBe(sha256Hex('abc'));
    expect(sha256Hex('abc')).not.toBe(sha256Hex('abd'));
  });

  it('generates 6-digit codes', () => {
    for (let i = 0; i < 20; i += 1) {
      expect(generateSixDigitCode()).toMatch(/^\d{6}$/);
    }
  });

  it('argon2 hash verifies', async () => {
    const hash = await hashPasswordArgon2('secret-pass');
    await expect(
      verifyPassword({ password: 'secret-pass', hash, algo: 'argon2id' }),
    ).resolves.toBe(true);
    await expect(
      verifyPassword({ password: 'wrong', hash, algo: 'argon2id' }),
    ).resolves.toBe(false);
  });

  it('safeEqualHex compares', () => {
    expect(safeEqualHex('aa', 'aa')).toBe(true);
    expect(safeEqualHex('aa', 'ab')).toBe(false);
  });
});
