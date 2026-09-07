"use client";

import { formatRuPhone, phoneDigits } from "@/lib/profile";
import { cn } from "@/lib/utils";

function RuFlag({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-5 w-7 overflow-hidden rounded-[4px] shrink-0 ring-1 ring-white/10",
        className,
      )}
      aria-hidden
    >
      <span className="flex flex-col w-full h-full min-h-[20px]">
        <span className="h-[7px] bg-white" />
        <span className="h-[6px] bg-[#0039a6]" />
        <span className="h-[7px] bg-[#d52b1e]" />
      </span>
    </span>
  );
}

const shellClass =
  "w-full h-[54px] md:h-[56px] rounded-[12px] bg-[#0f1115] flex items-center gap-3 px-3 md:px-4 text-white outline-none transition-[box-shadow,background-color] focus-within:bg-[#12141a] focus-within:shadow-[0_0_0_3px_rgba(0,102,255,0.22)]";

const shellClassMd =
  "w-full h-12 rounded-[14px] bg-[#24262e] flex items-center gap-3 px-3 text-white outline-none transition-[box-shadow,background-color] focus-within:bg-[#2a2d36] focus-within:shadow-[0_0_0_3px_rgba(0,102,255,0.18)]";

export function PhoneField({
  value,
  onChange,
  label,
  className,
  size = "lg",
}: {
  value: string;
  onChange: (v: string) => void;
  label?: string;
  className?: string;
  size?: "lg" | "md";
}) {
  const applyDigits = (digits: string) => {
    const d = phoneDigits(digits);
    if (d.length <= 1) {
      onChange("+7");
      return;
    }
    onChange(formatRuPhone(d));
  };

  const display = value || "+7";

  return (
    <label className={cn("block", className)}>
      {label ? (
        <span className="text-[13px] text-white/45 font-[family-name:var(--font-manrope)]">
          {label}
        </span>
      ) : null}
      <div className={cn(size === "md" ? shellClassMd : shellClass, label && "mt-2")}>
        <RuFlag />
        <span className="text-white/40 text-[13px] md:text-[14px] font-medium font-[family-name:var(--font-manrope)] select-none tracking-wide">
          RU
        </span>
        <span className="h-5 w-px bg-white/15 shrink-0" />
        <input
          inputMode="tel"
          autoComplete="tel"
          value={display}
          placeholder="+7 (___) ___-__-__"
          onChange={(e) => {
            const next = e.target.value;
            const prevDigits = phoneDigits(value || "+7");
            const nextDigits = phoneDigits(next);
            if (
              next.length < display.length &&
              nextDigits.length >= prevDigits.length
            ) {
              applyDigits(
                prevDigits.slice(0, Math.max(1, prevDigits.length - 1)),
              );
              return;
            }
            applyDigits(nextDigits.length ? nextDigits : "7");
          }}
          onKeyDown={(e) => {
            if (e.key !== "Backspace") return;
            const input = e.currentTarget;
            const start = input.selectionStart ?? 0;
            const end = input.selectionEnd ?? 0;
            if (start !== end) return;
            if (start <= 2) {
              e.preventDefault();
              return;
            }
            const before = display.slice(0, start);
            if (/\d/.test(before.slice(-1))) return;
            e.preventDefault();
            const digits = phoneDigits(value || "+7");
            applyDigits(digits.slice(0, Math.max(1, digits.length - 1)));
          }}
          onFocus={(e) => {
            if (phoneDigits(value || "+7").length <= 1) onChange("+7");
            requestAnimationFrame(() => {
              const el = e.target;
              el.setSelectionRange(el.value.length, el.value.length);
            });
          }}
          className={cn(
            "flex-1 min-w-0 bg-transparent outline-none text-white font-[family-name:var(--font-manrope)] placeholder:text-white/30 tracking-wide",
            size === "md" ? "text-[15px]" : "text-[16px] md:text-[17px]",
          )}
        />
      </div>
    </label>
  );
}
