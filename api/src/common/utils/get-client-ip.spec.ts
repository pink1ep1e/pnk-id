import { getClientIp, ipToSubnet, isSuspiciousIp } from './get-client-ip';

describe('getClientIp', () => {
  it('returns remote address when peer is not trusted', () => {
    expect(
      getClientIp({
        remoteAddress: '203.0.113.10',
        forwardedFor: '198.51.100.1',
        trustedProxies: ['127.0.0.1'],
      }),
    ).toBe('203.0.113.10');
  });

  it('uses first X-Forwarded-For hop when peer is trusted', () => {
    expect(
      getClientIp({
        remoteAddress: '127.0.0.1',
        forwardedFor: '198.51.100.1, 10.0.0.1',
        trustedProxies: ['127.0.0.1'],
      }),
    ).toBe('198.51.100.1');
  });

  it('strips ipv4-mapped ipv6 prefix', () => {
    expect(
      getClientIp({
        remoteAddress: '::ffff:127.0.0.1',
        forwardedFor: '198.51.100.2',
        trustedProxies: ['127.0.0.1'],
      }),
    ).toBe('198.51.100.2');
  });
});

describe('ipToSubnet', () => {
  it('maps IPv4 to /24', () => {
    expect(ipToSubnet('203.0.113.44')).toBe('203.0.113.0/24');
  });
});

describe('isSuspiciousIp', () => {
  it('stub returns false', () => {
    expect(isSuspiciousIp('1.2.3.4')).toBe(false);
  });
});
