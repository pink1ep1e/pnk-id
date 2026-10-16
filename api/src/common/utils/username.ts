const USERNAME_RE = /^[a-z0-9](?:[a-z0-9._-]*[a-z0-9])?$/;
const DOUBLE_SPECIAL_RE = /[._-]{2,}/;

export type UsernameValidationError =
  'too_short' | 'too_long' | 'invalid_chars' | 'double_special' | 'reserved';

export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase();
}

export function validateUsername(
  raw: string,
  reserved: string[],
): UsernameValidationError | null {
  const username = normalizeUsername(raw);
  if (username.length < 4) return 'too_short';
  if (username.length > 30) return 'too_long';
  if (!USERNAME_RE.test(username)) return 'invalid_chars';
  if (DOUBLE_SPECIAL_RE.test(username)) return 'double_special';
  if (reserved.map((r) => r.toLowerCase()).includes(username)) {
    return 'reserved';
  }
  return null;
}
