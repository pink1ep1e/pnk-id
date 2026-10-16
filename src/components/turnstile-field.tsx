"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (
        el: HTMLElement,
        opts: {
          sitekey: string;
          callback: (token: string) => void;
          "expired-callback"?: () => void;
          theme?: "dark" | "light" | "auto";
        },
      ) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}

type Props = {
  onToken: (token: string | null) => void;
  className?: string;
};

export function TurnstileField({ onToken, className }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";

  useEffect(() => {
    if (!siteKey || !ref.current) return;

    let cancelled = false;

    const mount = () => {
      if (cancelled || !ref.current || !window.turnstile) return;
      if (widgetId.current) {
        try {
          window.turnstile.remove(widgetId.current);
        } catch {
          /* ignore */
        }
      }
      widgetId.current = window.turnstile.render(ref.current, {
        sitekey: siteKey,
        theme: "dark",
        callback: (token) => onToken(token),
        "expired-callback": () => onToken(null),
      });
    };

    if (window.turnstile) {
      mount();
    } else {
      const existing = document.querySelector(
        'script[data-pnk-turnstile="1"]',
      ) as HTMLScriptElement | null;
      if (existing) {
        existing.addEventListener("load", mount);
      } else {
        const s = document.createElement("script");
        s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
        s.async = true;
        s.dataset.pnkTurnstile = "1";
        s.addEventListener("load", mount);
        document.head.appendChild(s);
      }
    }

    return () => {
      cancelled = true;
      if (widgetId.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetId.current);
        } catch {
          /* ignore */
        }
      }
    };
  }, [siteKey, onToken]);

  if (!siteKey) {
    return (
      <p className="text-[13px] text-amber-400/90">
        NEXT_PUBLIC_TURNSTILE_SITE_KEY не задан
      </p>
    );
  }

  return <div ref={ref} className={className} />;
}
