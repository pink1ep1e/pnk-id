import fs from "fs";

const files = [
  "src/components/pnk-id-page.tsx",
  "src/components/login-page.tsx",
  "src/components/register-page.tsx",
  "src/components/qr-scanner.tsx",
  "src/app/qr/approve/page.tsx",
  "src/app/help/page.tsx",
  "src/app/legal/terms/page.tsx",
  "src/app/page.tsx",
  "src/app/oauth/consent/page.tsx",
  "src/app/login/qr/page.tsx",
];

function clean(s) {
  s = s.replace(/\bdivide-y\s+divide-white\/\[0\.06\]/g, "");
  s = s.replace(/\bdivide-y\b/g, "");
  s = s.replace(/\bdivide-white\/\[0\.06\]/g, "");

  const patterns = [
    /\bborder-dashed\b/g,
    /\bborder-transparent\b/g,
    /\bborder-white\/\[0\.06\]/g,
    /\bborder-white\/10\b/g,
    /\bborder-white\/12\b/g,
    /\bborder-white\/15\b/g,
    /\bborder-white\/20\b/g,
    /\bborder-white\/8\b/g,
    /\bborder-\[#0066ff\]\/20\b/g,
    /\bborder-\[#0066ff\]\/25\b/g,
    /\bborder-\[#0066ff\]\/50\b/g,
    /\bborder-red-400\/50\b/g,
    /\bborder-emerald-400\/40\b/g,
    /\bfocus:border-\[#0066ff\]\/60\b/g,
    /\bfocus:border-\[#0066ff\]\/70\b/g,
    /\bfocus:border-red-400\/70\b/g,
    /\bfocus:border-emerald-400\/60\b/g,
    /\bfocus-within:border-\[#0066ff\]\/60\b/g,
    /\bfocus-within:border-\[#0066ff\]\/55\b/g,
    /\bborder-black\/20\b/g,
    /\bborder-b\b/g,
    /\bborder-t\b/g,
    /\bborder-r\b/g,
    /\bborder-l\b/g,
    /\bborder-2\b/g,
    /\bborder\b/g,
  ];
  for (const p of patterns) s = s.replace(p, "");

  s = s.replace(
    /transition-\[border-color,box-shadow\]/g,
    "transition-[box-shadow]",
  );
  s = s.replace(
    /transition-\[border-color,box-shadow,background-color\]/g,
    "transition-[box-shadow,background-color]",
  );

  // collapse spaces
  s = s.replace(/ {2,}/g, " ");
  s = s.replace(/className=" /g, 'className="');
  s = s.replace(/ +"/g, '"');
  s = s.replace(/ +`/g, "`");
  s = s.replace(/,\s*""/g, "");
  s = s.replace(/ {2,}/g, " ");
  return s;
}

for (const f of files) {
  if (!fs.existsSync(f)) continue;
  const before = fs.readFileSync(f, "utf8");
  const after = clean(before);
  fs.writeFileSync(f, after);
  const b = (before.match(/\bborder/g) || []).length;
  const a = (after.match(/\bborder/g) || []).length;
  console.log(f, "border", b, "->", a);
}
