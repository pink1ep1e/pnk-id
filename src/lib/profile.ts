export const TIMEZONES = [
  "(UTC+02:00) Калининград",
  "(UTC+03:00) Москва",
  "(UTC+04:00) Самара",
  "(UTC+05:00) Екатеринбург",
  "(UTC+06:00) Омск",
  "(UTC+07:00) Красноярск",
  "(UTC+08:00) Иркутск",
  "(UTC+09:00) Якутск",
  "(UTC+10:00) Владивосток",
  "(UTC+11:00) Магадан",
  "(UTC+12:00) Камчатка",
];

export function formatRuPhone(digits: string): string {
  let d = digits.replace(/\D/g, "");
  if (d.startsWith("8")) d = `7${d.slice(1)}`;
  if (d && !d.startsWith("7")) d = `7${d}`;
  d = d.slice(0, 11);
  const a = d.slice(1, 4);
  const b = d.slice(4, 7);
  const c = d.slice(7, 9);
  const e = d.slice(9, 11);
  let out = "+7";
  if (a.length) out += ` (${a}` + (a.length === 3 ? ")" : "");
  if (b.length) out += ` ${b}`;
  if (c.length) out += `-${c}`;
  if (e.length) out += `-${e}`;
  return out;
}

export function phoneDigits(value: string): string {
  let d = value.replace(/\D/g, "");
  if (d.startsWith("8")) d = `7${d.slice(1)}`;
  if (d && !d.startsWith("7")) d = `7${d}`;
  return d.slice(0, 11);
}

export function suggestLogins(firstName: string, lastName: string): string[] {
  const tr = (s: string) =>
    s
      .toLowerCase()
      .replace(/а/g, "a")
      .replace(/б/g, "b")
      .replace(/в/g, "v")
      .replace(/г/g, "g")
      .replace(/д/g, "d")
      .replace(/е/g, "e")
      .replace(/ё/g, "e")
      .replace(/ж/g, "zh")
      .replace(/з/g, "z")
      .replace(/и/g, "i")
      .replace(/й/g, "y")
      .replace(/к/g, "k")
      .replace(/л/g, "l")
      .replace(/м/g, "m")
      .replace(/н/g, "n")
      .replace(/о/g, "o")
      .replace(/п/g, "p")
      .replace(/р/g, "r")
      .replace(/с/g, "s")
      .replace(/т/g, "t")
      .replace(/у/g, "u")
      .replace(/ф/g, "f")
      .replace(/х/g, "h")
      .replace(/ц/g, "ts")
      .replace(/ч/g, "ch")
      .replace(/ш/g, "sh")
      .replace(/щ/g, "sch")
      .replace(/ъ/g, "")
      .replace(/ы/g, "y")
      .replace(/ь/g, "")
      .replace(/э/g, "e")
      .replace(/ю/g, "yu")
      .replace(/я/g, "ya")
      .replace(/[^a-z0-9]/g, "");

  const f = tr(firstName.trim());
  const l = tr(lastName.trim());
  if (!f && !l) return [];
  const out = new Set<string>();
  if (f && l) {
    out.add(`${f}.${l}`);
    out.add(`${f}_${l}`);
    out.add(`${f[0]}${l}`);
    out.add(`${f}${l}`);
  } else if (f) out.add(f);
  else if (l) out.add(l);
  return [...out].filter((x) => x.length >= 3).slice(0, 4);
}
