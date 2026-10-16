import { createHash, randomBytes, randomInt, timingSafeEqual } from 'crypto';
import * as argon2 from 'argon2';
import * as bcrypt from 'bcryptjs';

export function sha256Hex(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url');
}

export function generateSixDigitCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, '0');
}

export function safeEqualHex(a: string, b: string): boolean {
  const left = Buffer.from(a, 'utf8');
  const right = Buffer.from(b, 'utf8');
  if (left.length !== right.length) {
    return false;
  }
  return timingSafeEqual(left, right);
}

export async function hashPasswordArgon2(password: string): Promise<string> {
  return argon2.hash(password, { type: argon2.argon2id });
}

export async function verifyPassword(params: {
  password: string;
  hash: string;
  algo: 'argon2id' | 'bcrypt';
}): Promise<boolean> {
  if (params.algo === 'bcrypt') {
    return bcrypt.compare(params.password, params.hash);
  }
  return argon2.verify(params.hash, params.password);
}

/** Precomputed argon2id hash for timing equalization (password: "x"). */
const DUMMY_ARGON2_HASH =
  '$argon2id$v=19$m=65536,t=3,p=4$c29tZXNhbHRzb21lc2FsdA$8eW1b8p0nQ7aK0mY5pQZ1n6vH3xR9sT2uV4wX6yZ0aBc';

let dummyHashPromise: Promise<string> | null = null;

async function getDummyHash(): Promise<string> {
  if (!dummyHashPromise) {
    dummyHashPromise = argon2
      .hash('timing-equalization-dummy', { type: argon2.argon2id })
      .catch(() => DUMMY_ARGON2_HASH);
  }
  return dummyHashPromise;
}

/** Dummy verify to equalize timing when user is missing. */
export async function verifyDummyPassword(password: string): Promise<void> {
  const hash = await getDummyHash();
  await argon2.verify(hash, password).catch(() => undefined);
}
