"use client";

import { Logo } from "@/components/logo";
import { DateField } from "@/components/date-field";
import { PhoneField } from "@/components/phone-field";
import { SelectField } from "@/components/select-field";
import { QrScanner, extractQrCode } from "@/components/qr-scanner";
import { cn } from "@/lib/utils";
import { TIMEZONES, formatRuPhone, phoneDigits } from "@/lib/profile";
import {
  getPasswordStrength,
  PasswordStrengthBar,
} from "@/lib/password-strength";
import {
  ArrowRight,
  Call,
  Camera,
  Check,
  Clock,
  Globe,
  HardDrive,
  KeyRound,
  Lock,
  LogOut,
  Mail,
  Menu,
  Paperclip,
  Pencil,
  Phone,
  QrCode,
  Send,
  Settings,
  Shield,
  Support,
  Trash2,
  User,
  X,
} from "@/lib/icons";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import QRCode from "qrcode";

type NavId = "data" | "security" | "support";

type PanelId =
  | "mailbox"
  | "phone"
  | "sender"
  | "notifications"
  | "delete"
  | "login-method"
  | "password"
  | "recovery"
  | "sessions"
  | "apps"
  | "qr";

type Profile = {
  id: string;
  login: string;
  email: string | null;
  phone: string | null;
  displayName: string | null;
  firstName: string | null;
  lastName: string | null;
  gender: "m" | "f" | null;
  birthDate: string | null;
  timezone: string | null;
  avatarUrl: string | null;
  createdAt?: string;
};

type SessionRow = {
  id: string;
  deviceName: string | null;
  deviceType: string | null;
  browser: string | null;
  os: string | null;
  location: string | null;
  lastSeenAt: string;
  current: boolean;
};

type AppRow = {
  id: string;
  scopes: string[];
  createdAt: string;
  client: {
    clientId: string;
    name: string;
    description: string | null;
    logoUrl: string | null;
    trusted: boolean;
  };
};

const PANEL_TITLES: Record<PanelId, string> = {
  mailbox: "pnk ID",
  phone: "Телефон",
  sender: "Имя и подпись",
  notifications: "Уведомления",
  delete: "Удалить аккаунт",
  "login-method": "Способ входа",
  password: "Обновить пароль",
  recovery: "Способы восстановления",
  sessions: "Активные сессии",
  apps: "Приложения с доступом",
  qr: "Вход по QR-коду",
};

type RecoveryRow = {
  id: string;
  email: string;
  verified: boolean;
  createdAt: string;
};

const navItems: { id: NavId; label: string; icon: typeof User }[] = [
  { id: "data", label: "Данные", icon: User },
  { id: "security", label: "Безопасность", icon: Shield },
  { id: "support", label: "Поддержка", icon: Support },
];

const fieldClass =
  "w-full h-12 rounded-[14px] bg-[#24262e] px-4 text-[15px] text-white outline-none transition-[box-shadow,background-color] focus:bg-[#2a2d36] focus:shadow-[0_0_0_3px_rgba(0,102,255,0.18)] font-[family-name:var(--font-manrope)] placeholder:text-white/30";

function avatarLetter(p: Profile | null): string {
  const src = (p?.displayName || p?.firstName || p?.login || "?").trim();
  return (src[0] || "?").toUpperCase();
}

function fullName(p: Profile | null): string {
  if (!p) return "";
  const parts = [p.firstName, p.lastName].filter(Boolean).join(" ");
  return parts || p.displayName || p.login;
}

function displayPhone(phone: string | null | undefined): string {
  if (!phone) return "Не указан";
  const d = phoneDigits(phone);
  return d.length >= 11 ? formatRuPhone(d) : phone;
}

function formatSeen(iso: string): string {
  try {
    const d = new Date(iso);
    const now = new Date();
    const sameDay =
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate();
    const time = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    if (sameDay) return time;
    return `${d.getDate()}.${String(d.getMonth() + 1).padStart(2, "0")} · ${time}`;
  } catch {
    return "";
  }
}

function Row({
  icon: Icon,
  title,
  subtitle,
  trailing,
  onClick,
}: {
  icon: typeof Mail;
  title: string;
  subtitle?: string;
  trailing?: ReactNode;
  onClick?: () => void;
}) {
  return (
    <div
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      className={cn(
        "w-full flex items-center gap-3.5 min-h-[64px] px-4 py-3 text-left transition-colors",
        onClick && "cursor-pointer hover:bg-white/[0.03]",
      )}
    >
      <span className="h-10 w-10 rounded-[12px] bg-[#24262e] flex items-center justify-center shrink-0 text-white/65">
        <Icon size={18} />
      </span>
      <span className="min-w-0 flex-1 py-0.5">
        <span className="block text-[15px] font-medium font-[family-name:var(--font-manrope)] leading-snug text-white">
          {title}
        </span>
        {subtitle && (
          <span className="block text-[13px] text-white/40 font-[family-name:var(--font-manrope)] mt-0.5 leading-snug">
            {subtitle}
          </span>
        )}
      </span>
      <span className="shrink-0 flex items-center justify-center min-w-6 text-white/30">
        {trailing ?? (onClick ? <ArrowRight size={16} /> : null)}
      </span>
    </div>
  );
}

function Card({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-[18px] bg-[#1a1c22] overflow-hidden">
      {children}
    </div>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <section className="pt-9">
      <h2 className="text-[18px] md:text-[20px] font-semibold font-[family-name:var(--font-unbounded)] tracking-[-0.02em]">
        {title}
      </h2>
      {subtitle && (
        <p className="mt-1.5 text-[14px] text-white/40 font-[family-name:var(--font-manrope)] max-w-[540px] leading-relaxed">
          {subtitle}
        </p>
      )}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={(e) => {
        e.stopPropagation();
        onChange(!checked);
      }}
      className={cn(
        "relative h-7 w-12 rounded-full transition-colors shrink-0",
        checked ? "bg-[#0066ff]" : "bg-[#3a3e48]",
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform",
          checked ? "left-[22px]" : "left-0.5",
        )}
      />
    </button>
  );
}

function SwitchRow({
  title,
  subtitle,
  checked,
  onChange,
}: {
  title: string;
  subtitle?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5">
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-medium font-[family-name:var(--font-manrope)]">
          {title}
        </p>
        {subtitle && (
          <p className="mt-0.5 text-[13px] text-white/40 font-[family-name:var(--font-manrope)]">
            {subtitle}
          </p>
        )}
      </div>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  );
}

function DetailShell({
  title,
  onBack,
  children,
}: {
  title: string;
  onBack: () => void;
  children: ReactNode;
}) {
  return (
    <div className="pb-16">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-2 text-[14px] text-white/45 hover:text-white font-[family-name:var(--font-manrope)] transition-colors mb-5"
      >
        <ArrowRight size={16} className="rotate-180" />
        Назад
      </button>
      <h1 className="text-[24px] md:text-[28px] font-semibold font-[family-name:var(--font-unbounded)] tracking-[-0.03em] mb-6">
        {title}
      </h1>
      {children}
    </div>
  );
}

function PrimaryBtn({
  children,
  onClick,
  variant = "blue",
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "blue" | "ghost" | "dark";
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "w-full h-12 rounded-full text-[15px] font-semibold font-[family-name:var(--font-manrope)] transition-colors disabled:opacity-40 disabled:pointer-events-none",
        variant === "blue" && "bg-[#0066ff] hover:bg-[#0052cc] text-white",
        variant === "dark" && "bg-[#1c1e24] hover:bg-[#22252c] text-white",
        variant === "ghost" &&
          "bg-transparent hover:bg-white/[0.04] text-white",
      )}
    >
      {children}
    </button>
  );
}

function InfoBanner({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-[16px] bg-[#0066ff]/10 px-4 py-3 text-[13px] text-[#9ec5ff] font-[family-name:var(--font-manrope)] leading-relaxed">
      {children}
    </div>
  );
}

function AvatarCropper({
  src,
  onCancel,
  onDone,
}: {
  src: string;
  onCancel: () => void;
  onDone: (dataUrl: string) => void;
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [natural, setNatural] = useState({ w: 0, h: 0 });
  const [stage, setStage] = useState({ w: 360, h: 360 });
  const [crop, setCrop] = useState({ x: 40, y: 40, size: 200 });
  const drag = useRef<
    | null
    | { type: "move"; startX: number; startY: number; ox: number; oy: number }
    | {
        type: "resize";
        corner: "nw" | "ne" | "sw" | "se";
        startX: number;
        startY: number;
        ox: number;
        oy: number;
        osize: number;
      }
  >(null);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      setStage({ w: r.width, h: r.height });
    });
    ro.observe(el);
    const r = el.getBoundingClientRect();
    setStage({ w: r.width, h: r.height });
    return () => ro.disconnect();
  }, []);

  // Contain image inside stage (no overflow beyond padded frame)
  const fit = useMemo(() => {
    if (!natural.w || !stage.w)
      return { w: 0, h: 0, left: 0, top: 0, scale: 1 };
    const pad = 12;
    const availW = Math.max(1, stage.w - pad * 2);
    const availH = Math.max(1, stage.h - pad * 2);
    const scale = Math.min(availW / natural.w, availH / natural.h);
    const w = natural.w * scale;
    const h = natural.h * scale;
    return {
      w,
      h,
      left: (stage.w - w) / 2,
      top: (stage.h - h) / 2,
      scale,
    };
  }, [natural, stage]);

  useEffect(() => {
    if (!fit.w || !fit.h) return;
    const size = Math.min(fit.w, fit.h) * 0.78;
    setCrop({
      x: fit.left + (fit.w - size) / 2,
      y: fit.top + (fit.h - size) / 2,
      size,
    });
  }, [fit.w, fit.h, fit.left, fit.top]);

  const cropRef = useRef(crop);
  cropRef.current = crop;
  const fitRef = useRef(fit);
  fitRef.current = fit;

  const clampCrop = (next: { x: number; y: number; size: number }) => {
    const f = fitRef.current;
    const min = 72;
    const max = Math.min(f.w, f.h);
    const size = Math.max(min, Math.min(max, next.size));
    const x = Math.max(f.left, Math.min(f.left + f.w - size, next.x));
    const y = Math.max(f.top, Math.min(f.top + f.h - size, next.y));
    return { x, y, size };
  };

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const d = drag.current;
      if (!d) return;
      const dx = e.clientX - d.startX;
      const dy = e.clientY - d.startY;
      if (d.type === "move") {
        setCrop(
          clampCrop({
            x: d.ox + dx,
            y: d.oy + dy,
            size: cropRef.current.size,
          }),
        );
        return;
      }
      const signX = d.corner.includes("e") ? 1 : -1;
      const signY = d.corner.includes("s") ? 1 : -1;
      const delta = Math.abs(dx) > Math.abs(dy) ? dx * signX : dy * signY;
      let size = d.osize + delta;
      let x = d.ox;
      let y = d.oy;
      if (d.corner.includes("w")) x = d.ox + (d.osize - size);
      if (d.corner.includes("n")) y = d.oy + (d.osize - size);
      setCrop(clampCrop({ x, y, size }));
    };
    const onUp = () => {
      drag.current = null;
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, []);

  const exportCrop = () => {
    const img = imgRef.current;
    if (!img || !fit.scale) return;
    const c = cropRef.current;
    const sx = (c.x - fit.left) / fit.scale;
    const sy = (c.y - fit.top) / fit.scale;
    const sSize = c.size / fit.scale;
    const out = 512;
    const canvas = document.createElement("canvas");
    canvas.width = out;
    canvas.height = out;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(img, sx, sy, sSize, sSize, 0, 0, out, out);
    onDone(canvas.toDataURL("image/png"));
  };

  const corners = [
    { id: "nw" as const, style: { left: -6, top: -6 } },
    { id: "ne" as const, style: { right: -6, top: -6 } },
    { id: "sw" as const, style: { left: -6, bottom: -6 } },
    { id: "se" as const, style: { right: -6, bottom: -6 } },
  ];

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-4 sm:p-6 bg-black/70 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        role="dialog"
        aria-modal
        aria-label="Обрезка аватара"
        className="w-full max-w-[420px] rounded-[24px] bg-[#12141a] shadow-[0_24px_80px_rgba(0,0,0,0.55)] overflow-hidden flex flex-col"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3.5 flex items-center justify-between shrink-0">
          <p className="text-[15px] font-medium font-[family-name:var(--font-manrope)] text-white/85">
            Выберите область
          </p>
          <button
            type="button"
            onClick={onCancel}
            className="h-9 w-9 rounded-full flex items-center justify-center text-white/45 hover:bg-white/10 hover:text-white"
            aria-label="Закрыть"
          >
            <X size={18} />
          </button>
        </div>

        <div
          ref={stageRef}
          className="relative mx-4 mt-4 mb-2 h-[min(52vh,340px)] rounded-[16px] overflow-hidden bg-black touch-none select-none"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={imgRef}
            src={src}
            alt=""
            draggable={false}
            onLoad={(e) => {
              const el = e.currentTarget;
              setNatural({ w: el.naturalWidth, h: el.naturalHeight });
            }}
            className="absolute max-w-none pointer-events-none"
            style={{
              width: fit.w,
              height: fit.h,
              left: fit.left,
              top: fit.top,
            }}
          />

          {/* Square dim overlay via 4 panels */}
          <div
            className="absolute left-0 right-0 top-0 bg-black/55 pointer-events-none"
            style={{ height: Math.max(0, crop.y) }}
          />
          <div
            className="absolute left-0 right-0 bottom-0 bg-black/55 pointer-events-none"
            style={{ height: Math.max(0, stage.h - crop.y - crop.size) }}
          />
          <div
            className="absolute left-0 bg-black/55 pointer-events-none"
            style={{
              top: crop.y,
              height: crop.size,
              width: Math.max(0, crop.x),
            }}
          />
          <div
            className="absolute right-0 bg-black/55 pointer-events-none"
            style={{
              top: crop.y,
              height: crop.size,
              width: Math.max(0, stage.w - crop.x - crop.size),
            }}
          />

          <div
            className="absolute cursor-move rounded-[4px]"
            style={{
              left: crop.x,
              top: crop.y,
              width: crop.size,
              height: crop.size,
              boxShadow: "0 0 0 2px #fff, 0 0 0 3px rgba(0,0,0,0.35)",
            }}
            onPointerDown={(e) => {
              e.preventDefault();
              (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
              drag.current = {
                type: "move",
                startX: e.clientX,
                startY: e.clientY,
                ox: crop.x,
                oy: crop.y,
              };
            }}
          >
            {corners.map((c) => (
              <span
                key={c.id}
                className="absolute h-3.5 w-3.5 rounded-full bg-white shadow cursor-nwse-resize"
                style={c.style}
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  drag.current = {
                    type: "resize",
                    corner: c.id,
                    startX: e.clientX,
                    startY: e.clientY,
                    ox: crop.x,
                    oy: crop.y,
                    osize: crop.size,
                  };
                }}
              />
            ))}
          </div>
        </div>

        <div className="shrink-0 px-4 py-4 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="h-11 px-5 rounded-full bg-[#2a2d36] hover:bg-[#32363f] text-white text-[14px] font-semibold font-[family-name:var(--font-manrope)] inline-flex items-center gap-2 transition-colors"
          >
            <X size={15} />
            Отмена
          </button>
          <button
            type="button"
            onClick={exportCrop}
            className="h-11 px-5 rounded-full bg-white hover:bg-white/90 text-[#0c0d10] text-[14px] font-semibold font-[family-name:var(--font-manrope)] inline-flex items-center gap-2 transition-colors"
          >
            <Check size={15} />
            Готово
          </button>
        </div>
      </div>
    </div>
  );
}

function EditProfileModal({
  open,
  onClose,
  profile,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  profile: Profile;
  onSaved: (p: Profile) => void;
}) {
  const [displayName, setDisplayName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [gender, setGender] = useState<"m" | "f" | null>(null);
  const [birthDate, setBirthDate] = useState("");
  const [timezone, setTimezone] = useState(TIMEZONES[1]);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setDisplayName(profile.displayName || "");
    setFirstName(profile.firstName || "");
    setLastName(profile.lastName || "");
    setGender(profile.gender);
    setBirthDate(profile.birthDate || "");
    setTimezone(profile.timezone || TIMEZONES[1]);
    setAvatarUrl(profile.avatarUrl);
    setError("");
  }, [open, profile]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (cropSrc) {
        URL.revokeObjectURL(cropSrc);
        setCropSrc(null);
      } else onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose, cropSrc]);

  if (!open) return null;

  const pickFile = (file?: File | null) => {
    if (!file || !file.type.startsWith("image/")) return;
    setCropSrc(URL.createObjectURL(file));
  };

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: displayName.trim() || null,
          firstName: firstName.trim() || null,
          lastName: lastName.trim() || null,
          gender,
          birthDate: birthDate || null,
          timezone,
          avatarUrl,
        }),
      });
      const json = await res.json();
      if (!json.ok) {
        setError(json.error?.message || "Не удалось сохранить");
        return;
      }
      onSaved({ ...profile, ...json.data });
      onClose();
    } catch {
      setError("Ошибка сети");
    } finally {
      setSaving(false);
    }
  };

  const letter = avatarLetter({
    ...profile,
    displayName,
    firstName,
    avatarUrl,
  });

  return (
    <>
      <div
        className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center sm:p-4 bg-black/65 backdrop-blur-sm"
        onMouseDown={(e) => {
          if (e.target === e.currentTarget && !cropSrc) onClose();
        }}
      >
        <div
          role="dialog"
          aria-modal
          aria-labelledby="id-edit-title"
          className="w-full sm:max-w-[520px] max-h-[92vh] overflow-y-auto rounded-t-[28px] sm:rounded-[28px] bg-[#1a1c22] shadow-[0_24px_80px_rgba(0,0,0,0.55)] p-5 md:p-7"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="flex items-start justify-between gap-3 mb-6">
            <h2
              id="id-edit-title"
              className="text-[22px] font-semibold font-[family-name:var(--font-unbounded)] tracking-[-0.02em]"
            >
              Ваши данные
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="h-9 w-9 rounded-full flex items-center justify-center text-white/40 hover:bg-white/[0.06] hover:text-white transition-colors"
              aria-label="Закрыть"
            >
              <X size={18} />
            </button>
          </div>

          <div className="flex flex-col items-center mb-6">
            <div className="relative">
              <div
                className={cn(
                  "h-24 w-24 rounded-[22px] overflow-hidden flex items-center justify-center text-white text-[36px] font-semibold font-[family-name:var(--font-manrope)]",
                  !avatarUrl && "bg-[#0066ff]",
                )}
              >
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={avatarUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  letter
                )}
              </div>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="absolute -bottom-1 -right-1 h-9 w-9 rounded-full bg-[#0c0d10] flex items-center justify-center text-white/80 hover:bg-[#16181e] transition-colors"
                aria-label="Сменить аватар"
              >
                <Camera size={15} />
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  pickFile(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
            </div>
            <div className="mt-3 flex gap-3">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="text-[13px] text-[#4d9fff] font-[family-name:var(--font-manrope)] hover:underline"
              >
                Загрузить фото
              </button>
              {avatarUrl && (
                <button
                  type="button"
                  onClick={() => setAvatarUrl(null)}
                  className="text-[13px] text-white/40 font-[family-name:var(--font-manrope)] hover:text-white/70"
                >
                  Убрать
                </button>
              )}
            </div>
          </div>

          <div className="rounded-[18px] bg-[#0f1115] p-4 mb-3">
            <label className="block">
              <span className="text-[13px] text-white/45 font-[family-name:var(--font-manrope)]">
                Как к вам обращаться?
              </span>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className={cn(fieldClass, "mt-2")}
              />
            </label>
          </div>

          <div className="rounded-[18px] bg-[#0f1115] p-4 mb-3 space-y-4">
            <p className="text-[15px] font-semibold font-[family-name:var(--font-manrope)]">
              Персональные данные
            </p>
            <div>
              <p className="text-[13px] text-white/45 font-[family-name:var(--font-manrope)] mb-2">
                Имя и фамилия
              </p>
              <div className="grid grid-cols-1 gap-2">
                <input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Имя"
                  className={fieldClass}
                />
                <input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Фамилия"
                  className={fieldClass}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[13px] text-white/45 font-[family-name:var(--font-manrope)] mb-2">
                  Пол
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      { id: "m" as const, label: "М" },
                      { id: "f" as const, label: "Ж" },
                    ] as const
                  ).map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => setGender(g.id)}
                      className={cn(
                        "h-12 rounded-[14px] text-[15px] font-semibold font-[family-name:var(--font-manrope)] transition-colors",
                        gender === g.id
                          ? "bg-[#0066ff] text-white"
                          : "bg-[#24262e] text-white/50 hover:bg-[#2a2d36]",
                      )}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>
              </div>
              <DateField
                label="Дата рождения"
                value={birthDate}
                onChange={setBirthDate}
                size="md"
              />
            </div>
          </div>

          <div className="rounded-[18px] bg-[#0f1115] p-4 mb-6">
            <SelectField
              label="Часовой пояс"
              value={timezone}
              options={TIMEZONES}
              onChange={setTimezone}
              size="md"
            />
          </div>

          {error && (
            <p className="mb-3 text-[13px] text-red-400 font-[family-name:var(--font-manrope)]">
              {error}
            </p>
          )}

          <button
            type="button"
            disabled={saving}
            onClick={() => void save()}
            className="w-full h-12 rounded-full bg-[#0066ff] hover:bg-[#0052cc] transition-colors text-[15px] font-semibold font-[family-name:var(--font-manrope)] disabled:opacity-50"
          >
            {saving ? "Сохранение…" : "Сохранить"}
          </button>
        </div>
      </div>

      {cropSrc && (
        <AvatarCropper
          src={cropSrc}
          onCancel={() => {
            URL.revokeObjectURL(cropSrc);
            setCropSrc(null);
          }}
          onDone={(dataUrl) => {
            URL.revokeObjectURL(cropSrc);
            setCropSrc(null);
            setAvatarUrl(dataUrl);
          }}
        />
      )}
    </>
  );
}

function SupportChat({
  userAvatar,
  letter,
}: {
  userAvatar: string | null;
  letter: string;
}) {
  type Msg = {
    id: string;
    from: "user" | "support";
    text: string;
    time: string;
  };

  const [messages, setMessages] = useState<Msg[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  const mapMsg = (m: {
    id: string;
    fromRole: string;
    text: string;
    createdAt: string;
  }): Msg => {
    const d = new Date(m.createdAt);
    return {
      id: m.id,
      from: m.fromRole === "user" ? "user" : "support",
      text: m.text,
      time: `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`,
    };
  };

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/support/messages");
      const json = await res.json();
      if (json.ok && Array.isArray(json.data)) {
        setMessages(json.data.map(mapMsg));
      }
    })();
  }, []);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages]);

  const send = async () => {
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    setDraft("");
    try {
      const res = await fetch("/api/support/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const json = await res.json();
      if (json.ok) {
        const again = await fetch("/api/support/messages");
        const againJson = await again.json();
        if (againJson.ok) setMessages(againJson.data.map(mapMsg));
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="rounded-[22px] bg-[#12141a] overflow-hidden flex flex-col h-[min(72vh,640px)] shadow-[0_16px_48px_rgba(0,0,0,0.35)]">
      <div className="px-4 md:px-5 py-3.5 bg-[#1a1c22] flex items-center gap-3 shrink-0">
        <span className="relative h-11 w-11 rounded-full bg-[#0066ff] flex items-center justify-center shrink-0 text-white">
          <Support size={18} />
          <span
            aria-hidden
            className="absolute right-0 bottom-0 h-3 w-3 translate-x-1/4 translate-y-1/4 rounded-full bg-[#3dd68c] ring-[2.5px] ring-[#1a1c22]"
          />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold font-[family-name:var(--font-manrope)]">
            Поддержка pnk
          </p>
          <p className="text-[12px] text-white/40 font-[family-name:var(--font-manrope)]">
            Онлайн · отвечаем за несколько минут
          </p>
        </div>
      </div>

      <div
        ref={listRef}
        className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-3 md:px-5 py-4 space-y-4 bg-[#0f1115]"
      >
        <div className="flex justify-center">
          <span className="rounded-full bg-white/[0.06] px-3 py-1 text-[11px] text-white/40 font-[family-name:var(--font-manrope)]">
            Сегодня
          </span>
        </div>

        {messages.map((m) => {
          const mine = m.from === "user";
          return (
            <div
              key={m.id}
              className={cn(
                "flex items-end gap-2.5",
                mine ? "justify-end" : "justify-start",
              )}
            >
              {!mine && (
                <span className="h-8 w-8 rounded-full bg-[#0066ff] flex items-center justify-center shrink-0 text-white mb-0.5">
                  <Support size={14} />
                </span>
              )}
              <div
                className={cn(
                  "max-w-[min(100%,420px)] rounded-[18px] px-3.5 py-2.5",
                  mine
                    ? "bg-[#0066ff] text-white rounded-br-[6px]"
                    : "bg-[#1a1c22] text-white/90 rounded-bl-[6px]",
                )}
              >
                {!mine && (
                  <p className="text-[11px] text-[#9ec5ff] font-[family-name:var(--font-manrope)] mb-1">
                    Поддержка pnk
                  </p>
                )}
                {m.text ? (
                  <p className="text-[14px] font-[family-name:var(--font-manrope)] leading-relaxed whitespace-pre-wrap">
                    {m.text}
                  </p>
                ) : null}
                <p
                  className={cn(
                    "mt-1.5 text-[11px] font-[family-name:var(--font-manrope)]",
                    mine ? "text-white/55 text-right" : "text-white/35",
                  )}
                >
                  {m.time}
                </p>
              </div>
              {mine && (
                <span
                  className={cn(
                    "h-8 w-8 rounded-full overflow-hidden flex items-center justify-center shrink-0 text-white text-[12px] font-semibold font-[family-name:var(--font-manrope)] mb-0.5",
                    !userAvatar && "bg-[#0066ff]",
                  )}
                >
                  {userAvatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={userAvatar}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    letter
                  )}
                </span>
              )}
            </div>
          );
        })}
      </div>

      <div className="shrink-0 bg-[#1a1c22] p-3 md:p-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="h-12 w-12 rounded-[14px] bg-[#0f1115] text-white/40 flex items-center justify-center shrink-0 cursor-default"
            aria-label="Прикрепить файл"
            disabled
          >
            <Paperclip size={18} />
          </button>
          <div className="flex-1 min-w-0 h-12 flex items-center gap-2 rounded-[14px] bg-[#0f1115] pl-3.5 pr-1.5">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void send();
                }
              }}
              placeholder="Напишите сообщение…"
              className="flex-1 min-w-0 h-full bg-transparent outline-none text-[14px] leading-none text-white font-[family-name:var(--font-manrope)] placeholder:text-white/30"
            />
            <button
              type="button"
              onClick={() => void send()}
              disabled={!draft.trim() || sending}
              className="h-9 w-9 rounded-full bg-[#0066ff] hover:bg-[#0052cc] disabled:opacity-35 disabled:pointer-events-none flex items-center justify-center text-white shrink-0 transition-colors"
              aria-label="Отправить"
            >
              <Send size={15} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PanelView({
  panel,
  onBack,
  profile,
  sessions,
  apps,
  qrLogin,
  setQrLogin,
  onProfile,
  onSessions,
  onApps,
  onDeleted,
}: {
  panel: PanelId;
  onBack: () => void;
  profile: Profile;
  sessions: SessionRow[];
  apps: AppRow[];
  qrLogin: boolean;
  setQrLogin: (v: boolean) => void;
  onProfile: (p: Profile) => void;
  onSessions: (s: SessionRow[]) => void;
  onApps: (a: AppRow[]) => void;
  onDeleted: () => void;
}) {
  const [phone, setPhone] = useState(() =>
    profile.phone ? formatRuPhone(phoneDigits(profile.phone)) : "+7",
  );
  const [senderName, setSenderName] = useState(
    profile.displayName || fullName(profile) || profile.login,
  );
  const [notifyLogin, setNotifyLogin] = useState(true);
  const [notifyImportant, setNotifyImportant] = useState(true);
  const [notifyPromo, setNotifyPromo] = useState(false);
  const [currentPass, setCurrentPass] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [deletePass, setDeletePass] = useState("");
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [recoveryList, setRecoveryList] = useState<RecoveryRow[]>([]);
  const [showRecoveryEmail, setShowRecoveryEmail] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [qrPayload, setQrPayload] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [scanError, setScanError] = useState("");

  useEffect(() => {
    if (panel !== "recovery") return;
    void (async () => {
      const res = await fetch("/api/security/recovery-emails");
      const json = await res.json();
      if (json.ok) setRecoveryList(json.data);
    })();
  }, [panel]);

  useEffect(() => {
    if (panel !== "qr" || !qrLogin) return;
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/auth/qr", { method: "POST" });
      const json = await res.json();
      if (!json.ok || cancelled) return;
      setQrPayload(json.data.payload);
      const url = await QRCode.toDataURL(json.data.payload, {
        width: 220,
        margin: 1,
        color: { dark: "#0c0d10", light: "#ffffff" },
      });
      if (!cancelled) setQrDataUrl(url);
    })();
    return () => {
      cancelled = true;
    };
  }, [panel, qrLogin]);

  const phoneOk = phoneDigits(phone).length === 11;
  const strength = getPasswordStrength(password);
  const passOk =
    currentPass.length >= 1 &&
    password.length >= 8 &&
    strength.score >= 2 &&
    password === password2;

  const savePhone = async () => {
    if (!phoneOk) return;
    setBusy(true);
    setError("");
    try {
      const digits = phoneDigits(phone);
      const normalized = `+${digits}`;
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: normalized }),
      });
      const json = await res.json();
      if (!json.ok) {
        setError(json.error?.message || "Не удалось сохранить");
        return;
      }
      onProfile({ ...profile, ...json.data });
      setSaved(true);
      window.setTimeout(() => setSaved(false), 1600);
    } catch {
      setError("Ошибка сети");
    } finally {
      setBusy(false);
    }
  };

  const savePassword = async () => {
    if (!passOk) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/security/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: currentPass,
          newPassword: password,
        }),
      });
      const json = await res.json();
      if (!json.ok) {
        setError(json.error?.message || "Не удалось обновить пароль");
        return;
      }
      setCurrentPass("");
      setPassword("");
      setPassword2("");
      setSaved(true);
      window.setTimeout(() => setSaved(false), 1600);
      const s = await fetch("/api/security/sessions");
      const sJson = await s.json();
      if (sJson.ok) onSessions(sJson.data);
    } catch {
      setError("Ошибка сети");
    } finally {
      setBusy(false);
    }
  };

  const revokeSession = async (id: string) => {
    await fetch(`/api/security/sessions?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    onSessions(sessions.filter((x) => x.id !== id));
  };

  const revokeOthers = async () => {
    await fetch(`/api/security/sessions?others=1`, { method: "DELETE" });
    onSessions(sessions.filter((s) => s.current));
  };

  const revokeApp = async (id: string) => {
    await fetch(`/api/apps?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    onApps(apps.filter((a) => a.id !== id));
  };

  const flashSaved = () => {
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1600);
  };

  const saveSender = async () => {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: senderName.trim() || null }),
      });
      const json = await res.json();
      if (!json.ok) {
        setError(json.error?.message || "Не удалось сохранить");
        return;
      }
      onProfile({ ...profile, ...json.data });
      flashSaved();
    } catch {
      setError("Ошибка сети");
    } finally {
      setBusy(false);
    }
  };

  const addRecovery = async () => {
    if (!recoveryEmail.includes("@")) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/security/recovery-emails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: recoveryEmail.trim() }),
      });
      const json = await res.json();
      if (!json.ok) {
        setError(json.error?.message || "Не удалось сохранить");
        return;
      }
      setRecoveryList((list) =>
        list.some((x) => x.id === json.data.id) ? list : [...list, json.data],
      );
      setRecoveryEmail("");
      setShowRecoveryEmail(false);
      flashSaved();
    } catch {
      setError("Ошибка сети");
    } finally {
      setBusy(false);
    }
  };

  const removeRecovery = async (id: string) => {
    await fetch(`/api/security/recovery-emails?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    setRecoveryList((list) => list.filter((x) => x.id !== id));
  };

  const deleteAccount = async () => {
    if (!deletePass) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: deletePass }),
      });
      const json = await res.json();
      if (!json.ok) {
        setError(json.error?.message || "Не удалось удалить");
        return;
      }
      onDeleted();
    } catch {
      setError("Ошибка сети");
    } finally {
      setBusy(false);
    }
  };

  const onScanQr = (raw: string) => {
    const code = extractQrCode(raw);
    if (!code) {
      setScanError("Не удалось распознать QR");
      return;
    }
    window.location.assign(`/qr/approve?code=${encodeURIComponent(code)}`);
  };

  const createdLabel = profile.createdAt
    ? new Date(profile.createdAt).getFullYear()
    : "—";

  return (
    <DetailShell title={PANEL_TITLES[panel]} onBack={onBack}>
      {panel === "mailbox" && (
        <div className="space-y-4">
          <div className="rounded-[22px] bg-gradient-to-br from-[#1a3a8f]/40 via-[#1a1c22] to-[#1a1c22] p-5">
            <div className="flex items-start gap-4">
              <span className="h-12 w-12 rounded-[14px] bg-[#0066ff]/20 text-[#4d9fff] flex items-center justify-center shrink-0">
                <User size={22} />
              </span>
              <div className="min-w-0">
                <p className="text-[13px] text-white/40 font-[family-name:var(--font-manrope)]">
                  Ваш pnk ID
                </p>
                <p className="mt-1 text-[20px] font-semibold font-[family-name:var(--font-manrope)] break-all">
                  @{profile.login}
                </p>
                <p className="mt-2 text-[13px] text-white/40 font-[family-name:var(--font-manrope)]">
                  Создан в {createdLabel}
                  {profile.email ? ` · ${profile.email}` : ""}
                </p>
              </div>
            </div>
          </div>
          <Card>
            <Row
              icon={Check}
              title="Основной идентификатор"
              subtitle="Используется для входа во все сервисы pnk"
              trailing={<Check size={16} className="text-[#4d9fff]" />}
            />
            <Row
              icon={Mail}
              title="Скопировать логин"
              subtitle={`@${profile.login}`}
              onClick={() => {
                void navigator.clipboard?.writeText(profile.login);
                flashSaved();
              }}
            />
          </Card>
          {saved && <InfoBanner>Логин скопирован в буфер обмена</InfoBanner>}
        </div>
      )}

      {panel === "phone" && (
        <div className="space-y-4">
          <div className="rounded-[18px] bg-[#1a1c22] p-4">
            <PhoneField
              label="Номер телефона"
              value={phone}
              onChange={setPhone}
              size="md"
            />
          </div>
          {error && (
            <p className="text-[13px] text-red-400 font-[family-name:var(--font-manrope)]">
              {error}
            </p>
          )}
          <PrimaryBtn
            disabled={!phoneOk || busy}
            onClick={() => void savePhone()}
          >
            {saved ? "Номер сохранён" : "Сохранить номер"}
          </PrimaryBtn>
        </div>
      )}

      {panel === "password" && (
        <div className="space-y-4">
          <div className="rounded-[18px] bg-[#1a1c22] p-4 space-y-3">
            <label className="block">
              <span className="text-[13px] text-white/45 font-[family-name:var(--font-manrope)]">
                Текущий пароль
              </span>
              <input
                type={showPass ? "text" : "password"}
                value={currentPass}
                onChange={(e) => setCurrentPass(e.target.value)}
                placeholder="Введите текущий пароль"
                className={cn(fieldClass, "mt-2")}
              />
            </label>
            <label className="block">
              <span className="text-[13px] text-white/45 font-[family-name:var(--font-manrope)]">
                Новый пароль
              </span>
              <input
                type={showPass ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Не меньше 8 символов"
                className={cn(fieldClass, "mt-2")}
              />
              <PasswordStrengthBar password={password} />
            </label>
            <label className="block">
              <span className="text-[13px] text-white/45 font-[family-name:var(--font-manrope)]">
                Повторите пароль
              </span>
              <input
                type={showPass ? "text" : "password"}
                value={password2}
                onChange={(e) => setPassword2(e.target.value)}
                placeholder="Ещё раз"
                className={cn(fieldClass, "mt-2")}
              />
            </label>
            {password2 && password !== password2 && (
              <p className="text-[12px] text-red-400 font-[family-name:var(--font-manrope)]">
                Пароли не совпадают
              </p>
            )}
            <button
              type="button"
              onClick={() => setShowPass((v) => !v)}
              className="text-[13px] text-[#4d9fff] font-[family-name:var(--font-manrope)]"
            >
              {showPass ? "Скрыть пароли" : "Показать пароли"}
            </button>
          </div>
          {error && (
            <p className="text-[13px] text-red-400 font-[family-name:var(--font-manrope)]">
              {error}
            </p>
          )}
          <PrimaryBtn
            disabled={!passOk || busy}
            onClick={() => void savePassword()}
          >
            {saved ? "Пароль обновлён" : "Обновить пароль"}
          </PrimaryBtn>
        </div>
      )}

      {panel === "recovery" && (
        <div className="space-y-4">
          <InfoBanner>
            Телефон и резервная почта используются для восстановления доступа.
          </InfoBanner>
          <Card>
            <Row
              icon={Call}
              title="Телефон"
              subtitle={
                profile.phone
                  ? `${displayPhone(profile.phone)} · подключён`
                  : "Не указан"
              }
              onClick={onBack}
            />
            {recoveryList.map((r) => (
              <Row
                key={r.id}
                icon={Mail}
                title={r.email}
                subtitle={r.verified ? "Подтверждена" : "Не подтверждена"}
                trailing={
                  <button
                    type="button"
                    onClick={() => void removeRecovery(r.id)}
                    className="text-[13px] text-white/40 hover:text-white"
                  >
                    Удалить
                  </button>
                }
              />
            ))}
            <Row
              icon={Mail}
              title="Добавить резервную почту"
              subtitle="Для восстановления доступа"
              onClick={() => setShowRecoveryEmail(true)}
            />
          </Card>
          {showRecoveryEmail && (
            <div className="rounded-[18px] bg-[#1a1c22] p-4 space-y-3">
              <input
                value={recoveryEmail}
                onChange={(e) => setRecoveryEmail(e.target.value)}
                placeholder="email@example.com"
                className={fieldClass}
              />
              <PrimaryBtn
                disabled={!recoveryEmail.includes("@") || busy}
                onClick={() => void addRecovery()}
              >
                Сохранить
              </PrimaryBtn>
            </div>
          )}
          {error && (
            <p className="text-[13px] text-red-400 font-[family-name:var(--font-manrope)]">
              {error}
            </p>
          )}
          {saved && <InfoBanner>Сохранено</InfoBanner>}
        </div>
      )}

      {panel === "sessions" && (
        <div className="space-y-4">
          <p className="text-[14px] text-white/45 font-[family-name:var(--font-manrope)] leading-relaxed">
            Здесь видны устройства, где открыт pnk ID. Завершите чужие сессии,
            если не узнаёте устройство.
          </p>
          <div className="space-y-3">
            {sessions.map((s) => {
              const isPhone =
                (s.deviceType || "").toLowerCase().includes("phone") ||
                (s.deviceType || "").toLowerCase().includes("mobile");
              const DeviceIcon = isPhone ? Phone : HardDrive;
              const title =
                s.deviceName ||
                (s.current ? "Это устройство" : s.os || "Устройство");
              return (
                <div
                  key={s.id}
                  className={cn(
                    "rounded-[20px] p-4 md:p-5 transition-colors",
                    s.current ? "bg-[#0066ff]/10" : "bg-[#1a1c22]",
                  )}
                >
                  <div className="flex items-start gap-3.5">
                    <span
                      className={cn(
                        "h-12 w-12 rounded-[14px] flex items-center justify-center shrink-0",
                        s.current
                          ? "bg-[#0066ff]/20 text-[#4d9fff]"
                          : "bg-[#24262e] text-white/55",
                      )}
                    >
                      <DeviceIcon size={22} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[16px] font-semibold font-[family-name:var(--font-manrope)]">
                            {title}
                          </p>
                          <p className="mt-0.5 text-[13px] text-white/45 font-[family-name:var(--font-manrope)]">
                            {[s.os, s.browser].filter(Boolean).join(" ·") ||
                              "—"}
                          </p>
                        </div>
                        {s.current ? (
                          <span className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-[#0066ff]/20 text-[#9ec5ff] px-2.5 py-1 text-[12px] font-medium font-[family-name:var(--font-manrope)]">
                            <span className="h-1.5 w-1.5 rounded-full bg-[#4d9fff]" />
                            Сейчас
                          </span>
                        ) : (
                          <span className="shrink-0 text-[12px] text-white/35 font-[family-name:var(--font-manrope)] inline-flex items-center gap-1">
                            <Clock size={12} />
                            {formatSeen(s.lastSeenAt)}
                          </span>
                        )}
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-white/40 font-[family-name:var(--font-manrope)]">
                        <span className="inline-flex items-center gap-1.5">
                          <Globe size={12} />
                          {s.location || "—"}
                        </span>
                        <span className="text-white/20">·</span>
                        <span>
                          {s.current
                            ? "Активна"
                            : `Последний вход · ${formatSeen(s.lastSeenAt)}`}
                        </span>
                      </div>
                      {!s.current && (
                        <button
                          type="button"
                          onClick={() => void revokeSession(s.id)}
                          className="mt-4 h-10 px-4 rounded-full bg-white/[0.06] hover:bg-white/[0.1] text-[13px] font-medium font-[family-name:var(--font-manrope)] inline-flex items-center gap-2 transition-colors"
                        >
                          <LogOut size={14} />
                          Завершить сессию
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {sessions.length > 1 && (
            <button
              type="button"
              onClick={() => void revokeOthers()}
              className="w-full h-12 rounded-full bg-transparent hover:bg-white/[0.04] text-[14px] font-semibold font-[family-name:var(--font-manrope)] inline-flex items-center justify-center gap-2 text-white/75 hover:text-white transition-colors"
            >
              <LogOut size={16} />
              Выйти на всех других устройствах
            </button>
          )}
        </div>
      )}

      {panel === "apps" && (
        <div className="space-y-4">
          {apps.length === 0 ? (
            <div className="rounded-[18px] bg-[#1a1c22]/60 px-4 py-8 text-center">
              <Settings size={28} className="mx-auto text-white/30" />
              <p className="mt-3 text-[15px] font-medium font-[family-name:var(--font-manrope)]">
                Подключённых приложений нет
              </p>
              <p className="mt-1.5 text-[13px] text-white/40 font-[family-name:var(--font-manrope)] max-w-[360px] mx-auto leading-relaxed">
                Когда вы дадите доступ сервису через OAuth, он появится здесь —
                доступ можно будет отозвать.
              </p>
              <Link
                href="/oauth/consent"
                className="mt-4 inline-block text-[14px] text-[#4d9fff] font-[family-name:var(--font-manrope)] hover:underline"
              >
                Подключить сервис
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {apps.map((a) => (
                <div
                  key={a.id}
                  className="rounded-[20px] bg-[#1a1c22] p-4 md:p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[16px] font-semibold font-[family-name:var(--font-manrope)]">
                        {a.client.name}
                      </p>
                      <p className="mt-0.5 text-[13px] text-white/45 font-[family-name:var(--font-manrope)]">
                        {a.client.description || a.client.clientId}
                      </p>
                      {a.scopes.length > 0 && (
                        <p className="mt-2 text-[12px] text-white/30 font-[family-name:var(--font-manrope)]">
                          {a.scopes.join(",")}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => void revokeApp(a.id)}
                      className="shrink-0 h-10 px-4 rounded-full bg-white/[0.06] hover:bg-white/[0.1] text-[13px] font-medium font-[family-name:var(--font-manrope)]"
                    >
                      Отозвать
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {panel === "sender" && (
        <div className="space-y-4">
          <div className="rounded-[18px] bg-[#1a1c22] p-4">
            <label className="block">
              <span className="text-[13px] text-white/45 font-[family-name:var(--font-manrope)]">
                Отображаемое имя
              </span>
              <input
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                className={cn(fieldClass, "mt-2")}
              />
            </label>
          </div>
          {error && (
            <p className="text-[13px] text-red-400 font-[family-name:var(--font-manrope)]">
              {error}
            </p>
          )}
          <PrimaryBtn
            disabled={!senderName.trim() || busy}
            onClick={() => void saveSender()}
          >
            {saved ? "Сохранено" : "Сохранить"}
          </PrimaryBtn>
        </div>
      )}

      {panel === "notifications" && (
        <div className="space-y-4">
          <Card>
            <SwitchRow
              title="Уведомления о входе"
              subtitle="Письмо при новом устройстве"
              checked={notifyLogin}
              onChange={setNotifyLogin}
            />
            <SwitchRow
              title="Важные события"
              subtitle="Смена пароля и безопасность"
              checked={notifyImportant}
              onChange={setNotifyImportant}
            />
            <SwitchRow
              title="Новости и советы"
              subtitle="Необязательные рассылки"
              checked={notifyPromo}
              onChange={setNotifyPromo}
            />
          </Card>
          <PrimaryBtn onClick={flashSaved}>
            {saved ? "Настройки сохранены" : "Сохранить"}
          </PrimaryBtn>
        </div>
      )}

      {panel === "delete" && (
        <div className="space-y-4">
          <InfoBanner>
            Удаление аккаунта необратимо: сессии и доступы приложений будут
            отозваны.
          </InfoBanner>
          <div className="rounded-[18px] bg-[#1a1c22] p-4">
            <label className="block">
              <span className="text-[13px] text-white/45 font-[family-name:var(--font-manrope)]">
                Пароль для подтверждения
              </span>
              <input
                type="password"
                value={deletePass}
                onChange={(e) => setDeletePass(e.target.value)}
                className={cn(fieldClass, "mt-2")}
              />
            </label>
          </div>
          {error && (
            <p className="text-[13px] text-red-400 font-[family-name:var(--font-manrope)]">
              {error}
            </p>
          )}
          <PrimaryBtn
            disabled={!deletePass || busy}
            onClick={() => void deleteAccount()}
            variant="dark"
          >
            Удалить аккаунт
          </PrimaryBtn>
        </div>
      )}

      {panel === "login-method" && (
        <div className="space-y-4">
          <Card>
            <Row
              icon={Lock}
              title="Пароль"
              subtitle="Классический вход"
              trailing={<Check size={16} className="text-[#4d9fff]" />}
            />
            <Row icon={KeyRound} title="SMS-код" subtitle="Скоро" />
            <Row
              icon={KeyRound}
              title="Приложение-генератор"
              subtitle="Скоро"
            />
          </Card>
        </div>
      )}

      {panel === "qr" && (
        <div className="space-y-4">
          <div className="rounded-[22px] bg-[#1a1c22] p-5">
            <p className="text-[14px] text-white/50 font-[family-name:var(--font-manrope)] leading-relaxed text-center max-w-[400px] mx-auto">
              Покажите этот QR на другом устройстве или отсканируйте чужой код
              камерой, чтобы подтвердить вход.
            </p>
            <div className="mt-5 mx-auto h-44 w-44 rounded-[20px] bg-white p-3 flex items-center justify-center overflow-hidden">
              {qrLogin && qrDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={qrDataUrl}
                  alt="QR для входа"
                  className="h-full w-full"
                />
              ) : (
                <QrCode size={64} className="text-[#0c0d10]" />
              )}
            </div>
            {qrPayload && (
              <p className="mt-3 text-center text-[11px] text-white/30 font-[family-name:var(--font-manrope)] break-all px-2">
                Код обновляется при открытии панели
              </p>
            )}
          </div>
          <Card>
            <SwitchRow
              title="Разрешить вход по QR"
              subtitle="Можно отключить в любой момент"
              checked={qrLogin}
              onChange={setQrLogin}
            />
          </Card>
          {qrLogin && (
            <div className="rounded-[18px] bg-[#1a1c22] p-4">
              <p className="mb-3 text-[14px] text-white/50 font-[family-name:var(--font-manrope)]">
                Сканер камеры
              </p>
              <QrScanner onScan={onScanQr} onError={setScanError} />
              {scanError && (
                <p className="mt-2 text-[13px] text-red-400">{scanError}</p>
              )}
            </div>
          )}
        </div>
      )}
    </DetailShell>
  );
}

export default function PnkIdPage({
  onUnauthorized,
}: {
  onUnauthorized?: () => void;
} = {}) {
  const router = useRouter();
  const goLogin = useCallback(() => {
    if (onUnauthorized) onUnauthorized();
    else router.replace("/login");
  }, [onUnauthorized, router]);

  const [nav, setNav] = useState<NavId>("data");
  const [editOpen, setEditOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [panel, setPanel] = useState<PanelId | null>(null);
  const [qrLogin, setQrLogin] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [apps, setApps] = useState<AppRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const me = await fetch("/api/auth/me");
        const meJson = await me.json();
        if (!meJson.ok) {
          goLogin();
          return;
        }
        const [pRes, sRes, aRes] = await Promise.all([
          fetch("/api/profile"),
          fetch("/api/security/sessions"),
          fetch("/api/apps"),
        ]);
        const [pJson, sJson, aJson] = await Promise.all([
          pRes.json(),
          sRes.json(),
          aRes.json(),
        ]);
        if (pJson.ok) setProfile(pJson.data);
        if (sJson.ok) setSessions(sJson.data);
        if (aJson.ok) setApps(aJson.data);
      } catch {
        goLogin();
      } finally {
        setLoading(false);
      }
    })();
  }, [goLogin]);

  const title = useMemo(() => {
    if (panel) return PANEL_TITLES[panel];
    return navItems.find((n) => n.id === nav)?.label ?? "pnk ID";
  }, [nav, panel]);

  const openPanel = (id: PanelId) => setPanel(id);
  const closePanel = () => setPanel(null);

  const switchNav = (id: NavId) => {
    setPanel(null);
    setNav(id);
  };

  const logout = async () => {
    if (profile?.id) {
      const { markAccountSignedOut } = await import("@/lib/remembered-accounts");
      markAccountSignedOut(profile.id);
    }
    await fetch("/api/auth/logout", { method: "POST" });
    goLogin();
  };

  const letter = avatarLetter(profile);
  const sessionsSubtitle =
    sessions.length <= 1
      ? "Только это устройство"
      : `Это устройство и ещё ${sessions.length - 1}`;

  if (loading || !profile) {
    return (
      <div className="h-dvh bg-[#0c0d10] text-white/40 flex items-center justify-center font-[family-name:var(--font-manrope)]">
        Загрузка…
      </div>
    );
  }

  return (
    <div className="h-dvh bg-[#0c0d10] text-white flex overflow-hidden">
      <aside className="hidden md:flex w-[240px] shrink-0 flex-col px-3 py-5 min-h-0">
        <div className="px-2 mb-6 shrink-0">
          <Logo variant="id" href="/cabinet" className="w-[96px]" priority />
        </div>

        <nav className="flex-1 min-h-0 overflow-y-auto space-y-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = !panel && nav === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => switchNav(item.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-[14px] text-[14px] font-[family-name:var(--font-manrope)] transition-colors",
                  active
                    ? "bg-[#1a1c22] text-white"
                    : "text-white/55 hover:bg-white/[0.04] hover:text-white/85",
                )}
              >
                <Icon
                  size={18}
                  className={active ? "text-white" : "text-white/45"}
                />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="px-2 pt-4 text-[12px] text-white/30 font-[family-name:var(--font-manrope)] space-y-2 shrink-0">
          <p>
            <Link
              href="/help"
              className="hover:text-white/50 transition-colors"
            >
              Справка
            </Link>
            {" ·"}
            <Link
              href="/legal/terms"
              className="hover:text-white/50 transition-colors"
            >
              Условия
            </Link>
          </p>
          <button
            type="button"
            onClick={() => void logout()}
            className="flex items-center gap-1.5 hover:text-white/50 transition-colors"
          >
            <LogOut size={12} />
            Выйти
          </button>
          <p>© {new Date().getFullYear()} pnk</p>
        </div>
      </aside>

      <div className="flex-1 min-w-0 min-h-0 flex flex-col">
        <header className="md:hidden sticky top-0 z-40 flex items-center justify-between gap-3 px-4 py-3 bg-[#0c0d10]/95 backdrop-blur shrink-0">
          <button
            type="button"
            onClick={() => setMobileNavOpen(true)}
            className="h-10 w-10 rounded-full flex items-center justify-center text-white/70 hover:bg-white/[0.05]"
            aria-label="Меню"
          >
            <Menu size={20} />
          </button>
          <Logo variant="id" href="/cabinet" className="w-[88px]" />
          <button
            type="button"
            onClick={() => void logout()}
            className="text-[13px] text-white/45 font-[family-name:var(--font-manrope)] hover:text-white/70"
          >
            Выйти
          </button>
        </header>

        <main className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 md:px-10 lg:px-14 py-6 md:py-10">
          <div className="max-w-[720px] pb-16">
            {!panel && (
              <>
                <div className="hidden md:flex items-center justify-between mb-8">
                  <h1 className="text-[28px] font-semibold font-[family-name:var(--font-unbounded)] tracking-[-0.03em]">
                    {title}
                  </h1>
                </div>
                <h1 className="md:hidden text-[24px] font-semibold font-[family-name:var(--font-unbounded)] tracking-[-0.03em] mb-6">
                  {title}
                </h1>
              </>
            )}

            {panel ? (
              <PanelView
                panel={panel}
                onBack={closePanel}
                profile={profile}
                sessions={sessions}
                apps={apps}
                qrLogin={qrLogin}
                setQrLogin={setQrLogin}
                onProfile={setProfile}
                onSessions={setSessions}
                onApps={setApps}
                onDeleted={goLogin}
              />
            ) : (
              <>
                {nav === "data" && (
                  <div>
                    <button
                      type="button"
                      onClick={() => setEditOpen(true)}
                      className="w-full rounded-[22px] bg-[#1a1c22] p-4 md:p-5 flex items-center gap-4 text-left hover:bg-[#1e2028] transition-colors"
                    >
                      <div
                        className={cn(
                          "h-14 w-14 md:h-16 md:w-16 rounded-[18px] overflow-hidden flex items-center justify-center text-white text-[22px] font-semibold font-[family-name:var(--font-manrope)] shrink-0",
                          !profile.avatarUrl && "bg-[#0066ff]",
                        )}
                      >
                        {profile.avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={profile.avatarUrl}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          letter
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[17px] md:text-[18px] font-semibold font-[family-name:var(--font-manrope)] truncate">
                          {fullName(profile)}
                        </p>
                        <p className="text-[14px] text-white/40 font-[family-name:var(--font-manrope)] mt-0.5">
                          Зовите меня:{" "}
                          {profile.displayName ||
                            profile.firstName ||
                            profile.login}
                        </p>
                      </div>
                      <span className="h-10 w-10 rounded-full bg-[#0f1115] flex items-center justify-center shrink-0 text-white/55">
                        <Pencil size={16} />
                      </span>
                    </button>

                    <Section
                      title="Контакты"
                      subtitle="Логин, email и телефон для входа и восстановления"
                    >
                      <Card>
                        <Row
                          icon={User}
                          title={`@${profile.login}`}
                          subtitle="Ваш pnk ID"
                          onClick={() => openPanel("mailbox")}
                        />
                        <Row
                          icon={Mail}
                          title={profile.email || "Email не указан"}
                          subtitle="Email"
                        />
                        <Row
                          icon={Call}
                          title="Телефон"
                          subtitle={displayPhone(profile.phone)}
                          onClick={() => openPanel("phone")}
                        />
                      </Card>
                    </Section>

                    <Section
                      title="Управление аккаунтом"
                      subtitle="Профиль и связанные настройки"
                    >
                      <Card>
                        <Row
                          icon={Mail}
                          title="Имя и подпись"
                          subtitle="Как вас видят в сервисах pnk"
                          onClick={() => openPanel("sender")}
                        />
                        <Row
                          icon={Settings}
                          title="Уведомления"
                          subtitle="Письма о входе и важных событиях"
                          onClick={() => openPanel("notifications")}
                        />
                        <Row
                          icon={Trash2}
                          title="Удалить аккаунт"
                          onClick={() => openPanel("delete")}
                        />
                      </Card>
                    </Section>
                  </div>
                )}

                {nav === "security" && (
                  <div className="pb-8">
                    <Section
                      title="Способ входа"
                      subtitle="Как вы входите в pnk ID"
                    >
                      <Card>
                        <Row
                          icon={KeyRound}
                          title="Текущий способ"
                          subtitle="Обычный пароль"
                          trailing={
                            <Check size={16} className="text-[#4d9fff]" />
                          }
                          onClick={() => openPanel("login-method")}
                        />
                        <Row
                          icon={Lock}
                          title="Обновить пароль"
                          subtitle="Смена пароля аккаунта"
                          onClick={() => openPanel("password")}
                        />
                        <Row
                          icon={Shield}
                          title="Способы восстановления"
                          subtitle="Телефон и резервная почта"
                          onClick={() => openPanel("recovery")}
                        />
                      </Card>
                    </Section>

                    <Section
                      title="Телефон для входа"
                      subtitle="Номер для восстановления доступа"
                    >
                      <Card>
                        <Row
                          icon={Call}
                          title={displayPhone(profile.phone)}
                          subtitle="Основной номер"
                          onClick={() => openPanel("phone")}
                        />
                      </Card>
                    </Section>

                    <Section
                      title="Сессии и доступ"
                      subtitle="Где открыт ваш pnk ID"
                    >
                      <Card>
                        <Row
                          icon={HardDrive}
                          title="Активные сессии"
                          subtitle={sessionsSubtitle}
                          onClick={() => openPanel("sessions")}
                        />
                        <Row
                          icon={KeyRound}
                          title="Приложения с доступом"
                          subtitle={
                            apps.length
                              ? `${apps.length} подключённых`
                              : "Пока нет"
                          }
                          onClick={() => openPanel("apps")}
                        />
                      </Card>
                    </Section>

                    <Section
                      title="Вход по QR-коду"
                      subtitle="Отсканируйте код телефоном, чтобы войти"
                    >
                      <Card>
                        <Row
                          icon={QrCode}
                          title="Входить с QR"
                          subtitle={qrLogin ? "Включено" : "Выключено"}
                          onClick={() => openPanel("qr")}
                          trailing={
                            <Toggle checked={qrLogin} onChange={setQrLogin} />
                          }
                        />
                      </Card>
                    </Section>
                  </div>
                )}

                {nav === "support" && (
                  <SupportChat userAvatar={profile.avatarUrl} letter={letter} />
                )}
              </>
            )}
          </div>
        </main>
      </div>

      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/60"
            aria-label="Закрыть меню"
            onClick={() => setMobileNavOpen(false)}
          />
          <div className="absolute left-0 top-0 bottom-0 w-[280px] bg-[#12141a] p-4 flex flex-col">
            <div className="flex items-center justify-between mb-5">
              <Logo variant="id" href="/cabinet" className="w-[92px]" />
              <button
                type="button"
                onClick={() => setMobileNavOpen(false)}
                className="h-9 w-9 rounded-full flex items-center justify-center text-white/50 hover:bg-white/[0.06]"
              >
                <X size={18} />
              </button>
            </div>
            <nav className="space-y-0.5">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = !panel && nav === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      switchNav(item.id);
                      setMobileNavOpen(false);
                    }}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-[14px] text-[14px] font-[family-name:var(--font-manrope)]",
                      active
                        ? "bg-[#1a1c22]"
                        : "text-white/60 hover:bg-white/[0.04]",
                    )}
                  >
                    <Icon size={18} />
                    {item.label}
                  </button>
                );
              })}
            </nav>
            <div className="mt-auto pt-4 space-y-2 text-[13px] text-white/40 font-[family-name:var(--font-manrope)]">
              <Link href="/help" className="block hover:text-white/60">
                Справка
              </Link>
              <Link href="/legal/terms" className="block hover:text-white/60">
                Условия
              </Link>
              <button
                type="button"
                onClick={() => void logout()}
                className="flex items-center gap-1.5 hover:text-white/60"
              >
                <LogOut size={14} />
                Выйти
              </button>
            </div>
          </div>
        </div>
      )}

      <EditProfileModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        profile={profile}
        onSaved={setProfile}
      />
    </div>
  );
}
