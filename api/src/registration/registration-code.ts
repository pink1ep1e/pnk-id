/** Pure helpers for registration code rules (unit-tested). */

export const CODE_TTL_MS = 10 * 60 * 1000;
export const CODE_MAX_ATTEMPTS = 5;
export const RESEND_MIN_INTERVAL_MS = 60 * 1000;
export const RESEND_MAX_COUNT = 3;
export const PENDING_TTL_MS = 15 * 60 * 1000;

export function isCodeExpired(
  codeExpiresAt: string | Date | null | undefined,
  now = Date.now(),
): boolean {
  if (!codeExpiresAt) return true;
  const ts =
    typeof codeExpiresAt === 'string'
      ? Date.parse(codeExpiresAt)
      : codeExpiresAt.getTime();
  if (Number.isNaN(ts)) return true;
  return ts < now;
}

export function canAttemptCode(attempts: number): boolean {
  return attempts < CODE_MAX_ATTEMPTS;
}

export function canResendCode(params: {
  codeSentCount: number;
  lastCodeSentAt: Date | null;
  now?: number;
}):
  | { ok: true }
  | { ok: false; reason: 'max_resends' | 'too_soon' | 'not_linked' } {
  const now = params.now ?? Date.now();
  if (params.codeSentCount >= RESEND_MAX_COUNT) {
    return { ok: false, reason: 'max_resends' };
  }
  if (params.lastCodeSentAt) {
    const elapsed = now - params.lastCodeSentAt.getTime();
    if (elapsed < RESEND_MIN_INTERVAL_MS) {
      return { ok: false, reason: 'too_soon' };
    }
  }
  return { ok: true };
}
