"use client";

import { ChevronDown, Check } from "@/lib/icons";
import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";

export function SelectField({
  value,
  options,
  onChange,
  label = "Выберите",
  className,
  size = "lg",
}: {
  value: string;
  options: string[];
  onChange: (v: string) => void;
  label?: string;
  className?: string;
  size?: "lg" | "md";
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const triggerH = size === "lg" ? "h-[56px] md:h-[58px]" : "h-14";
  const floated = open || Boolean(value);

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "relative w-full rounded-[16px] cursor-pointer bg-transparent border border-white/5 border-2 px-4 md:px-5 flex items-center justify-between gap-3 text-left outline-none transition-colors",
          triggerH,
          size === "md" && "px-4",
          floated && "pt-[1.05rem] pb-1",
          open
            ? "border-[#0066ff]"
            : "hover:border-white/10 focus-visible:border-[#0066ff]",
        )}
      >
        <span
          className={cn(
            "pointer-events-none absolute font-[family-name:var(--font-manrope)] text-white/35 transition-all duration-200 ease-out",
            size === "lg" ? "left-4 md:left-5" : "left-4",
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
        <span
          className={cn(
            "min-w-0 truncate font-[family-name:var(--font-manrope)] text-white",
            size === "lg" ? "text-[16px] md:text-[17px]" : "text-[15px]",
            !value && "opacity-0",
          )}
        >
          {value || "\u00a0"}
        </span>
        <ChevronDown
          size={16}
          className={cn(
            "shrink-0 text-white/40 transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {open ? (
        <ul
          role="listbox"
          className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 max-h-[260px] overflow-y-auto rounded-[16px] bg-[#1a1c22] p-1.5 shadow-[0_16px_48px_rgba(0,0,0,0.55)]"
        >
          {options.map((opt) => {
            const active = opt === value;
            return (
              <li key={opt}>
                <button
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => {
                    onChange(opt);
                    setOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center justify-between gap-3 rounded-[12px] px-3.5 py-2.5 text-left text-[14px] md:text-[15px] font-[family-name:var(--font-manrope)] transition-colors",
                    active
                      ? "bg-[#0066ff]/20 text-white"
                      : "text-white/75 hover:bg-white/[0.06] hover:text-white",
                  )}
                >
                  <span className="truncate">{opt}</span>
                  {active ? (
                    <Check size={16} className="shrink-0 text-[#4d9fff]" />
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
