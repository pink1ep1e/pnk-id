/**
 * Resolve client IP when behind a trusted reverse proxy.
 * Only the left-most X-Forwarded-For hop is used when the direct peer is trusted.
 */
export function getClientIp(params: {
  remoteAddress?: string | null;
  forwardedFor?: string | string[] | null;
  trustedProxies: string[];
}): string {
  const remote = normalizeIp(params.remoteAddress ?? '');
  const trusted = params.trustedProxies.map(normalizeIp).filter(Boolean);

  if (!remote) {
    return '0.0.0.0';
  }

  if (!isTrustedProxy(remote, trusted)) {
    return remote;
  }

  const header = params.forwardedFor;
  const raw = Array.isArray(header) ? header[0] : header;
  if (!raw) {
    return remote;
  }

  const first = raw.split(',')[0]?.trim() ?? '';
  const forwarded = normalizeIp(first);
  return forwarded || remote;
}

export function ipToSubnet(ip: string): string {
  const normalized = normalizeIp(ip);
  if (normalized.includes(':')) {
    // IPv6 /48 — take first three hextets after expanding ::
    const [head, tail = ''] = normalized.split('::');
    const headParts = head.split(':').filter(Boolean);
    const tailParts = tail.split(':').filter(Boolean);
    const missing = Math.max(0, 8 - headParts.length - tailParts.length);
    const parts = [
      ...headParts,
      ...Array<string>(missing).fill('0'),
      ...tailParts,
    ];
    return `${parts.slice(0, 3).join(':')}::/48`;
  }
  const octets = normalized.split('.');
  if (octets.length !== 4) {
    return normalized;
  }
  return `${octets[0]}.${octets[1]}.${octets[2]}.0/24`;
}

/** Stub for future datacenter / hosting range blocking. */
export function isSuspiciousIp(ip: string): boolean {
  void ip;
  return false;
}

function normalizeIp(ip: string): string {
  const trimmed = ip.trim();
  if (trimmed.startsWith('::ffff:')) {
    return trimmed.slice(7);
  }
  return trimmed;
}

function isTrustedProxy(ip: string, trusted: string[]): boolean {
  return trusted.includes(ip) || trusted.includes('*');
}
