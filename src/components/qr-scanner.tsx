"use client";

import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { cn } from "@/lib/utils";

export function QrScanner({
  onScan,
  onError,
  className,
  autoStart = false,
}: {
  onScan: (text: string) => void;
  onError?: (message: string) => void;
  className?: string;
  /** Start camera immediately (for bottom sheet). */
  autoStart?: boolean;
}) {
  const idRef = useRef(`qr-reader-${Math.random().toString(36).slice(2)}`);
  const [active, setActive] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const handled = useRef(false);

  useEffect(() => {
    return () => {
      const s = scannerRef.current;
      if (s?.isScanning) {
        void s.stop().catch(() => undefined);
      }
    };
  }, []);

  async function start() {
    handled.current = false;
    setActive(true);
    try {
      const scanner = new Html5Qrcode(idRef.current);
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        (decoded) => {
          if (handled.current) return;
          handled.current = true;
          onScan(decoded);
          void scanner.stop().catch(() => undefined);
          setActive(false);
        },
        () => undefined,
      );
    } catch {
      setActive(false);
      onError?.("Не удалось открыть камеру");
    }
  }

  async function stop() {
    const s = scannerRef.current;
    if (s?.isScanning) await s.stop().catch(() => undefined);
    setActive(false);
  }

  useEffect(() => {
    if (!autoStart) return;
    const t = window.setTimeout(() => {
      void start();
    }, 280);
    return () => {
      window.clearTimeout(t);
      void stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart]);

  return (
    <div className={cn("space-y-3", className)}>
      <div
        id={idRef.current}
        className={cn(
          "overflow-hidden rounded-[16px] bg-black",
          active ? "min-h-[280px]" : "hidden",
        )}
      />
      {!autoStart && !active ? (
        <button
          type="button"
          onClick={() => void start()}
          className="w-full h-12 rounded-full bg-[#0066ff] hover:bg-[#0052cc] text-[15px] font-semibold font-[family-name:var(--font-manrope)] transition-colors"
        >
          Открыть сканер QR
        </button>
      ) : null}
      {active ? (
        <button
          type="button"
          onClick={() => void stop()}
          className="w-full h-12 rounded-full bg-[#2a2d36] hover:bg-[#32363f] text-[15px] font-semibold font-[family-name:var(--font-manrope)] transition-colors"
        >
          Закрыть камеру
        </button>
      ) : autoStart ? (
        <button
          type="button"
          onClick={() => void start()}
          className="w-full h-12 rounded-full bg-[#0066ff] hover:bg-[#0052cc] text-[15px] font-semibold font-[family-name:var(--font-manrope)] transition-colors"
        >
          Включить камеру
        </button>
      ) : null}
    </div>
  );
}

export function extractQrCode(raw: string): string | null {
  try {
    if (raw.includes("code=")) {
      const url = new URL(raw);
      return url.searchParams.get("code");
    }
  } catch {
    /* plain code */
  }
  if (/^[A-Za-z0-9_-]{16,}$/.test(raw.trim())) return raw.trim();
  return null;
}
