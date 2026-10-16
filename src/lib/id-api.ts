/**
 * Client for Nest pnk-id-api (/v1). Same origin via Nginx in prod.
 */

const ACCESS_KEY = "pnk_id_access";

export type IdUser = {
  id: string;
  username: string;
  /** Alias for older UI that expects `login` */
  login: string;
  email: string | null;
  phone: string | null;
  displayName: string | null;
  firstName: string | null;
  lastName: string | null;
  gender: "m" | "f" | null;
  birthDate: string | null;
  timezone: string | null;
  avatarUrl: string | null;
  telegramUsername: string | null;
  status?: string;
  sandboxUntil?: string | null;
  lastLoginAt?: string | null;
  createdAt?: string;
};

export type IdSession = {
  id: string;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
  lastUsedAt: string;
  lastSeenAt: string;
  expiresAt: string;
  current: boolean;
};

type ApiOk<T> = { ok: true; data: T };
type ApiErr = { ok: false; error: { code: string; message: string } };

function apiBase(): string {
  const raw = process.env.NEXT_PUBLIC_ID_API_URL?.replace(/\/$/, "") ?? "";
  return raw;
}

function url(path: string): string {
  const base = apiBase();
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(ACCESS_KEY);
}

export function setAccessToken(token: string | null): void {
  if (typeof window === "undefined") return;
  if (token) sessionStorage.setItem(ACCESS_KEY, token);
  else sessionStorage.removeItem(ACCESS_KEY);
}

function normalizeGender(v: unknown): "m" | "f" | null {
  return v === "m" || v === "f" ? v : null;
}

function normalizeUser(raw: Record<string, unknown>): IdUser {
  const username = String(raw.username ?? raw.login ?? "");
  return {
    id: String(raw.id),
    username,
    login: username,
    email: (raw.email as string | null) ?? null,
    phone: (raw.phone as string | null) ?? null,
    displayName: (raw.displayName as string | null) ?? null,
    firstName: (raw.firstName as string | null) ?? null,
    lastName: (raw.lastName as string | null) ?? null,
    gender: normalizeGender(raw.gender),
    birthDate: (raw.birthDate as string | null) ?? null,
    timezone: (raw.timezone as string | null) ?? null,
    avatarUrl: (raw.avatarUrl as string | null) ?? null,
    telegramUsername: (raw.telegramUsername as string | null) ?? null,
    status: raw.status as string | undefined,
    sandboxUntil: (raw.sandboxUntil as string | null) ?? null,
    lastLoginAt: (raw.lastLoginAt as string | null) ?? null,
    createdAt: raw.createdAt as string | undefined,
  };
}

async function parseJson(res: Response): Promise<ApiOk<unknown> | ApiErr> {
  try {
    return (await res.json()) as ApiOk<unknown> | ApiErr;
  } catch {
    return {
      ok: false,
      error: { code: "network", message: "Некорректный ответ сервера" },
    };
  }
}

let refreshPromise: Promise<boolean> | null = null;

async function tryRefresh(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    try {
      const res = await fetch(url("/v1/refresh"), {
        method: "POST",
        credentials: "include",
      });
      const json = await parseJson(res);
      if (!json.ok) {
        setAccessToken(null);
        return false;
      }
      const data = json.data as { accessToken?: string };
      if (data.accessToken) {
        setAccessToken(data.accessToken);
        return true;
      }
      return false;
    } catch {
      return false;
    } finally {
      refreshPromise = null;
    }
  })();
  return refreshPromise;
}

export async function idFetch<T>(
  path: string,
  init: RequestInit = {},
  opts?: { auth?: boolean; retry?: boolean },
): Promise<ApiOk<T> | ApiErr> {
  const auth = opts?.auth !== false;
  const headers = new Headers(init.headers);
  if (!headers.has("Content-Type") && init.body) {
    headers.set("Content-Type", "application/json");
  }
  if (auth) {
    const token = getAccessToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetch(url(path), {
    ...init,
    headers,
    credentials: "include",
  });

  if (res.status === 401 && auth && opts?.retry !== false) {
    const ok = await tryRefresh();
    if (ok) {
      return idFetch<T>(path, init, { auth, retry: false });
    }
  }

  const json = await parseJson(res);
  if (!json.ok) return json;
  return json as ApiOk<T>;
}

export async function idLogin(username: string, password: string) {
  const json = await idFetch<{
    accessToken: string;
    user: Record<string, unknown>;
    redirectUri?: string;
  }>(
    "/v1/login",
    {
      method: "POST",
      body: JSON.stringify({ username, password }),
    },
    { auth: false },
  );
  if (!json.ok) return json;
  setAccessToken(json.data.accessToken);
  return {
    ok: true as const,
    data: {
      accessToken: json.data.accessToken,
      user: normalizeUser(json.data.user),
      redirectUri: json.data.redirectUri,
    },
  };
}

export async function idLogout() {
  await idFetch("/v1/logout", { method: "POST" }, { auth: false });
  setAccessToken(null);
}

export async function idMe() {
  const json = await idFetch<{ user: Record<string, unknown> }>("/v1/me");
  if (!json.ok) return json;
  return {
    ok: true as const,
    data: { user: normalizeUser(json.data.user) },
  };
}

export async function idPatchMe(body: Record<string, unknown>) {
  const json = await idFetch<{ user: Record<string, unknown> }>("/v1/me", {
    method: "PATCH",
    body: JSON.stringify(body),
  });
  if (!json.ok) return json;
  return {
    ok: true as const,
    data: normalizeUser(json.data.user),
  };
}

export async function idChangePassword(
  currentPassword: string,
  newPassword: string,
) {
  return idFetch<{ changed: boolean }>("/v1/me/password", {
    method: "POST",
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}

function parseUa(ua: string | null): {
  deviceName: string | null;
  deviceType: string | null;
  browser: string | null;
  os: string | null;
} {
  if (!ua) {
    return { deviceName: null, deviceType: null, browser: null, os: null };
  }
  const mobile = /Mobile|Android|iPhone|iPad/i.test(ua);
  let browser: string | null = null;
  if (/Edg\//i.test(ua)) browser = "Edge";
  else if (/Chrome\//i.test(ua)) browser = "Chrome";
  else if (/Firefox\//i.test(ua)) browser = "Firefox";
  else if (/Safari\//i.test(ua)) browser = "Safari";
  let os: string | null = null;
  if (/Windows/i.test(ua)) os = "Windows";
  else if (/Android/i.test(ua)) os = "Android";
  else if (/iPhone|iPad|iOS/i.test(ua)) os = "iOS";
  else if (/Mac OS X|Macintosh/i.test(ua)) os = "macOS";
  else if (/Linux/i.test(ua)) os = "Linux";
  return {
    deviceName: os ? `${os}${browser ? ` · ${browser}` : ""}` : browser,
    deviceType: mobile ? "phone" : "desktop",
    browser,
    os,
  };
}

export async function idSessions() {
  const json = await idFetch<{ sessions: IdSession[] }>("/v1/sessions");
  if (!json.ok) return json;
  const sessions = json.data.sessions.map((s) => {
    const parsed = parseUa(s.userAgent);
    return {
      id: s.id,
      deviceName: parsed.deviceName,
      deviceType: parsed.deviceType,
      browser: parsed.browser,
      os: parsed.os,
      location: s.ip,
      lastSeenAt: s.lastUsedAt ?? s.lastSeenAt,
      current: s.current,
    };
  });
  return { ok: true as const, data: sessions };
}

export async function idRevokeSession(id: string) {
  return idFetch(`/v1/sessions/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export async function idLogoutAll() {
  return idFetch("/v1/logout-all", { method: "POST" });
}

export async function idRegisterStart(body: {
  username: string;
  password: string;
  email?: string;
  turnstileToken: string;
  service?: string;
  redirectUri?: string;
}) {
  return idFetch<{ pendingId: string; telegramDeepLink: string }>(
    "/v1/register/start",
    {
      method: "POST",
      body: JSON.stringify(body),
    },
    { auth: false },
  );
}

export async function idRegisterVerify(pendingId: string, code: string) {
  const json = await idFetch<{
    accessToken: string;
    user: Record<string, unknown>;
    redirectUri?: string | null;
  }>(
    "/v1/register/verify",
    {
      method: "POST",
      body: JSON.stringify({ pendingId, code }),
    },
    { auth: false },
  );
  if (!json.ok) return json;
  setAccessToken(json.data.accessToken);
  return {
    ok: true as const,
    data: {
      accessToken: json.data.accessToken,
      user: normalizeUser(json.data.user),
      redirectUri: json.data.redirectUri,
    },
  };
}

export async function idRegisterResend(
  pendingId: string,
  turnstileToken: string,
) {
  return idFetch<{ sent: boolean }>(
    "/v1/register/resend-code",
    {
      method: "POST",
      body: JSON.stringify({ pendingId, turnstileToken }),
    },
    { auth: false },
  );
}

/** Boot: refresh cookie → access, then /me */
export async function idBootstrapSession(): Promise<IdUser | null> {
  if (!getAccessToken()) {
    const ok = await tryRefresh();
    if (!ok) return null;
  }
  const me = await idMe();
  if (!me.ok) return null;
  return me.data.user;
}
