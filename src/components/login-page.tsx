"use client";

import {
  AuthBrandFooter,
  AuthBrandHeader,
  ServiceInstallBar,
} from "@/components/auth-brand";
import { ArrowRight, QrCode, Trash2, X } from "@/lib/icons";
import {
  avatarSrcForUser,
  isStaleAuth,
  loadRememberedAccounts,
  markAccountSignedOut,
  rememberAccount,
  removeRememberedAccount,
  type RememberedAccount,
} from "@/lib/remembered-accounts";
import { authHref, afterAuthPath } from "@/lib/services";
import { useServiceBrand } from "@/lib/use-service-brand";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import QRCode from "qrcode";

type LoginMethod = "password" | "qr";
type View = "picker" | "methods";

const inputClass =
  "h-[54px] md:h-[56px] rounded-[12px] bg-[#0f1115] px-4 md:px-5 text-[16px] md:text-[17px] font-[family-name:var(--font-manrope)] text-white placeholder:text-white/35 outline-none transition-[box-shadow,background-color] focus:bg-[#12141a] focus:shadow-[0_0_0_3px_rgba(0,102,255,0.22)]";

const primaryBtn =
  "mt-1 h-[54px] md:h-[56px] rounded-[12px] bg-[#0066ff] text-white font-[family-name:var(--font-manrope)] font-semibold text-[17px] inline-flex items-center justify-center gap-2 hover:bg-[#0052cc] transition-colors disabled:opacity-50";

/** Secondary actions — filled dark surface, no border (ID style). */
const softBtn =
  "w-full h-[52px] rounded-[14px] bg-[#0f1115] text-white/85 font-[family-name:var(--font-manrope)] font-semibold text-[15px] inline-flex items-center justify-center hover:bg-[#14161c] hover:text-white transition-colors";

type CurrentSession = {
  user: {
    id: string;
    login: string;
    email: string | null;
    displayName: string | null;
    avatarUrl: string | null;
  };
  authenticatedAt: string | null;
  needsReauth: boolean;
};

function AccountAvatar({
  account,
  size = 48,
}: {
  account: {
    id: string;
    login: string;
    displayName?: string | null;
    avatarUrl?: string | null;
  };
  size?: number;
}) {
  const [broken, setBroken] = useState(false);
  const src = avatarSrcForUser(account.id, account.avatarUrl);
  const letter = (account.displayName || account.login || "?")
    .trim()
    .charAt(0)
    .toUpperCase();

  return (
    <div
      className="shrink-0 rounded-full overflow-hidden bg-[#0066ff] flex items-center justify-center text-white font-semibold font-[family-name:var(--font-manrope)]"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }}
    >
      {!broken ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          className="h-full w-full object-cover"
          onError={() => setBroken(true)}
        />
      ) : (
        letter
      )}
    </div>
  );
}

function AccountTile({
  account,
  badge,
  confirmOpen,
  onSelect,
  onAskRemove,
  onConfirmRemove,
  onCancelRemove,
}: {
  account: RememberedAccount;
  badge?: string | null;
  confirmOpen: boolean;
  onSelect: () => void;
  onAskRemove: () => void;
  onConfirmRemove: () => void;
  onCancelRemove: () => void;
}) {
  const title = account.email || `${account.login}@pnkmail.ru`;
  const subtitle = account.displayName || account.login;

  return (
    <div className="rounded-[16px] bg-[#0f1115] overflow-hidden">
      <div className="flex items-center gap-1 pr-1.5">
        <button
          type="button"
          onClick={onSelect}
          className="min-w-0 flex-1 flex items-center gap-3 px-3.5 py-3.5 text-left hover:bg-white/[0.03] transition-colors"
        >
          <AccountAvatar account={account} />
          <div className="min-w-0 flex-1">
            <p className="text-[13px] text-white/40 font-[family-name:var(--font-manrope)] truncate">
              {title}
            </p>
            <p className="text-[15px] text-white font-[family-name:var(--font-manrope)] font-semibold truncate leading-snug">
              {subtitle}
            </p>
            {badge ? (
              <span className="mt-1.5 inline-flex items-center rounded-[8px] bg-[#1a1c22] px-2 py-0.5 text-[11px] text-white/50 font-[family-name:var(--font-manrope)]">
                {badge}
              </span>
            ) : null}
          </div>
        </button>
        {!confirmOpen && (
          <button
            type="button"
            className="shrink-0 h-10 w-10 rounded-[12px] flex items-center justify-center text-white/35 hover:bg-white/5 hover:text-white/70 transition-colors"
            aria-label="Убрать из списка"
            title="Убрать из списка"
            onClick={(e) => {
              e.stopPropagation();
              onAskRemove();
            }}
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>

      <AnimatePresence initial={false}>
        {confirmOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div className="px-3.5 pb-3.5 flex items-center gap-2">
              <p className="flex-1 text-[13px] text-white/45 font-[family-name:var(--font-manrope)]">
                Убрать из списка на этом устройстве?
              </p>
              <button
                type="button"
                onClick={onCancelRemove}
                className="h-9 px-3 rounded-[10px] bg-[#1a1c22] text-[13px] text-white/60 hover:text-white font-[family-name:var(--font-manrope)]"
              >
                Нет
              </button>
              <button
                type="button"
                onClick={onConfirmRemove}
                className="h-9 px-3 rounded-[10px] bg-[#2a1215] text-[13px] text-red-400 hover:bg-[#3a181c] font-[family-name:var(--font-manrope)] font-medium"
              >
                Убрать
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();
  const { brand, serviceId, next, footerCopy } = useServiceBrand();
  const state = params.get("state");
  const afterLogin = afterAuthPath(brand, next, state);
  const modeAdd = params.get("mode") === "add";

  const [view, setView] = useState<View>("picker");
  const [active, setActive] = useState<LoginMethod | null>(null);
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [boot, setBoot] = useState(true);
  const [current, setCurrent] = useState<CurrentSession | null>(null);
  const [remembered, setRemembered] = useState<RememberedAccount[]>([]);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [removeConfirmId, setRemoveConfirmId] = useState<string | null>(null);

  const refreshRemembered = () => setRemembered(loadRememberedAccounts());

  const handleRemoveAccount = (account: RememberedAccount) => {
    if (current?.user?.id === account.id) {
      markAccountSignedOut(account.id);
      void fetch("/api/auth/logout", { method: "POST" });
      setCurrent(null);
    } else {
      removeRememberedAccount(account.id);
    }
    setRemoveConfirmId(null);
    refreshRemembered();
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      refreshRemembered();
      try {
        const res = await fetch("/api/auth/me", { cache: "no-store" });
        const json = await res.json();
        if (cancelled) return;
        if (json.ok && json.data?.user) {
          const user = json.data.user;
          rememberAccount({
            id: user.id,
            login: user.login,
            email: user.email,
            displayName: user.displayName,
            avatarUrl: user.avatarUrl,
          });
          setCurrent({
            user,
            authenticatedAt: json.data.authenticatedAt || null,
            needsReauth: Boolean(json.data.needsReauth) ||
              isStaleAuth(json.data.authenticatedAt),
          });
          refreshRemembered();
        } else {
          setCurrent(null);
        }
      } catch {
        setCurrent(null);
      } finally {
        if (!cancelled) setBoot(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const activeAccounts = useMemo(() => {
    const list = remembered.filter((a) => !a.signedOut);
    if (current?.user) {
      const rest = list.filter((a) => a.id !== current.user.id);
      const self: RememberedAccount = {
        id: current.user.id,
        login: current.user.login,
        email: current.user.email,
        displayName: current.user.displayName,
        avatarUrl: avatarSrcForUser(current.user.id, current.user.avatarUrl),
        lastUsedAt: Date.now(),
        signedOut: false,
      };
      return [self, ...rest];
    }
    return list;
  }, [remembered, current]);

  const signedOutAccounts = useMemo(
    () => remembered.filter((a) => a.signedOut),
    [remembered],
  );

  const showPicker =
    !boot &&
    view === "picker" &&
    (activeAccounts.length > 0 || signedOutAccounts.length > 0 || modeAdd);

  useEffect(() => {
    if (active !== "qr") return;
    let cancelled = false;
    setQrCode(null);
    setQrDataUrl("");
    setError("");
    (async () => {
      const res = await fetch("/api/auth/qr", { method: "POST" });
      const json = await res.json();
      if (!cancelled && json.ok) {
        setQrCode(json.data.code);
        const url = await QRCode.toDataURL(json.data.payload, {
          width: 220,
          margin: 1,
          color: { dark: "#0c0d10", light: "#ffffff" },
        });
        if (!cancelled) setQrDataUrl(url);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [active]);

  useEffect(() => {
    if (!qrCode || active !== "qr") return;
    const t = setInterval(async () => {
      const res = await fetch(
        `/api/auth/qr?code=${encodeURIComponent(qrCode)}`,
      );
      const json = await res.json();
      if (!json.ok) return;
      if (json.data.status === "confirmed") {
        clearInterval(t);
        const claim = await fetch("/api/auth/qr", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: qrCode }),
        });
        const claimJson = await claim.json();
        if (claimJson.ok) {
          const u = claimJson.data?.user;
          if (u?.id) {
            rememberAccount({
              id: u.id,
              login: u.login,
              email: u.email,
              displayName: u.displayName,
              avatarUrl: u.avatarUrl,
            });
          }
          window.location.href = afterLogin;
        } else {
          setError(claimJson.error?.message || "Не удалось войти по QR");
        }
      }
    }, 1500);
    return () => clearInterval(t);
  }, [qrCode, active, router, afterLogin]);

  function openPasswordFor(account?: RememberedAccount | null) {
    setView("methods");
    setActive("password");
    setError("");
    setPassword("");
    setLogin(account?.login || account?.email || "");
  }

  function openOtherAccount() {
    setView("methods");
    setActive("password");
    setLogin("");
    setPassword("");
    setError("");
  }

  async function continueAsCurrent() {
    if (!current?.user) return;
    if (current.needsReauth) {
      openPasswordFor({
        id: current.user.id,
        login: current.user.login,
        email: current.user.email,
        displayName: current.user.displayName,
        avatarUrl: current.user.avatarUrl,
        lastUsedAt: Date.now(),
      });
      return;
    }
    rememberAccount({
      id: current.user.id,
      login: current.user.login,
      email: current.user.email,
      displayName: current.user.displayName,
      avatarUrl: current.user.avatarUrl,
    });
    window.location.href = afterLogin;
  }

  async function onPickAccount(account: RememberedAccount) {
    if (current?.user?.id === account.id && !current.needsReauth) {
      await continueAsCurrent();
      return;
    }
    // Another account or stale session → password
    openPasswordFor(account);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login, password }),
      });
      const json = await res.json();
      if (!json.ok) {
        setError(json.error?.message || "Ошибка входа");
        return;
      }
      const u = json.data?.user;
      if (u?.id) {
        rememberAccount({
          id: u.id,
          login: u.login,
          email: u.email,
          displayName: u.displayName,
          avatarUrl: u.avatarUrl,
        });
      }
      window.location.href = afterLogin;
    } catch {
      setError("Сеть недоступна");
    } finally {
      setLoading(false);
    }
  }

  if (boot) {
    return (
      <div className="min-h-screen bg-[#0c0d10] flex items-center justify-center text-white/40">
        Загрузка…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0c0d10] text-white flex flex-col">
      <AuthBrandHeader brand={brand} />

      <main className="flex-1 flex flex-col items-center px-4 pb-10">
        <div className="w-full max-w-[440px] bg-[#1a1c22] rounded-[24px] md:rounded-[28px] p-4 md:p-5">
          {showPicker ? (
            <div className="space-y-4">
              <div className="px-1 pt-1 pb-2 text-center">
                <p className="font-[family-name:var(--font-unbounded)] font-semibold text-[18px] md:text-[20px] tracking-[-0.03em] leading-snug">
                  {modeAdd
                    ? "Добавьте или выберите аккаунт"
                    : "Выберите аккаунт для входа"}
                </p>
              </div>

              <div className="space-y-2">
                {activeAccounts.map((a) => (
                  <AccountTile
                    key={a.id}
                    account={a}
                    badge={
                      current?.user?.id === a.id
                        ? current.needsReauth
                          ? "Нужен пароль"
                          : brand.name || "Сессия"
                        : null
                    }
                    confirmOpen={removeConfirmId === a.id}
                    onSelect={() => {
                      setRemoveConfirmId(null);
                      void onPickAccount(a);
                    }}
                    onAskRemove={() =>
                      setRemoveConfirmId((id) => (id === a.id ? null : a.id))
                    }
                    onCancelRemove={() => setRemoveConfirmId(null)}
                    onConfirmRemove={() => handleRemoveAccount(a)}
                  />
                ))}
              </div>

              {signedOutAccounts.length > 0 && (
                <div className="space-y-2 pt-1">
                  <p className="px-1 text-[13px] text-white/40 font-[family-name:var(--font-manrope)]">
                    Вы вышли из аккаунтов
                  </p>
                  {signedOutAccounts.map((a) => (
                    <AccountTile
                      key={a.id}
                      account={a}
                      confirmOpen={removeConfirmId === a.id}
                      onSelect={() => {
                        setRemoveConfirmId(null);
                        void onPickAccount(a);
                      }}
                      onAskRemove={() =>
                        setRemoveConfirmId((id) => (id === a.id ? null : a.id))
                      }
                      onCancelRemove={() => setRemoveConfirmId(null)}
                      onConfirmRemove={() => handleRemoveAccount(a)}
                    />
                  ))}
                </div>
              )}

              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  className={softBtn}
                  onClick={openOtherAccount}
                >
                  Войти в другой аккаунт
                </button>
                <Link
                  href={authHref("/register", { serviceId, next })}
                  className={softBtn}
                >
                  Создать новый профиль
                </Link>
              </div>
            </div>
          ) : (
            <>
              {(activeAccounts.length > 0 || signedOutAccounts.length > 0) && (
                <button
                  type="button"
                  onClick={() => {
                    setView("picker");
                    setActive(null);
                    setError("");
                  }}
                  className="mb-3 inline-flex items-center gap-1.5 text-[13px] text-white/45 hover:text-white/70 font-[family-name:var(--font-manrope)]"
                >
                  <X size={14} />К списку аккаунтов
                </button>
              )}

              <div className="grid grid-cols-[1.55fr_1fr] gap-2.5 md:gap-3 items-stretch">
                <button
                  type="button"
                  onClick={() => setActive("password")}
                  className={cn(
                    "flex flex-col justify-between text-left rounded-[18px] md:rounded-[20px] min-h-[132px] md:min-h-[148px] p-4 md:p-5 transition-colors overflow-hidden",
                    active === "password" || active === null
                      ? "bg-gradient-to-br from-[#3d8fff] via-[#0066ff] to-[#0052cc] text-white"
                      : "bg-[#24262e] text-white/80 hover:bg-[#2a2d36]",
                  )}
                >
                  <div
                    className={cn(
                      "h-9 w-9 rounded-[10px] flex items-center justify-center shrink-0",
                      active === "password" || active === null
                        ? "bg-white text-[#0066ff]"
                        : "bg-white/10 text-white",
                    )}
                  >
                    <ArrowRight size={18} strokeWidth={2.5} />
                  </div>
                  <p className="font-[family-name:var(--font-manrope)] font-semibold text-[15px] md:text-[16px] leading-tight">
                    Войти по логину
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setActive("qr")}
                  className={cn(
                    "flex flex-col justify-between text-left rounded-[18px] md:rounded-[20px] min-h-[132px] md:min-h-[148px] p-4 md:p-5 transition-colors overflow-hidden",
                    active === "qr"
                      ? "bg-gradient-to-br from-[#3d8fff] via-[#0066ff] to-[#0052cc] text-white"
                      : "bg-[#24262e] text-white hover:bg-[#2a2d36]",
                  )}
                >
                  <div
                    className={cn(
                      "h-9 w-9 rounded-[10px] flex items-center justify-center shrink-0",
                      active === "qr"
                        ? "bg-white text-[#0066ff]"
                        : "bg-transparent text-white",
                    )}
                  >
                    <QrCode size={20} />
                  </div>
                  <p className="font-[family-name:var(--font-manrope)] font-semibold text-[15px] md:text-[16px] leading-tight">
                    По QR-коду
                  </p>
                </button>
              </div>

              <AnimatePresence mode="wait">
                {active && (
                  <motion.div
                    key={active}
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.18 }}
                  >
                    <div className="pt-4">
                      {active === "password" && (
                        <form
                          className="flex flex-col gap-3"
                          onSubmit={onSubmit}
                          autoComplete="off"
                        >
                          <input
                            value={login}
                            onChange={(e) => setLogin(e.target.value)}
                            placeholder="Логин или почта"
                            className={inputClass}
                            autoFocus
                            autoComplete="off"
                            name="pnk-id-login"
                          />
                          <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Пароль"
                            className={inputClass}
                            autoComplete="current-password"
                            name="pnk-id-password"
                          />
                          {error && (
                            <p className="text-[13px] text-red-400 font-[family-name:var(--font-manrope)]">
                              {error}
                            </p>
                          )}
                          <button
                            type="submit"
                            className={primaryBtn}
                            disabled={loading}
                          >
                            {loading ? "Вход…" : "Войти"}
                            <ArrowRight size={18} />
                          </button>
                        </form>
                      )}

                      {active === "qr" && (
                        <div className="rounded-[16px] bg-[#0f1115] p-5 md:p-6 flex flex-col items-center text-center">
                          <div
                            className={cn(
                              "h-40 w-40 rounded-[14px] flex items-center justify-center overflow-hidden",
                              qrDataUrl ? "bg-white p-3" : "bg-[#16181e]",
                            )}
                          >
                            {qrDataUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={qrDataUrl}
                                alt="QR для входа"
                                className="h-full w-full"
                              />
                            ) : (
                              <QrCode
                                size={56}
                                className="text-white/45 animate-pulse"
                              />
                            )}
                          </div>
                          <p className="mt-4 text-[14px] text-white/45 font-[family-name:var(--font-manrope)] max-w-[280px]">
                            {brand.qrHint}
                          </p>
                          {error && (
                            <p className="mt-2 text-[13px] text-red-400">
                              {error}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="mt-5 px-1 flex items-center justify-between gap-4 font-[family-name:var(--font-manrope)] text-[14px] text-white/40">
                <Link
                  href={authHref("/register", { serviceId, next })}
                  className="hover:text-white transition-colors"
                >
                  {brand.registerCta}
                </Link>
                <Link
                  href="/help"
                  className="hover:text-white transition-colors"
                >
                  Проблемы со входом?
                </Link>
              </div>
            </>
          )}
        </div>

        <ServiceInstallBar brand={brand} />
      </main>

      <AuthBrandFooter
        brand={brand}
        footerCopy={footerCopy}
        serviceId={serviceId}
        next={next}
      />
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0c0d10] flex items-center justify-center text-white/40">
          Загрузка…
        </div>
      }
    >
      <LoginInner />
    </Suspense>
  );
}
