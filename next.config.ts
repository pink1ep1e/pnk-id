import type { NextConfig } from "next";

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
    ];
  },
};

export default nextConfig;
