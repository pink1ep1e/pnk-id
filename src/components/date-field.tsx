"use client";

import { ArrowRight, ChevronDown, X } from "@/lib/icons";
import { cn } from "@/lib/utils";
import { useEffect, useMemo, useRef, useState } from "react";

const WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"] as const;
const MONTHS = [
  "Январь",
  "Февраль",
  "Март",
  "Апрель",
  "Май",
  "Июнь",
  "Июль",
  "Август",
  "Сентябрь",
  "Октябрь",
  "Ноябрь",
  "Декабрь",
] as const;

type View = "days" | "months" | "years";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function toISO(y: number, m: number, d: number) {
  return `${y}-${pad(m + 1)}-${pad(d)}`;
}

function parseISO(value: string): { y: number; m: number; d: number } | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [ys, ms, ds] = value.split("-");
  const y = Number(ys);
  const m = Number(ms) - 1;
  const d = Number(ds);
  const dt = new Date(y, m, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== m || dt.getDate() !== d) {
    return null;
  }
  return { y, m, d };
}

function formatDisplay(value: string) {
  const p = parseISO(value);
  if (!p) return "";
  return `${pad(p.d)}.${pad(p.m + 1)}.${p.y}`;
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function CalendarGlyph({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className={cn("shrink-0", className)}
    >
      <rect
        x="3.5"
        y="5"
        width="17"
        height="15"
        rx="3"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="M3.5 9.5h17"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M8 3.5v3M16 3.5v3"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <circle cx="8.5" cy="13.5" r="1" fill="currentColor" />
      <circle cx="12" cy="13.5" r="1" fill="currentColor" />
      <circle cx="15.5" cy="13.5" r="1" fill="currentColor" />
    </svg>
  );
}

function buildDayCells(year: number, month: number) {
  const first = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  // Monday-first: Sun=0 → 6
  const offset = (first.getDay() + 6) % 7;
  const cells: { y: number; m: number; d: number; inMonth: boolean }[] = [];

  const prevDays = new Date(year, month, 0).getDate();
  for (let i = offset - 1; i >= 0; i--) {
    const d = prevDays - i;
    const dt = new Date(year, month - 1, d);
    cells.push({
      y: dt.getFullYear(),
      m: dt.getMonth(),
      d,
      inMonth: false,
    });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ y: year, m: month, d, inMonth: true });
  }
  let next = 1;
  while (cells.length < 42) {
    const dt = new Date(year, month + 1, next++);
    cells.push({
      y: dt.getFullYear(),
      m: dt.getMonth(),
      d: dt.getDate(),
      inMonth: false,
    });
  }
  return cells;
}

export function DateField({
  value,
  onChange,
  label,
  placeholder = "ДД.ММ.ГГГГ",
  className,
  max,
  min,
  size = "lg",
}: {
  value: string;
  onChange: (v: string) => void;
  label?: string;
  placeholder?: string;
  className?: string;
  /** ISO yyyy-mm-dd */
  max?: string;
  /** ISO yyyy-mm-dd */
  min?: string;
  size?: "lg" | "md";
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>("days");

  const selected = parseISO(value);
  const today = useMemo(() => startOfDay(new Date()), []);
  const maxDate = useMemo(
    () => (max ? parseISO(max) : { y: today.getFullYear(), m: today.getMonth(), d: today.getDate() }),
    [max, today],
  );
  const minDate = useMemo(
    () => min ? parseISO(min) : { y: 1900, m: 0, d: 1 },
    [min],
  );

  const [cursor, setCursor] = useState(() => {
    if (selected) return { y: selected.y, m: selected.m };
    return { y: today.getFullYear() - 18, m: today.getMonth() };
  });

  useEffect(() => {
    if (!open) return;
    if (selected) setCursor({ y: selected.y, m: selected.m });
    setView("days");
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const days = useMemo(
    () => buildDayCells(cursor.y, cursor.m),
    [cursor.y, cursor.m],
  );

  const yearBlockStart = Math.floor(cursor.y / 12) * 12;

  function isBefore(
    a: { y: number; m: number; d: number },
    b: { y: number; m: number; d: number } | null,
  ) {
    if (!b) return false;
    if (a.y !== b.y) return a.y < b.y;
    if (a.m !== b.m) return a.m < b.m;
    return a.d < b.d;
  }

  function isAfter(
    a: { y: number; m: number; d: number },
    b: { y: number; m: number; d: number } | null,
  ) {
    if (!b) return false;
    if (a.y !== b.y) return a.y > b.y;
    if (a.m !== b.m) return a.m > b.m;
    return a.d > b.d;
  }

  function disabledDay(cell: { y: number; m: number; d: number }) {
    return isBefore(cell, minDate) || isAfter(cell, maxDate);
  }

  function pickDay(cell: { y: number; m: number; d: number }) {
    if (disabledDay(cell)) return;
    onChange(toISO(cell.y, cell.m, cell.d));
    setOpen(false);
  }

  function shiftMonth(delta: number) {
    const dt = new Date(cursor.y, cursor.m + delta, 1);
    setCursor({ y: dt.getFullYear(), m: dt.getMonth() });
  }

  const triggerH = size === "lg" ? "h-[54px] md:h-[56px]" : "h-12";
  const display = formatDisplay(value);

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      {label ? (
        <p className="text-[13px] text-white/45 font-[family-name:var(--font-manrope)] mb-2">
          {label}
        </p>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "w-full rounded-[12px] px-4 md:px-5 flex items-center gap-3 text-left outline-none transition-[box-shadow,background-color]",
          triggerH,
          size === "md" ? "rounded-[14px] bg-[#24262e]" : "bg-[#0f1115]",
          open
            ? size === "md"
              ? "bg-[#2a2d36] shadow-[0_0_0_3px_rgba(0,102,255,0.18)]"
              : "bg-[#12141a] shadow-[0_0_0_3px_rgba(0,102,255,0.22)]"
            : size === "md"
              ? "hover:bg-[#2a2d36] focus-visible:shadow-[0_0_0_3px_rgba(0,102,255,0.18)]"
              : "hover:bg-[#12141a] focus-visible:shadow-[0_0_0_3px_rgba(0,102,255,0.22)]",
        )}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span
          className={cn(
            "flex-1 min-w-0 text-[16px] md:text-[17px] font-[family-name:var(--font-manrope)] truncate",
            display ? "text-white" : "text-white/35",
            size === "md" && "text-[15px] md:text-[15px]",
          )}
        >
          {display || placeholder}
        </span>
        {display ? (
          <span
            role="button"
            tabIndex={-1}
            onClick={(e) => {
              e.stopPropagation();
              onChange("");
            }}
            className="text-white/30 hover:text-white/70 transition-colors p-0.5"
            aria-label="Очистить"
          >
            <X size={16} />
          </span>
        ) : null}
        <CalendarGlyph className="h-[18px] w-[18px] text-white/35" />
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label="Выбор даты"
          className="absolute left-0 right-0 z-50 mt-2 rounded-[16px] bg-[#1a1c22] p-3.5 shadow-[0_16px_48px_rgba(0,0,0,0.55)]"
        >
          <div className="flex items-center gap-2 mb-3">
            <button
              type="button"
              onClick={() =>
                setView((v) =>
                  v === "days" ? "months" : v === "months" ? "years" : "years",
                )
              }
              className="flex-1 min-w-0 h-10 rounded-[10px] px-2.5 flex items-center gap-1.5 text-left hover:bg-white/[0.04] transition-colors"
            >
              <span className="text-[15px] font-semibold text-white font-[family-name:var(--font-manrope)] truncate">
                {view === "years"
                  ? `${yearBlockStart}–${yearBlockStart + 11}`
                  : view === "months"
                    ? String(cursor.y)
                    : `${MONTHS[cursor.m]} ${cursor.y}`}
              </span>
              <ChevronDown
                size={16}
                className={cn(
                  "text-white/40 transition-transform",
                  view !== "days" && "rotate-180",
                )}
              />
            </button>
            {view === "days" ? (
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => shiftMonth(-1)}
                  className="h-9 w-9 rounded-[10px] inline-flex items-center justify-center text-white/55 hover:bg-white/[0.06] hover:text-white transition-colors"
                  aria-label="Предыдущий месяц"
                >
                  <ArrowRight size={16} className="rotate-180" />
                </button>
                <button
                  type="button"
                  onClick={() => shiftMonth(1)}
                  className="h-9 w-9 rounded-[10px] inline-flex items-center justify-center text-white/55 hover:bg-white/[0.06] hover:text-white transition-colors"
                  aria-label="Следующий месяц"
                >
                  <ArrowRight size={16} />
                </button>
              </div>
            ) : null}
          </div>

          {view === "days" ? (
            <>
              <div className="grid grid-cols-7 mb-1">
                {WEEKDAYS.map((w) => (
                  <div
                    key={w}
                    className="h-8 text-center text-[12px] font-medium text-white/35 font-[family-name:var(--font-manrope)]"
                  >
                    {w}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-y-0.5">
                {days.map((cell) => {
                  const iso = toISO(cell.y, cell.m, cell.d);
                  const isSelected =
                    selected &&
                    selected.y === cell.y &&
                    selected.m === cell.m &&
                    selected.d === cell.d;
                  const isToday =
                    today.getFullYear() === cell.y &&
                    today.getMonth() === cell.m &&
                    today.getDate() === cell.d;
                  const disabled = disabledDay(cell);
                  return (
                    <button
                      key={iso + String(cell.inMonth)}
                      type="button"
                      disabled={disabled}
                      onClick={() => pickDay(cell)}
                      className={cn(
                        "mx-auto h-9 w-9 rounded-full text-[14px] font-[family-name:var(--font-manrope)] transition-colors",
                        !cell.inMonth && "text-white/20",
                        cell.inMonth && !isSelected && "text-white/85",
                        isToday && !isSelected && "ring-1 ring-[#0066ff]/55",
                        isSelected && "bg-[#0066ff] text-white font-semibold",
                        !isSelected &&
                          !disabled &&
                          "hover:bg-white/[0.08]",
                        disabled && "opacity-25 pointer-events-none",
                      )}
                    >
                      {cell.d}
                    </button>
                  );
                })}
              </div>
            </>
          ) : null}

          {view === "months" ? (
            <div className="grid grid-cols-3 gap-1.5">
              {MONTHS.map((name, i) => {
                const active = cursor.m === i;
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => {
                      setCursor((c) => ({ ...c, m: i }));
                      setView("days");
                    }}
                    className={cn(
                      "h-11 rounded-[10px] text-[13px] font-[family-name:var(--font-manrope)] transition-colors",
                      active
                        ? "bg-[#0066ff] text-white font-semibold"
                        : "text-white/75 hover:bg-white/[0.06]",
                    )}
                  >
                    {name.slice(0, 3)}
                  </button>
                );
              })}
            </div>
          ) : null}

          {view === "years" ? (
            <div className="grid grid-cols-3 gap-1.5">
              {Array.from({ length: 12 }, (_, i) => yearBlockStart + i).map(
                (y) => {
                  const active = cursor.y === y;
                  const outOfRange =
                    (minDate && y < minDate.y) || (maxDate && y > maxDate.y);
                  return (
                    <button
                      key={y}
                      type="button"
                      disabled={!!outOfRange}
                      onClick={() => {
                        setCursor((c) => ({ ...c, y }));
                        setView("months");
                      }}
                      className={cn(
                        "h-11 rounded-[10px] text-[14px] font-[family-name:var(--font-manrope)] transition-colors",
                        active
                          ? "bg-[#0066ff] text-white font-semibold"
                          : "text-white/75 hover:bg-white/[0.06]",
                        outOfRange && "opacity-25 pointer-events-none",
                      )}
                    >
                      {y}
                    </button>
                  );
                },
              )}
            </div>
          ) : null}

          {view === "years" ? (
            <div className="mt-2 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setCursor((c) => ({ ...c, y: c.y - 12 }))}
                className="h-9 px-3 rounded-[10px] text-[13px] text-white/50 hover:bg-white/[0.06] hover:text-white font-[family-name:var(--font-manrope)] transition-colors"
              >
                ← ранее
              </button>
              <button
                type="button"
                onClick={() => setCursor((c) => ({ ...c, y: c.y + 12 }))}
                className="h-9 px-3 rounded-[10px] text-[13px] text-white/50 hover:bg-white/[0.06] hover:text-white font-[family-name:var(--font-manrope)] transition-colors"
              >
                позже →
              </button>
            </div>
          ) : null}

          {view === "days" ? (
            <div className="mt-3 pt-2.5 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  onChange("");
                  setOpen(false);
                }}
                className="h-9 px-2 text-[13px] font-medium text-[#4d9fff] hover:text-white font-[family-name:var(--font-manrope)] transition-colors"
              >
                Очистить
              </button>
              <button
                type="button"
                onClick={() => {
                  const iso = toISO(
                    today.getFullYear(),
                    today.getMonth(),
                    today.getDate(),
                  );
                  if (max && iso > max) return;
                  if (min && iso < min) return;
                  onChange(iso);
                  setOpen(false);
                }}
                className="h-9 px-2 text-[13px] font-medium text-[#4d9fff] hover:text-white font-[family-name:var(--font-manrope)] transition-colors"
              >
                Сегодня
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
