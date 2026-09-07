/**
 * Branding for auth screens when a pnk service opens login/register.
 * Add new services here — each gets its own logo + install links.
 */

export type ServiceBrand = {
  /** Short key used in ?service= */
  id: string;
  /** OAuth client_id aliases */
  clientIds: string[];
  name: string;
  /** Public SVG/PNG under /public */
  logoSrc: string;
  logoAlt: string;
  logoWidth: number;
  logoHeight: number;
  /** Header logo link */
  homeHref: string;
  registerTitle: string;
  registerCta: string;
  loginCta: string;
  footerLine: string;
  footerCopy: string;
  supportEmail: string;
  /** Show “Установить приложение” bar */
  showInstall: boolean;
  installAndroidHref: string;
  installIosHref: string;
  qrHint: string;
  /**
   * After login/register, continue into this service (absolute URL).
   * Empty = stay on pnk ID (/cabinet).
   */
  postAuthUrl?: string;
  /** OAuth client used for handoff */
  oauthClientId?: string;
  oauthRedirectUri?: string;
};

const MAIL_ORIGIN =
  process.env.NEXT_PUBLIC_MAIL_URL?.replace(/\/$/, "") ||
  "http://localhost:3000";

export const DEFAULT_SERVICE: ServiceBrand = {
  id: "id",
  clientIds: [],
  name: "pnk ID",
  logoSrc: "/logo-id.svg",
  logoAlt: "pnk ID",
  logoWidth: 180,
  logoHeight: 54,
  homeHref: "/",
  registerTitle: "Создание pnk ID",
  registerCta: "Создать pnk ID",
  loginCta: "Уже есть pnk ID?",
  footerLine: "pnk ID — единый аккаунт для сервисов pnk.",
  footerCopy: "© {year} pnk. Все права защищены.",
  supportEmail: "support@pnkmail.ru",
  showInstall: false,
  installAndroidHref: "#",
  installIosHref: "#",
  qrHint:
    "Отсканируйте код в приложении или на телефоне, где уже выполнен вход в pnk ID.",
};

/** Known first-party services. Extend this list as products launch. */
export const SERVICES: ServiceBrand[] = [
  {
    id: "mail",
    clientIds: ["pnk-mail"],
    name: "pnk почта",
    logoSrc: "/logo-blue-bg.svg",
    logoAlt: "pnk почта",
    logoWidth: 180,
    logoHeight: 96,
    homeHref: MAIL_ORIGIN,
    registerTitle: "Создание ящика",
    registerCta: "Создать ящик",
    loginCta: "Уже есть ящик?",
    footerLine: "pnk почта — сервис электронной почты.",
    footerCopy: "© {year} pnk почта. Все права защищены.",
    supportEmail: "support@pnkmail.ru",
    showInstall: true,
    installAndroidHref: `${MAIL_ORIGIN}/install?os=android`,
    installIosHref: `${MAIL_ORIGIN}/install?os=ios`,
    qrHint:
      "Отсканируйте код в приложении pnk почта, чтобы войти без пароля.",
    postAuthUrl: `${MAIL_ORIGIN}/mail`,
    oauthClientId: "pnk-mail",
    oauthRedirectUri: `${MAIL_ORIGIN}/api/auth/callback/pnk-id`,
  },
];

const byId = new Map<string, ServiceBrand>(
  SERVICES.flatMap((s) => [
    [s.id, s],
    ...s.clientIds.map((c) => [c, s] as const),
  ]),
);

export function resolveServiceBrand(
  serviceOrClient: string | null | undefined,
): ServiceBrand {
  if (!serviceOrClient) return DEFAULT_SERVICE;
  const key = serviceOrClient.trim().toLowerCase();
  if (key === "id" || key === "pnk-id") return DEFAULT_SERVICE;
  return byId.get(key) || DEFAULT_SERVICE;
}

/** Pull service from ?service= / ?client_id= or from nested next= URL. */
export function serviceKeyFromSearchParams(
  params: URLSearchParams | { get(name: string): string | null },
): string | null {
  const direct =
    params.get("service") ||
    params.get("client_id") ||
    params.get("clientId");
  if (direct) return direct;

  const next = params.get("next");
  if (!next) return null;
  try {
    const u = new URL(next, "http://local.invalid");
    return (
      u.searchParams.get("service") ||
      u.searchParams.get("client_id") ||
      u.searchParams.get("clientId")
    );
  } catch {
    return null;
  }
}

export function authHref(
  path: "/login" | "/register",
  opts: {
    serviceId?: string | null;
    next?: string | null;
  } = {},
): string {
  const q = new URLSearchParams();
  const brand = resolveServiceBrand(opts.serviceId);
  if (brand.id !== "id") q.set("service", brand.id);
  if (opts.next) q.set("next", opts.next);
  const qs = q.toString();
  return qs ? `${path}?${qs}` : path;
}

export function formatFooterCopy(template: string, year = new Date().getFullYear()) {
  return template.replace("{year}", String(year));
}

/** Relative next= on ID, or continue into a service after auth. */
export function afterAuthPath(
  brand: ServiceBrand,
  next: string | null | undefined,
  state?: string | null,
): string {
  if (next && next.startsWith("/") && !next.startsWith("//")) {
    return next;
  }
  if (brand.id !== "id" && brand.oauthClientId && brand.oauthRedirectUri) {
    const q = new URLSearchParams({ service: brand.id });
    if (state && /^[A-Za-z0-9_-]{8,128}$/.test(state)) {
      q.set("state", state);
    }
    return `/api/auth/continue?${q.toString()}`;
  }
  return "/cabinet";
}

