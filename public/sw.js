/* Fast offline fallback for pnk ID PWA */
const CACHE = "pnk-id-offline-v4";
const OFFLINE_URL = "/offline.html";
const NET_TIMEOUT_MS = 2000;

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      // Bypass HTTP cache so we never keep a stale offline.html.
      const res = await fetch(OFFLINE_URL, { cache: "reload" });
      await cache.put(OFFLINE_URL, res.clone());
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k !== CACHE)
          .map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const id = setTimeout(() => reject(new Error("timeout")), ms);
    promise.then(
      (value) => {
        clearTimeout(id);
        resolve(value);
      },
      (err) => {
        clearTimeout(id);
        reject(err);
      },
    );
  });
}

async function offlineResponse() {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(OFFLINE_URL);
  if (cached) return cached;
  return new Response(
    "<!doctype html><html lang=ru><meta charset=utf-8><meta name=viewport content=\"width=device-width,initial-scale=1\"><title>Нет интернета</title><body style=\"margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0c0d10;color:#fff;font-family:system-ui,sans-serif\"><div style=\"text-align:center;padding:24px\"><h1 style=\"font-size:24px\">Нет интернета</h1><p style=\"color:#999\">Проверьте подключение или выключите VPN и обновите страницу.</p><button onclick=\"location.reload()\" style=\"margin-top:24px;height:48px;padding:0 20px;border:0;border-radius:14px;background:#0066ff;color:#fff;font-size:15px;font-weight:600\">Обновить страницу</button></div></body></html>",
    {
      status: 503,
      headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
    },
  );
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const accept = req.headers.get("accept") || "";
  const isNav = req.mode === "navigate" || accept.includes("text/html");
  if (!isNav) return;

  // Never hijack the offline page itself.
  const url = new URL(req.url);
  if (url.pathname === OFFLINE_URL) {
    event.respondWith(fetch(req, { cache: "no-store" }).catch(() => offlineResponse()));
    return;
  }

  event.respondWith(
    (async () => {
      try {
        // Only fall back when the network is unreachable / too slow.
        return await withTimeout(fetch(req), NET_TIMEOUT_MS);
      } catch {
        return offlineResponse();
      }
    })(),
  );
});
