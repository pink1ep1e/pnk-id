"use client";

import { Logo } from "@/components/logo";
import { QrCode } from "@/lib/icons";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import QRCode from "qrcode";

type QrData = {
  code: string;
  payload: string;
  expiresAt: string;
};

export default function QrLoginPage() {
  const router = useRouter();
  const [qr, setQr] = useState<QrData | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/auth/qr", { method: "POST" });
      const json = await res.json();
      if (!cancelled && json.ok) {
        setQr(json.data);
        const url = await QRCode.toDataURL(json.data.payload, {
          width: 240,
          margin: 1,
          color: { dark: "#0c0d10", light: "#ffffff" },
        });
        if (!cancelled) setQrDataUrl(url);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!qr) return;
    const t = setInterval(async () => {
      const res = await fetch(
        `/api/auth/qr?code=${encodeURIComponent(qr.code)}`,
      );
      const json = await res.json();
      if (!json.ok) return;
      if (json.data.status === "confirmed") {
        clearInterval(t);
        const claim = await fetch("/api/auth/qr", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: qr.code }),
        });
        const claimJson = await claim.json();
        if (claimJson.ok) {
          router.push("/cabinet");
          router.refresh();
        } else {
          setError(claimJson.error?.message || "Не удалось войти");
        }
      }
      if (json.data.status === "expired") {
        clearInterval(t);
        setError("QR истёк — обновите страницу");
      }
    }, 1500);
    return () => clearInterval(t);
  }, [qr, router]);

  return (
    <div className="min-h-dvh bg-[#0c0d10] text-white flex flex-col items-center px-4 py-10">
      <div className="mb-8">
        <Logo variant="id" href="/" className="w-[120px]" />
      </div>
      <div className="w-full max-w-[420px] text-center">
        <p className="text-[24px] font-semibold mb-2 font-[family-name:var(--font-unbounded)]">
          Вход по QR
        </p>
        <p className="text-sm text-white/45 mb-6 font-[family-name:var(--font-manrope)]">
          Отсканируйте код на телефоне, где уже выполнен вход в pnk ID.
        </p>

        <div className="rounded-[24px] bg-[#1a1c22] p-6 flex flex-col items-center">
          <div
            className={
              qrDataUrl
                ? "h-48 w-48 rounded-[16px] bg-white p-3 flex items-center justify-center overflow-hidden"
                : "h-48 w-48 rounded-[16px] bg-[#16181e] flex items-center justify-center"
            }
          >
            {qrDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qrDataUrl} alt="QR" className="h-full w-full" />
            ) : (
              <QrCode size={56} className="text-white/45 animate-pulse" />
            )}
          </div>
          {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
        </div>

        <Link
          href="/login"
          className="inline-block mt-6 text-sm text-white/50 hover:text-white font-[family-name:var(--font-manrope)]"
        >
          ← Войти паролем
        </Link>
      </div>
    </div>
  );
}
