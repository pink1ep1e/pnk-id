"use client";

import { cn } from "@/lib/utils";
import { Reload } from "@/lib/icons";

export function OfflineScreen({
  className,
  onRetry,
}: {
  className?: string;
  onRetry?: () => void;
}) {
  return (
    <div
      className={cn(
        "fixed inset-0 z-[100] flex flex-col items-center justify-center px-6 bg-[#0c0d10] text-white",
        className,
      )}
      role="alert"
      aria-live="assertive"
    >
      <div className="w-full max-w-[360px] text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-[18px] bg-[#1a1c22]">
          <WifiOffGlyph className="h-8 w-8 text-white/55" />
        </div>
        <h1 className="text-[24px] font-semibold tracking-[-0.03em] font-[family-name:var(--font-unbounded)]">
          Нет интернета
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-white/45 font-[family-name:var(--font-manrope)]">
          Проверьте подключение и попробуйте обновить страницу.
        </p>
        <button
          type="button"
          onClick={() => {
            if (onRetry) onRetry();
            else window.location.reload();
          }}
          className="mt-8 inline-flex h-12 w-full items-center justify-center gap-2 rounded-[14px] bg-[#0066ff] text-[15px] font-semibold font-[family-name:var(--font-manrope)] hover:bg-[#0052cc] transition-colors"
        >
          <Reload size={18} />
          Обновить страницу
        </button>
      </div>
    </div>
  );
}

function WifiOffGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={className}>
      <path
        d="M2 8.82A15.91 15.91 0 0 1 12 5c2.5 0 4.84.58 6.92 1.6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M5.5 12.5A10.94 10.94 0 0 1 12 10c1.6 0 3.1.34 4.45.95"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M8.7 15.8A5.97 5.97 0 0 1 12 15c.9 0 1.74.2 2.5.55"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <circle cx="12" cy="19" r="1.35" fill="currentColor" />
      <path
        d="M4 4l16 16"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}
