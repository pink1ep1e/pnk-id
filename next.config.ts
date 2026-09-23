import type { NextConfig } from "next";

const mailOrigin =
  process.env.NEXT_PUBLIC_MAIL_URL?.replace(/\/$/, "") ||
  "http://localhost:3000";

const frameAncestors = [
  "'self'",
  mailOrigin,
  "http://localhost:3000",
  "https://mail.pnkmail.ru",
].join(" ");

const nextConfig: NextConfig = {
  // standalone только для Docker (DOCKER=1). Под PM2 — обычный `next start`.
  ...(process.env.DOCKER === "1" ? { output: "standalone" as const } : {}),
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
      {
        source: "/offline.html",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
        ],
      },
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: `frame-ancestors ${frameAncestors}`,
          },
          {
            key: "Permissions-Policy",
            value: "camera=(self), microphone=(self)",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
