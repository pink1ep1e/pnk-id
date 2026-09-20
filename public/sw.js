/* Fast offline fallback for pnk ID PWA */
const CACHE = "pnk-id-offline-v3";
const OFFLINE_URL = "/offline.html";
const NET_TIMEOUT_MS = 2000;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll([OFFLINE_URL]))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
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
  const cached = await caches.match(OFFLINE_URL);
  if (cached) return cached;
  return new Response(
    "<!doctype html><html lang=ru><meta charset=utf-8><meta name=viewport content=\"width=device-width,initial-scale=1\"><title>Нет интернета</title><body style=\"margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0c0d10;color:#fff;font-family:system-ui,sans-serif\"><div style=\"text-align:center;padding:24px\"><h1 style=\"font-size:24px\">Нет интернета</h1><p style=\"color:#999\">Проверьте подключение или выключите VPN и обновите страницу.</p><button onclick=\"location.reload()\" style=\"margin-top:24px;height:48px;padding:0 20px;border:0;border-radius:14px;background:#0066ff;color:#fff;font-size:15px;font-weight:600\">Обновить страницу</button></div></body></html>",
    {
      status: 503,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    },
  );
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const accept = req.headers.get("accept") || "";
  const isNav = req.mode === "navigate" || accept.includes("text/html");
  if (!isNav) return;

  event.respondWith(
    (async () => {
      try {
        const res = await withTimeout(fetch(req), NET_TIMEOUT_MS);
        if (!res || !res.ok) return offlineResponse();
        return res;
      } catch {
        return offlineResponse();
      }
    })(),
  );
});
