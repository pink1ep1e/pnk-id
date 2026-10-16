import {
  canAttemptCode,
  canResendCode,
  isCodeExpired,
  CODE_MAX_ATTEMPTS,
  RESEND_MAX_COUNT,
} from './registration-code';

describe('registration-code', () => {
  it('expires codes by timestamp', () => {
    expect(isCodeExpired(new Date(Date.now() - 1000).toISOString())).toBe(true);
    expect(isCodeExpired(new Date(Date.now() + 60_000).toISOString())).toBe(
      false,
    );
    expect(isCodeExpired(null)).toBe(true);
  });

  it('limits attempts', () => {
    expect(canAttemptCode(0)).toBe(true);
    expect(canAttemptCode(CODE_MAX_ATTEMPTS - 1)).toBe(true);
    expect(canAttemptCode(CODE_MAX_ATTEMPTS)).toBe(false);
  });

  it('enforces resend cadence', () => {
    expect(
      canResendCode({ codeSentCount: RESEND_MAX_COUNT, lastCodeSentAt: null }),
    ).toEqual({ ok: false, reason: 'max_resends' });

    expect(
      canResendCode({
        codeSentCount: 1,
        lastCodeSentAt: new Date(),
        now: Date.now(),
      }),
    ).toEqual({ ok: false, reason: 'too_soon' });

    expect(
      canResendCode({
        codeSentCount: 1,
        lastCodeSentAt: new Date(Date.now() - 61_000),
        now: Date.now(),
      }),
    ).toEqual({ ok: true });
  });
});
