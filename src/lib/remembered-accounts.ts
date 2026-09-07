/** Remembered pnk ID accounts on this device (Yandex-style picker). */

export type RememberedAccount = {
  id: string;
  login: string;
  email: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  lastUsedAt: number;
  /** Explicitly signed out — show under “Вы вышли из аккаунтов” */
  signedOut?: boolean;
};

const KEY = "pnk_id_remembered_accounts_v1";
const MAX = 12;

export function avatarSrcForUser(userId: string, avatarUrl?: string | null) {
  if (avatarUrl && !avatarUrl.startsWith("data:")) return avatarUrl;
  if (typeof window !== "undefined") {
    return `${window.location.origin}/api/public/avatar/${encodeURIComponent(userId)}`;
  }
  return `/api/public/avatar/${encodeURIComponent(userId)}`;
}

export function loadRememberedAccounts(): RememberedAccount[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const list = JSON.parse(raw) as RememberedAccount[];
    if (!Array.isArray(list)) return [];
    return list
      .filter((a) => a && typeof a.id === "string" && typeof a.login === "string")
      .sort((a, b) => (b.lastUsedAt || 0) - (a.lastUsedAt || 0));
  } catch {
    return [];
  }
}

function save(list: RememberedAccount[]) {
  localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)));
}

export function rememberAccount(input: {
  id: string;
  login: string;
  email?: string | null;
  displayName?: string | null;
  avatarUrl?: string | null;
}) {
  const prev = loadRememberedAccounts().filter((a) => a.id !== input.id);
  const next: RememberedAccount = {
    id: input.id,
    login: input.login,
    email: input.email ?? null,
    displayName: input.displayName ?? null,
    avatarUrl: avatarSrcForUser(input.id, input.avatarUrl),
    lastUsedAt: Date.now(),
    signedOut: false,
  };
  save([next, ...prev]);
}

export function markAccountSignedOut(userId: string) {
  const list = loadRememberedAccounts().map((a) =>
    a.id === userId ? { ...a, signedOut: true } : a,
  );
  save(list);
}

export function removeRememberedAccount(userId: string) {
  save(loadRememberedAccounts().filter((a) => a.id !== userId));
}

/** Session older than this → password required even if cookie somehow alive */
export const REAUTH_AFTER_MS = 30 * 24 * 60 * 60 * 1000;

export function isStaleAuth(authenticatedAt: string | number | Date | null | undefined) {
  if (!authenticatedAt) return true;
  const t = new Date(authenticatedAt).getTime();
  if (!Number.isFinite(t)) return true;
  return Date.now() - t > REAUTH_AFTER_MS;
}
