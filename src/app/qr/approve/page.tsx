"use client";

import { Logo } from "@/components/logo";
import { QrScanner, extractQrCode } from "@/components/qr-scanner";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

function ApproveInner() {
  const params = useSearchParams();
  const codeParam = params.get("code") || "";
  const router = useRouter();
  const [code, setCode] = useState(codeParam);
  const [msg, setMsg] = useState(
    codeParam ? "Проверяем…" : "Отсканируйте QR с экрана входа",
  );
  const [done, setDone] = useState(false);
  const [needLogin, setNeedLogin] = useState(false);

  useEffect(() => {
    if (!code) return;
    (async () => {
      const me = await fetch("/api/auth/me");
      const meJson = await me.json();
      if (!meJson.ok) {
        setNeedLogin(true);
        setMsg("Сначала войдите в pnk ID на этом устройстве");
        return;
      }
      setNeedLogin(false);
      await fetch("/api/auth/qr", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, action: "scan" }),
      });
      setMsg("Подтвердите вход на другом устройстве");
    })();
  }, [code]);

  async function confirm() {
    const res = await fetch("/api/auth/qr", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, action: "confirm" }),
    });
    const json = await res.json();
    if (!json.ok) {
      setMsg(json.error?.message || "Ошибка");
      return;
    }
    setDone(true);
    setMsg("Вход подтверждён. Можно вернуться к компьютеру.");
  }

  return (
    <div className="min-h-dvh bg-[#0c0d10] text-white flex items-center justify-center px-4">
      <div className="w-full max-w-[400px] rounded-[24px] bg-[#1a1c22] p-6 text-center">
        <div className="mb-5 flex justify-center">
          <Logo variant="id" href="/cabinet" className="w-[110px]" />
        </div>
        <p className="text-xl font-semibold mb-2 font-[family-name:var(--font-unbounded)]">
          Подтверждение QR
        </p>
        <p className="text-sm text-white/50 mb-6 font-[family-name:var(--font-manrope)]">
          {msg}
        </p>

        {!code && (
          <div className="mb-4 text-left">
            <QrScanner
              onScan={(raw) => {
                const extracted = extractQrCode(raw);
                if (extracted) setCode(extracted);
                else setMsg("Не удалось распознать QR");
              }}
              onError={setMsg}
            />
          </div>
        )}

        {!done && code && !needLogin && (
          <button
            type="button"
            onClick={() => void confirm()}
            className="w-full h-12 rounded-[12px] bg-[#0066ff] font-semibold font-[family-name:var(--font-manrope)]"
          >
            Подтвердить вход
          </button>
        )}
        {needLogin && (
          <button
            type="button"
            onClick={() =>
              router.push(
                `/login?next=${encodeURIComponent(`/qr/approve?code=${code}`)}`,
              )
            }
            className="w-full h-12 rounded-[12px] bg-[#0066ff] font-semibold font-[family-name:var(--font-manrope)]"
          >
            Войти
          </button>
        )}
        <button
          type="button"
          onClick={() => router.push("/cabinet")}
          className="mt-3 w-full h-11 rounded-[12px] bg-white/5 text-sm font-[family-name:var(--font-manrope)]"
        >
          В кабинет
        </button>
      </div>
    </div>
  );
}

export default function QrApprovePage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-[#0c0d10]" />}>
      <ApproveInner />
    </Suspense>
  );
}
