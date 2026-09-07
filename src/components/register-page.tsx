"use client";

import {
  AuthBrandFooter,
  AuthBrandHeader,
  ServiceInstallBar,
} from "@/components/auth-brand";
import { DateField } from "@/components/date-field";
import { PhoneField } from "@/components/phone-field";
import { SelectField } from "@/components/select-field";
import { ArrowRight, Check } from "@/lib/icons";
import { TIMEZONES, phoneDigits, suggestLogins } from "@/lib/profile";
import {
  getPasswordStrength,
  PasswordStrengthBar,
} from "@/lib/password-strength";
import { authHref, afterAuthPath } from "@/lib/services";
import { useServiceBrand } from "@/lib/use-service-brand";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";

const inputClass =
  "h-[54px] md:h-[56px] w-full rounded-[12px] bg-[#0f1115] px-4 md:px-5 text-[16px] md:text-[17px] font-[family-name:var(--font-manrope)] text-white placeholder:text-white/35 outline-none transition-[box-shadow,background-color] focus:bg-[#12141a] focus:shadow-[0_0_0_3px_rgba(0,102,255,0.22)]";

const primaryBtn =
  "mt-1 h-[54px] md:h-[56px] w-full rounded-[12px] bg-[#0066ff] text-white font-[family-name:var(--font-manrope)] font-semibold text-[17px] inline-flex items-center justify-center gap-2 hover:bg-[#0052cc] transition-colors disabled:opacity-40 disabled:pointer-events-none";

type Step = "name" | "login" | "details" | "password";

const MAIL_DOMAIN = "pnkmail.ru";

function sanitizeEmailLocal(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "")
    .slice(0, 32);
}

function expandSuggestions(base: string[]): string[] {
  const out = new Set(base);
  for (const s of base) {
    for (let i = 1; i <= 9; i++) out.add(`${s}${i}`);
  }
  return [...out].filter((x) => x.length >= 3 && x.length <= 32).slice(0, 24);
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0c0d10] flex items-center justify-center text-white/40">
          Загрузка…
        </div>
      }
    >
      <RegisterInner />
    </Suspense>
  );
}

function RegisterInner() {
  const { brand, serviceId, next, footerCopy } = useServiceBrand();
  const afterRegister = afterAuthPath(brand, next);
  const [step, setStep] = useState<Step>("name");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [login, setLogin] = useState("");
  const [emailLocal, setEmailLocal] = useState("");
  const [gender, setGender] = useState<"m" | "f" | null>(null);
  const [birthDate, setBirthDate] = useState("");
  const [phone, setPhone] = useState("+7");
  const [timezone, setTimezone] = useState(TIMEZONES[1]);
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [loginError, setLoginError] = useState("");
  const [loginStatus, setLoginStatus] = useState<
    "idle" | "checking" | "free" | "taken"
  >("idle");
  const [emailError, setEmailError] = useState("");
  const [emailStatus, setEmailStatus] = useState<
    "idle" | "checking" | "free" | "taken" | "invalid"
  >("idle");
  const [checkingLogin, setCheckingLogin] = useState(false);
  const [freeSuggestions, setFreeSuggestions] = useState<string[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  const emailLocalClean = emailLocal.trim().toLowerCase();
  const fullEmail = emailLocalClean
    ? `${emailLocalClean}@${MAIL_DOMAIN}`
    : "";
  const emailValid = emailLocalClean.length >= 3;

  const baseSuggestions = useMemo(
    () => suggestLogins(firstName, lastName),
    [firstName, lastName],
  );

  const steps: Step[] = ["name", "login", "details", "password"];
  const stepIndex = steps.indexOf(step);

  const canContinueName =
    firstName.trim().length >= 2 && lastName.trim().length >= 2;
  const canContinueLogin =
    login.trim().length >= 3 &&
    loginStatus !== "taken" &&
    emailValid &&
    emailStatus !== "taken" &&
    emailStatus !== "invalid";
  const canContinueDetails = true;
  const canSubmit =
    password.length >= 8 &&
    getPasswordStrength(password).score >= 2 &&
    password === password2 &&
    canContinueLogin;

  useEffect(() => {
    if (step !== "login") return;
    let cancelled = false;
    (async () => {
      setLoadingSuggestions(true);
      const candidates = expandSuggestions(baseSuggestions);
      if (!candidates.length) {
        if (!cancelled) {
          setFreeSuggestions([]);
          setLoadingSuggestions(false);
        }
        return;
      }
      try {
        const res = await fetch(
          `/api/auth/check?logins=${encodeURIComponent(candidates.join(","))}`,
        );
        const json = await res.json();
        if (cancelled || !json.ok) return;
        const results = json.data.results as Record<string, boolean>;
        const free = candidates.filter((c) => results[c]);
        setFreeSuggestions(free.slice(0, 6));
        if (!login && free[0]) {
          setLogin(free[0]);
          if (!emailLocal) setEmailLocal(free[0]);
        }
      } catch {
        if (!cancelled) setFreeSuggestions(baseSuggestions);
      } finally {
        if (!cancelled) setLoadingSuggestions(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, baseSuggestions]);

  useEffect(() => {
    if (step !== "login") return;
    const value = login.trim().toLowerCase();
    if (value.length < 3) {
      setLoginStatus("idle");
      setLoginError("");
      return;
    }
    setLoginStatus("checking");
    const t = window.setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/auth/check?login=${encodeURIComponent(value)}`,
        );
        const json = await res.json();
        if (!json.ok) {
          setLoginStatus("idle");
          return;
        }
        if (json.data.available) {
          setLoginStatus("free");
          setLoginError("");
        } else {
          setLoginStatus("taken");
          setLoginError(`Логин @${value} уже занят`);
        }
      } catch {
        setLoginStatus("idle");
      }
    }, 350);
    return () => window.clearTimeout(t);
  }, [login, step]);

  useEffect(() => {
    if (step !== "login") return;
    if (emailLocalClean.length < 3) {
      setEmailStatus("idle");
      setEmailError("");
      return;
    }
    setEmailStatus("checking");
    const t = window.setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/auth/check?email=${encodeURIComponent(fullEmail)}`,
        );
        const json = await res.json();
        if (!json.ok) {
          setEmailStatus("idle");
          return;
        }
        if (json.data.available) {
          setEmailStatus("free");
          setEmailError("");
        } else {
          setEmailStatus("taken");
          setEmailError(`Адрес ${fullEmail} уже занят`);
        }
      } catch {
        setEmailStatus("idle");
      }
    }, 350);
    return () => window.clearTimeout(t);
  }, [emailLocalClean, fullEmail, step]);

  async function goDetails() {
    if (!canContinueLogin) return;
    setCheckingLogin(true);
    setLoginError("");
    setEmailError("");
    try {
      const loginVal = login.trim().toLowerCase();
      const res = await fetch(
        `/api/auth/check?login=${encodeURIComponent(loginVal)}&email=${encodeURIComponent(fullEmail)}`,
      );
      const json = await res.json();
      if (!json.ok) {
        setLoginError("Не удалось проверить данные");
        return;
      }
      const conflicts = (json.data.conflicts || []) as string[];
      if (conflicts.includes("login")) {
        setLoginStatus("taken");
        setLoginError(`Логин @${loginVal} уже занят — выберите другой`);
        return;
      }
      if (conflicts.includes("email")) {
        setEmailStatus("taken");
        setEmailError(`Адрес ${fullEmail} уже занят`);
        return;
      }
      setStep("details");
    } catch {
      setLoginError("Сеть недоступна");
    } finally {
      setCheckingLogin(false);
    }
  }

  async function submit() {
    setLoading(true);
    setError("");
    try {
      const digits = phoneDigits(phone);
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          login: login.trim().toLowerCase(),
          password,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          displayName: (displayName || firstName).trim(),
          gender,
          birthDate: birthDate || null,
          phone: digits.length === 11 ? phone : null,
          timezone,
          email: fullEmail,
        }),
      });
      const json = await res.json();
      if (!json.ok) {
        setError(json.error?.message || "Ошибка регистрации");
        return;
      }
      const u = json.data?.user;
      if (u?.id) {
        const { rememberAccount } = await import("@/lib/remembered-accounts");
        rememberAccount({
          id: u.id,
          login: u.login,
          email: u.email,
          displayName: u.displayName,
          avatarUrl: u.avatarUrl,
        });
      }
      window.location.href = afterRegister;
    } catch {
      setError("Сеть недоступна");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0c0d10] text-white flex flex-col">
      <AuthBrandHeader brand={brand} />

      <main className="flex-1 flex flex-col items-center px-4 pb-10">
        <div className="w-full max-w-[440px] bg-[#1a1c22] rounded-[24px] md:rounded-[28px] p-5 md:p-6">
          <div className="mb-5">
            <h1 className="font-[family-name:var(--font-unbounded)] font-bold text-[20px] md:text-[22px] tracking-[-0.02em]">
              {brand.registerTitle}
            </h1>
            <p className="mt-1.5 text-[14px] text-white/45 font-[family-name:var(--font-manrope)]">
              {step === "name" && "Как вас зовут?"}
              {step === "login" && "Логин и почта"}
              {step === "details" && "Персональные данные"}
              {step === "password" && "Придумайте пароль"}
            </p>
          </div>

          <div className="flex gap-1.5 mb-5">
            {steps.map((s, i) => (
              <div
                key={s}
                className={cn(
                  "h-1 flex-1 rounded-full transition-colors",
                  stepIndex >= i ? "bg-[#0066ff]" : "bg-[#24262e]",
                )}
              />
            ))}
          </div>

          <AnimatePresence mode="wait">
            {step === "name" && (
              <motion.form
                key="name"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.18 }}
                className="flex flex-col gap-3"
                autoComplete="off"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!canContinueName) return;
                  if (!displayName) setDisplayName(firstName.trim());
                  setStep("login");
                }}
              >
                <input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Имя"
                  className={inputClass}
                  autoFocus
                />
                <input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Фамилия"
                  className={inputClass}
                />
                <button
                  type="submit"
                  className={primaryBtn}
                  disabled={!canContinueName}
                >
                  Продолжить
                  <ArrowRight size={18} />
                </button>
              </motion.form>
            )}

            {step === "login" && (
              <motion.div
                key="login"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.18 }}
                className="flex flex-col gap-3"
              >
                <div className="relative">
                  <input
                    value={login}
                    onChange={(e) => {
                      setLoginError("");
                      setLogin(
                        e.target.value
                          .toLowerCase()
                          .replace(/[^a-z0-9._-]/g, "")
                          .slice(0, 32),
                      );
                    }}
                    placeholder="логин"
                    className={cn(
                      inputClass,
                      loginStatus === "taken" &&
                        " focus:shadow-[0_0_0_3px_rgba(248,113,113,0.18)]",
                      loginStatus === "free" &&
                        " focus:shadow-[0_0_0_3px_rgba(52,211,153,0.16)]",
                    )}
                    autoFocus
                    spellCheck={false}
                  />
                  {login.trim().length >= 3 && (
                    <span
                      className={cn(
                        "absolute right-3.5 top-1/2 -translate-y-1/2 text-[12px] font-[family-name:var(--font-manrope)]",
                        loginStatus === "checking" && "text-white/35",
                        loginStatus === "free" && "text-emerald-400",
                        loginStatus === "taken" && "text-red-400",
                      )}
                    >
                      {loginStatus === "checking" && "…"}
                      {loginStatus === "free" && "свободен"}
                      {loginStatus === "taken" && "занят"}
                    </span>
                  )}
                </div>
                {loginError && (
                  <p className="text-[13px] text-red-400 font-[family-name:var(--font-manrope)]">
                    {loginError}
                  </p>
                )}
                <div className="relative">
                  <input
                    value={emailLocal}
                    onChange={(e) => {
                      setEmailError("");
                      setEmailLocal(sanitizeEmailLocal(e.target.value));
                    }}
                    placeholder="почта"
                    className={cn(
                      inputClass,
                      "pr-[128px]",
                      emailStatus === "taken" &&
                        " focus:shadow-[0_0_0_3px_rgba(248,113,113,0.18)]",
                      emailStatus === "free" &&
                        " focus:shadow-[0_0_0_3px_rgba(52,211,153,0.16)]",
                    )}
                    autoComplete="off"
                    spellCheck={false}
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[15px] md:text-[16px] text-white/40 font-[family-name:var(--font-manrope)] pointer-events-none">
                    @{MAIL_DOMAIN}
                  </span>
                </div>
                {emailLocalClean.length >= 3 && (
                  <p
                    className={cn(
                      "text-[12px] -mt-1 font-[family-name:var(--font-manrope)]",
                      emailStatus === "checking" && "text-white/35",
                      emailStatus === "free" && "text-emerald-400",
                      (emailStatus === "taken" || emailStatus === "invalid") &&
                        "text-red-400",
                    )}
                  >
                    {emailStatus === "checking" && "Проверяем адрес…"}
                    {emailStatus === "free" && `${fullEmail} — свободен`}
                    {emailStatus === "taken" && "Адрес занят"}
                    {emailStatus === "invalid" && "Некорректный адрес"}
                  </p>
                )}
                {emailError && (
                  <p className="text-[13px] text-red-400 font-[family-name:var(--font-manrope)]">
                    {emailError}
                  </p>
                )}
                <div>
                  <p className="mb-2 text-[13px] text-white/40 font-[family-name:var(--font-manrope)]">
                    Свободные предложения
                  </p>
                  {loadingSuggestions ? (
                    <p className="text-[13px] text-white/35 font-[family-name:var(--font-manrope)]">
                      Проверяем доступность…
                    </p>
                  ) : freeSuggestions.length === 0 ? (
                    <p className="text-[13px] text-white/35 font-[family-name:var(--font-manrope)]">
                      Нет свободных предложений — введите свой логин
                    </p>
                  ) : (
                    <div className="flex flex-col gap-1.5">
                      {freeSuggestions.map((s) => {
                        const selected = login === s;
                        return (
                          <button
                            key={s}
                            type="button"
                            onClick={() => {
                              setLoginError("");
                              setLogin(s);
                              if (!emailLocal) setEmailLocal(s);
                            }}
                            className={cn(
                              "w-full text-left rounded-[12px] px-4 py-3 flex items-center justify-between gap-3 transition-colors font-[family-name:var(--font-manrope)]",
                              selected
                                ? "bg-[#0066ff]/20"
                                : "bg-[#0f1115] hover:bg-[#24262e]",
                            )}
                          >
                            <span className="text-[15px] text-white font-medium truncate">
                              {s}
                            </span>
                            <span className="text-[12px] text-emerald-400/90 shrink-0 inline-flex items-center gap-1.5">
                              {selected && (
                                <Check size={14} className="text-[#4d9fff]" />
                              )}
                              свободен
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  className={primaryBtn}
                  disabled={
                    !canContinueLogin ||
                    checkingLogin ||
                    loginStatus === "checking" ||
                    emailStatus === "checking"
                  }
                  onClick={() => void goDetails()}
                >
                  {checkingLogin ? "Проверка…" : "Продолжить"}
                  <ArrowRight size={18} />
                </button>
                <button
                  type="button"
                  onClick={() => setStep("name")}
                  className="h-[48px] rounded-[12px] text-white/45 font-[family-name:var(--font-manrope)] text-[15px] hover:text-white transition-colors"
                >
                  Назад
                </button>
              </motion.div>
            )}

            {step === "details" && (
              <motion.form
                key="details"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.18 }}
                className="flex flex-col gap-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!canContinueDetails) return;
                  setStep("password");
                }}
              >
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Как к вам обращаться?"
                  className={inputClass}
                  autoFocus
                />
                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      { id: "m" as const, label: "М" },
                      { id: "f" as const, label: "Ж" },
                    ] as const
                  ).map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => setGender(g.id)}
                      className={cn(
                        "h-[54px] rounded-[12px] text-[16px] font-semibold font-[family-name:var(--font-manrope)] transition-colors",
                        gender === g.id
                          ? "bg-[#24262e] text-white"
                          : "bg-[#0f1115] text-white/50 hover:bg-[#16181e]",
                      )}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>
                <DateField value={birthDate} onChange={setBirthDate} />
                <PhoneField value={phone} onChange={setPhone} />
                <SelectField
                  value={timezone}
                  options={TIMEZONES}
                  onChange={setTimezone}
                />
                <button type="submit" className={primaryBtn}>
                  Продолжить
                  <ArrowRight size={18} />
                </button>
                <button
                  type="button"
                  onClick={() => setStep("login")}
                  className="h-[48px] rounded-[12px] text-white/45 font-[family-name:var(--font-manrope)] text-[15px] hover:text-white transition-colors"
                >
                  Назад
                </button>
              </motion.form>
            )}

            {step === "password" && (
              <motion.form
                key="password"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.18 }}
                className="flex flex-col gap-3"
                autoComplete="off"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (canSubmit) void submit();
                }}
              >
                <div className="rounded-[12px] bg-[#0f1115] px-4 py-3 mb-1">
                  <p className="text-[13px] text-white/40 font-[family-name:var(--font-manrope)]">
                    Ваш pnk ID
                  </p>
                  <p className="mt-0.5 text-[15px] font-medium font-[family-name:var(--font-manrope)] text-[#4d9fff]">
                    @{login}
                  </p>
                  <p className="mt-0.5 text-[14px] text-white/55 font-[family-name:var(--font-manrope)] truncate">
                    {fullEmail}
                  </p>
                  <p className="mt-1 text-[13px] text-white/35 font-[family-name:var(--font-manrope)]">
                    {firstName} {lastName}
                    {displayName ? ` · ${displayName}` : ""}
                  </p>
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Пароль (от 8 символов)"
                  className={inputClass}
                  autoFocus
                  autoComplete="new-password"
                />
                <PasswordStrengthBar password={password} />
                <input
                  type="password"
                  value={password2}
                  onChange={(e) => setPassword2(e.target.value)}
                  placeholder="Повторите пароль"
                  className={inputClass}
                  autoComplete="new-password"
                />
                {password2.length > 0 && password !== password2 && (
                  <p className="text-[13px] text-red-400 font-[family-name:var(--font-manrope)]">
                    Пароли не совпадают
                  </p>
                )}
                {error && (
                  <p className="text-[13px] text-red-400 font-[family-name:var(--font-manrope)]">
                    {error}
                  </p>
                )}
                <button
                  type="submit"
                  className={primaryBtn}
                  disabled={!canSubmit || loading}
                >
                  {loading ? "Создание…" : brand.registerCta}
                  <ArrowRight size={18} />
                </button>
                <button
                  type="button"
                  onClick={() => setStep("details")}
                  className="h-[48px] rounded-[12px] text-white/45 font-[family-name:var(--font-manrope)] text-[15px] hover:text-white transition-colors"
                >
                  Назад
                </button>
              </motion.form>
            )}
          </AnimatePresence>

          <div className="mt-5 px-1 flex items-center justify-between gap-4 font-[family-name:var(--font-manrope)] text-[14px] text-white/40">
            <Link
              href={authHref("/login", { serviceId, next })}
              className="hover:text-white transition-colors"
            >
              {brand.loginCta}
            </Link>
            <Link
              href="/legal/terms"
              className="hover:text-white transition-colors"
            >
              Условия
            </Link>
          </div>
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
