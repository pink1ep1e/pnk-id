"use client";

import {
  AuthBrandFooter,
  AuthBrandHeader,
  ServiceInstallBar,
} from "@/components/auth-brand";
import { TextField } from "@/components/text-field";
import { TurnstileField } from "@/components/turnstile-field";
import { ArrowRight, Check } from "@/lib/icons";
import {
  getPasswordStrength,
  PasswordStrengthBar,
} from "@/lib/password-strength";
import {
  idRegisterResend,
  idRegisterStart,
  idRegisterVerify,
} from "@/lib/id-api";
import { afterAuthPath, authHref } from "@/lib/services";
import { useServiceBrand } from "@/lib/use-service-brand";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Suspense, useCallback, useState } from "react";
import { useSearchParams } from "next/navigation";

const primaryBtn =
  "mt-1 h-[54px] md:h-[56px] w-full rounded-[12px] bg-[#0066ff] text-white font-[family-name:var(--font-manrope)] font-semibold text-[17px] inline-flex items-center justify-center gap-2 hover:bg-[#0052cc] transition-colors disabled:opacity-40 disabled:pointer-events-none";

type Step = "account" | "telegram" | "code";

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
  const params = useSearchParams();
  const { brand, serviceId, next, footerCopy } = useServiceBrand();
  const state = params.get("state");
  const afterRegister = afterAuthPath(brand, next, state);

  const [step, setStep] = useState<Step>("account");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState("");
  const [deepLink, setDeepLink] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onTurnstile = useCallback((t: string | null) => {
    setTurnstileToken(t);
  }, []);

  const strength = getPasswordStrength(password);
  const passOk =
    password.length >= 8 && password === password2 && strength.score >= 2;
  const userOk = /^[a-z0-9][a-z0-9._-]{2,28}[a-z0-9]$/i.test(username.trim());

  async function startRegistration() {
    setLoading(true);
    setError("");
    try {
      if (!turnstileToken) {
        setError("Пройдите проверку Turnstile");
        return;
      }
      const res = await idRegisterStart({
        username: username.trim().toLowerCase(),
        password,
        turnstileToken,
        service: serviceId || undefined,
      });
      if (!res.ok) {
        setError(res.error.message || "Не удалось начать регистрацию");
        return;
      }
      setPendingId(res.data.pendingId);
      setDeepLink(res.data.telegramDeepLink);
      setStep("telegram");
    } catch {
      setError("Сеть недоступна");
    } finally {
      setLoading(false);
    }
  }

  async function verifyCode() {
    setLoading(true);
    setError("");
    try {
      const res = await idRegisterVerify(pendingId, code.trim());
      if (!res.ok) {
        setError(res.error.message || "Неверный код");
        return;
      }
      const u = res.data.user;
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

  async function resend() {
    setLoading(true);
    setError("");
    try {
      if (!turnstileToken) {
        setError("Обновите проверку Turnstile и повторите");
        return;
      }
      const res = await idRegisterResend(pendingId, turnstileToken);
      if (!res.ok) {
        setError(res.error.message || "Не удалось отправить код");
        return;
      }
      setStep("code");
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
              {step === "account" && "Логин, пароль и подтверждение"}
              {step === "telegram" && "Подтвердите аккаунт в Telegram"}
              {step === "code" && "Введите код из Telegram"}
            </p>
          </div>

          {step === "account" && (
            <div className="space-y-3">
              <TextField
                label="Логин"
                value={username}
                onChange={(v) => setUsername(v.toLowerCase())}
                autoComplete="username"
              />
              <TextField
                label="Пароль"
                type="password"
                value={password}
                onChange={setPassword}
                autoComplete="new-password"
              />
              <PasswordStrengthBar password={password} />
              <TextField
                label="Повторите пароль"
                type="password"
                value={password2}
                onChange={setPassword2}
                autoComplete="new-password"
              />
              <TurnstileField onToken={onTurnstile} className="pt-1" />
              {error && (
                <p className="text-[13px] text-red-400/90">{error}</p>
              )}
              <button
                type="button"
                className={primaryBtn}
                disabled={loading || !userOk || !passOk || !turnstileToken}
                onClick={() => void startRegistration()}
              >
                {loading ? "…" : "Продолжить"}
                <ArrowRight size={18} />
              </button>
            </div>
          )}

          {step === "telegram" && (
            <div className="space-y-4">
              <p className="text-[14px] text-white/55 leading-relaxed">
                Откройте бота в Telegram по ссылке — он пришлёт код
                подтверждения. Один Telegram = один аккаунт.
              </p>
              <a
                href={deepLink}
                target="_blank"
                rel="noreferrer"
                className={cn(primaryBtn, "no-underline")}
              >
                Открыть Telegram
                <ArrowRight size={18} />
              </a>
              <button
                type="button"
                className="w-full h-[48px] rounded-[12px] border border-white/10 text-[15px] text-white/80"
                onClick={() => setStep("code")}
              >
                Я получил код
              </button>
              <TurnstileField onToken={onTurnstile} />
              <button
                type="button"
                className="w-full text-[13px] text-white/40 underline"
                disabled={loading}
                onClick={() => void resend()}
              >
                Отправить код ещё раз
              </button>
              {error && (
                <p className="text-[13px] text-red-400/90">{error}</p>
              )}
            </div>
          )}

          {step === "code" && (
            <div className="space-y-3">
              <TextField
                label="Код из Telegram"
                value={code}
                onChange={(v) => setCode(v.replace(/\D/g, "").slice(0, 6))}
                inputMode="numeric"
                autoComplete="one-time-code"
              />
              {error && (
                <p className="text-[13px] text-red-400/90">{error}</p>
              )}
              <button
                type="button"
                className={primaryBtn}
                disabled={loading || code.length !== 6}
                onClick={() => void verifyCode()}
              >
                {loading ? "…" : "Создать аккаунт"}
                <Check size={18} />
              </button>
              <button
                type="button"
                className="w-full text-[13px] text-white/40"
                onClick={() => setStep("telegram")}
              >
                Назад к Telegram
              </button>
            </div>
          )}

          <p className="mt-5 text-center text-[13px] text-white/40">
            Уже есть аккаунт?{" "}
            <Link
              href={authHref("/login", { serviceId, next })}
              className="text-[#4d9fff] hover:underline"
            >
              Войти
            </Link>
          </p>
        </div>
        <AuthBrandFooter brand={brand} footerCopy={footerCopy} />
        <ServiceInstallBar brand={brand} />
      </main>
    </div>
  );
}
