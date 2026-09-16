"use client";

import { formatRuPhone, phoneDigits } from "@/lib/profile";
import { cn } from "@/lib/utils";
import { useId, useState } from "react";

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

export function PhoneField({
  value,
  onChange,
  label = "Телефон",
  className,
  size = "lg",
}: {
  value: string;
  onChange: (v: string) => void;
  label?: string;
  className?: string;
  size?: "lg" | "md";
}) {
  const id = useId();
  const [focused, setFocused] = useState(false);
  const digits = phoneDigits(value || "+7");
  const hasNumber = digits.length > 1;
  const floated = focused || hasNumber;
  const display = value || "+7";

  const applyDigits = (nextDigits: string) => {
    const d = phoneDigits(nextDigits);
    if (d.length <= 1) {
      onChange("+7");
      return;
    }
    onChange(formatRuPhone(d));
  };

  return (
    <label
      htmlFor={id}
      className={cn(
        "relative flex w-full items-center gap-2.5 bg-transparent border border-white/20 text-white outline-none transition-[border-color,padding] cursor-text",
        "focus-within:border-[#0066ff]",
        size === "lg"
          ? "h-[56px] md:h-[58px] rounded-[16px] px-3 md:px-4"
          : "h-14 rounded-[16px] px-3",
        floated ? "pt-[1.05rem] pb-1" : "",
        className,
      )}
    >
      <span
        className={cn(
          "pointer-events-none absolute font-[family-name:var(--font-manrope)] text-white/35 transition-all duration-200 ease-out",
          size === "lg" ? "left-3 md:left-4" : "left-3",
          floated
            ? "top-[0.45rem] text-[11px] md:text-[12px]"
            : cn(
                "top-1/2 -translate-y-1/2",
                size === "lg" ? "text-[16px] md:text-[17px]" : "text-[15px]",
              ),
        )}
      >
        {label}
      </span>

      {floated ? (
        <>
          <RuFlag className="mt-0.5" />
          <span className="text-white/40 text-[13px] md:text-[14px] font-medium font-[family-name:var(--font-manrope)] select-none tracking-wide mt-0.5">
            RU
          </span>
          <span className="h-5 w-px bg-white/15 shrink-0 mt-0.5" />
        </>
      ) : null}

      <input
        id={id}
        inputMode="tel"
        autoComplete="tel"
        value={floated ? display : ""}
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
          applyDigits(digits.slice(0, Math.max(1, digits.length - 1)));
        }}
        onFocus={(e) => {
          setFocused(true);
          if (digits.length <= 1) onChange("+7");
          requestAnimationFrame(() => {
            const el = e.target;
            el.setSelectionRange(el.value.length, el.value.length);
          });
        }}
        onBlur={() => setFocused(false)}
        className={cn(
          "flex-1 min-w-0 bg-transparent outline-none text-white font-[family-name:var(--font-manrope)] tracking-wide",
          size === "md" ? "text-[15px]" : "text-[16px] md:text-[17px]",
          !floated && "opacity-0",
        )}
      />
    </label>
  );
}
