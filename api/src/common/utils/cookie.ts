export type CookieSerializeOptions = {
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'lax' | 'strict' | 'none';
  domain?: string;
  path?: string;
  maxAge?: number;
};

export function serializeCookie(
  name: string,
  value: string,
  options: CookieSerializeOptions = {},
): string {
  const parts = [`${name}=${encodeURIComponent(value)}`];
  if (options.maxAge !== undefined) {
    parts.push(`Max-Age=${Math.floor(options.maxAge)}`);
  }
  if (options.domain) parts.push(`Domain=${options.domain}`);
  if (options.path) parts.push(`Path=${options.path}`);
  if (options.httpOnly) parts.push('HttpOnly');
  if (options.secure) parts.push('Secure');
  if (options.sameSite) {
    const s =
      options.sameSite === 'lax'
        ? 'Lax'
        : options.sameSite === 'strict'
          ? 'Strict'
          : 'None';
    parts.push(`SameSite=${s}`);
  }
  return parts.join('; ');
}

export function parseCookies(
  header: string | string[] | undefined,
): Record<string, string> {
  const raw = Array.isArray(header) ? header.join(';') : (header ?? '');
  const out: Record<string, string> = {};
  for (const part of raw.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (!key) continue;
    try {
      out[key] = decodeURIComponent(value);
    } catch {
      out[key] = value;
    }
  }
  return out;
}

export function clearCookie(
  name: string,
  options: Pick<
    CookieSerializeOptions,
    'domain' | 'path' | 'secure' | 'sameSite'
  >,
): string {
  return serializeCookie(name, '', {
    ...options,
    httpOnly: true,
    maxAge: 0,
  });
}
