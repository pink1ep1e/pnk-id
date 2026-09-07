import fs from "fs";

/** Remove only full Tailwind border/divide class tokens; preserve formatting. */
function stripBorders(src) {
  const tokens = [
    "divide-y",
    "divide-white/[0.06]",
    "border-dashed",
    "border-transparent",
    "border-white/[0.06]",
    "border-white/10",
    "border-white/12",
    "border-white/15",
    "border-white/20",
    "border-white/8",
    "border-[#0066ff]/20",
    "border-[#0066ff]/25",
    "border-[#0066ff]/50",
    "border-[#0066ff]/60",
    "border-red-400/50",
    "border-emerald-400/40",
    "focus:border-[#0066ff]/60",
    "focus:border-[#0066ff]/70",
    "focus:border-red-400/70",
    "focus:border-emerald-400/60",
    "focus-within:border-[#0066ff]/60",
    "focus-within:border-[#0066ff]/55",
    "border-black/20",
    "border-b",
    "border-t",
    "border-r",
    "border-l",
    "border-2",
    "border-white",
    "border",
  ];

  // Sort longer first so we don't leave orphans
  tokens.sort((a, b) => b.length - a.length);

  return src.replace(
    /(className=\{?cn\([\s\S]*?\)\}?|className="[^"]*"|className=\{cn\([\s\S]*?\)\}|`[^`]*`)/g,
    (chunk) => {
      // Only process class-like chunks; skip template literals that aren't classes if needed
      if (
        !chunk.includes("className") &&
        !chunk.includes("rounded") &&
        !chunk.includes("flex") &&
        !chunk.includes("bg-")
      ) {
        // might still be a cn() arg string in backticks inside cn - handle via separate pass
      }
      let out = chunk;
      for (const t of tokens) {
        const escaped = t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        out = out.replace(new RegExp(`(^|[\\s"\`])${escaped}(?=[\\s"\`]|$)`, "g"), "$1");
      }
      out = out.replace(
        /transition-\[border-color,box-shadow\]/g,
        "transition-[box-shadow]",
      );
      out = out.replace(
        /transition-\[border-color,box-shadow,background-color\]/g,
        "transition-[box-shadow,background-color]",
      );
      out = out.replace(/ {2,}/g, " ");
      out = out.replace(/" /g, '"');
      out = out.replace(/ "/g, '"');
      // fix broken: className="foo  bar" already collapsed
      out = out.replace(/className=" /g, 'className="');
      out = out.replace(/ "/g, '"'); // careful
      return out;
    },
  );
}

// Safer line-by-line approach for known files
function stripFile(path) {
  let s = fs.readFileSync(path, "utf8");
  const tokens = [
    "divide-y divide-white/[0.06]",
    "divide-y",
    "divide-white/[0.06]",
    "border-dashed",
    "border-transparent",
    "border-white/[0.06]",
    "border-white/10",
    "border-white/12",
    "border-white/15",
    "border-white/20",
    "border-white/8",
    "border-[#0066ff]/20",
    "border-[#0066ff]/25",
    "border-[#0066ff]/50",
    "border-[#0066ff]/60",
    "border-red-400/50",
    "border-emerald-400/40",
    "focus:border-[#0066ff]/60",
    "focus:border-[#0066ff]/70",
    "focus:border-red-400/70",
    "focus:border-emerald-400/60",
    "focus-within:border-[#0066ff]/60",
    "focus-within:border-[#0066ff]/55",
    "border-black/20",
    "border-b",
    "border-t",
    "border-r",
    "border-l",
    "border-2",
    "border-white",
    "border",
  ];
  tokens.sort((a, b) => b.length - a.length);

  for (const t of tokens) {
    const escaped = t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    // only when flanked by space, quote, backtick, or start/end of class string segment
    s = s.replace(
      new RegExp(`(?<=[\\s"'\`])${escaped}(?=[\\s"'\`])`, "g"),
      "",
    );
    // also at start after ="
    s = s.replace(new RegExp(`(=")${escaped}(?=[\\s"])`, "g"), "$1");
    // also at end before "
    s = s.replace(new RegExp(`(?<=[\\s])${escaped}(")`, "g"), "$1");
  }

  s = s.replace(
    /transition-\[border-color,box-shadow\]/g,
    "transition-[box-shadow]",
  );
  s = s.replace(
    /transition-\[border-color,box-shadow,background-color\]/g,
    "transition-[box-shadow,background-color]",
  );

  // collapse only multiple spaces that appear inside quotes (class lists)
  s = s.replace(/("[^"]*")/g, (m) => m.replace(/ {2,}/g, " "));
  s = s.replace(/(`[^`]*`)/g, (m) => {
    // only if looks like class string
    if (!m.includes("rounded") && !m.includes("flex") && !m.includes("bg-"))
      return m;
    return m.replace(/ {2,}/g, " ");
  });

  fs.writeFileSync(path, s);
  const left = (s.match(/\bborder(?:-|\b)/g) || []).length;
  console.log(path, "remaining border*:", left);
}

const files = [
  "f:/pnk-mail/components/shared/pnk-id-page.tsx",
  "f:/pnk-id/src/components/pnk-id-page.tsx",
  "f:/pnk-id/src/components/login-page.tsx",
  "f:/pnk-id/src/components/register-page.tsx",
  "f:/pnk-id/src/app/qr/approve/page.tsx",
  "f:/pnk-id/src/app/help/page.tsx",
  "f:/pnk-id/src/app/legal/terms/page.tsx",
  "f:/pnk-id/src/app/page.tsx",
  "f:/pnk-id/src/app/oauth/consent/page.tsx",
  "f:/pnk-id/src/app/login/qr/page.tsx",
];

for (const f of files) {
  if (fs.existsSync(f)) stripFile(f);
}
