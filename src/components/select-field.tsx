"use client";

import { ChevronDown, Check } from "@/lib/icons";
import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";

export function SelectField({
  value,
  options,
  onChange,
  label,
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

  const triggerH = size === "lg" ? "h-[54px] md:h-[56px]" : "h-12";

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      {label ? (
        <p className="text-[13px] text-white/45 font-[family-name:var(--font-manrope)] mb-2">
          {label}
        </p>
      ) : null}

      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "w-full rounded-[12px] px-4 md:px-5 flex items-center justify-between gap-3 text-left outline-none transition-[box-shadow,background-color]",
          triggerH,
          size === "md" && "rounded-[14px] px-4 text-[15px]",
          size === "md" ? "bg-[#24262e]" : "bg-[#0f1115]",
          open
            ? size === "md"
              ? "bg-[#2a2d36] shadow-[0_0_0_3px_rgba(0,102,255,0.18)]"
              : "bg-[#12141a] shadow-[0_0_0_3px_rgba(0,102,255,0.22)]"
            : size === "md"
              ? "hover:bg-[#2a2d36] focus-visible:shadow-[0_0_0_3px_rgba(0,102,255,0.18)]"
              : "hover:bg-[#12141a] focus-visible:shadow-[0_0_0_3px_rgba(0,102,255,0.22)]",
        )}
      >
        <span
          className={cn(
            "min-w-0 truncate font-[family-name:var(--font-manrope)] text-white",
            size === "lg" ? "text-[16px] md:text-[17px]" : "text-[15px]",
          )}
        >
          {value}
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
