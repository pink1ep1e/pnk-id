import { RegistrationAttemptResult } from '@prisma/client';
import { RateLimitService } from './rate-limit.service';

describe('RateLimitService.assertCanStart', () => {
  function makeService(counts: {
    startsHour: number;
    successDay: number;
    successWeek: number;
    subnetDay: number;
  }) {
    const prisma = {
      registrationAttempt: {
        count: jest
          .fn()
          .mockResolvedValueOnce(counts.startsHour)
          .mockResolvedValueOnce(counts.successDay)
          .mockResolvedValueOnce(counts.successWeek)
          .mockResolvedValueOnce(counts.subnetDay),
        create: jest.fn(),
      },
    };
    const notify = { alertAdmin: jest.fn() };
    return new RateLimitService(prisma as never, notify as never);
  }

  it('allows under limits', async () => {
    const svc = makeService({
      startsHour: 1,
      successDay: 0,
      successWeek: 0,
      subnetDay: 0,
    });
    await expect(svc.assertCanStart('1.2.3.4')).resolves.toEqual({ ok: true });
  });

  it('blocks when form attempts exceed hourly limit', async () => {
    const svc = makeService({
      startsHour: 10,
      successDay: 0,
      successWeek: 0,
      subnetDay: 0,
    });
    await expect(svc.assertCanStart('1.2.3.4')).resolves.toEqual({
      ok: false,
      reason: 'too_many_attempts',
    });
  });

  it('blocks daily success limit', async () => {
    const svc = makeService({
      startsHour: 0,
      successDay: 2,
      successWeek: 2,
      subnetDay: 0,
    });
    await expect(svc.assertCanStart('1.2.3.4')).resolves.toEqual({
      ok: false,
      reason: 'daily_limit',
    });
  });
});

describe('RateLimitService.subnetOf', () => {
  it('delegates to /24', () => {
    const svc = new RateLimitService({} as never, {} as never);
    expect(svc.subnetOf('10.20.30.40')).toBe('10.20.30.0/24');
  });
});

describe('RegistrationAttemptResult', () => {
  it('exposes expected enums', () => {
    expect(RegistrationAttemptResult.START_OK).toBe('START_OK');
  });
});
