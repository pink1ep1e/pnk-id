import { cn } from "@/lib/utils";

export function getPasswordStrength(password: string): {
  score: number;
  label: string;
  color: string;
} {
  if (!password) return { score: 0, label: "", color: "bg-white/15" };
  let points = 0;
  if (password.length >= 8) points += 1;
  if (password.length >= 12) points += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) points += 1;
  if (/\d/.test(password)) points += 1;
  if (/[^A-Za-z0-9]/.test(password)) points += 1;
  const score = Math.min(4, points);
  if (score <= 1)
    return { score: Math.max(1, score), label: "Слабый", color: "bg-[#ff5c5c]" };
  if (score === 2) return { score, label: "Средний", color: "bg-[#f5a524]" };
  if (score === 3) return { score, label: "Хороший", color: "bg-[#4d9fff]" };
  return { score, label: "Надёжный", color: "bg-[#3dd68c]" };
}

export function PasswordStrengthBar({ password }: { password: string }) {
  const { score, label, color } = getPasswordStrength(password);
  if (!password) return null;
  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex gap-1.5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "h-1 flex-1 rounded-full transition-colors",
              i < score ? color : "bg-white/10",
            )}
          />
        ))}
      </div>
      <p className="text-[12px] text-white/45 font-[family-name:var(--font-manrope)]">
        Сложность: <span className="text-white/70">{label}</span>
      </p>
    </div>
  );
}
