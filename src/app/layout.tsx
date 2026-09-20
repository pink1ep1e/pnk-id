import type { Metadata, Viewport } from "next";
import { Unbounded, Manrope } from "next/font/google";
import { OfflineProvider } from "@/components/offline-provider";
import "./globals.css";

const unbounded = Unbounded({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-unbounded",
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-manrope",
  display: "swap",
});

export const metadata: Metadata = {
  title: "pnk ID",
  description: "Единый безопасный аккаунт для сервисов pnk",
  applicationName: "pnk ID",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "pnk ID",
  },
  icons: {
    icon: [
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: [
    { media: "(display-mode: standalone)", color: "#12141a" },
    { color: "#0c0d10" },
  ],
};

const offlineBootScript = `(()=>{try{
  var boot=document.getElementById('offline-boot');
  var btn=document.getElementById('offline-boot-reload');
  if(!boot)return;
  function show(){boot.hidden=false}
  function hide(){boot.hidden=true}
  if(navigator.onLine===false)show();
  window.addEventListener('offline',show);
  window.addEventListener('online',hide);
  if(btn)btn.addEventListener('click',function(){location.reload()});
  if(window.matchMedia('(display-mode:standalone)').matches||window.navigator.standalone)document.documentElement.classList.add('standalone');
  if('serviceWorker' in navigator)navigator.serviceWorker.register('/sw.js',{updateViaCache:'none'}).then(function(r){try{r.update()}catch(e){}}).catch(function(){});
}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body
        className={`${unbounded.variable} ${manrope.variable} antialiased bg-[#0c0d10] text-white font-[family-name:var(--font-manrope)]`}
      >
        <div
          id="offline-boot"
          hidden
          suppressHydrationWarning
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
            background: "#0c0d10",
            color: "#fff",
            fontFamily:
              "var(--font-manrope), system-ui, -apple-system, sans-serif",
          }}
        >
          <div style={{ width: "100%", maxWidth: 360, textAlign: "center" }}>
            <div
              style={{
                width: 64,
                height: 64,
                margin: "0 auto 24px",
                borderRadius: 18,
                background: "#1a1c22",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "rgba(255,255,255,0.55)",
              }}
              aria-hidden
            >
              <svg width="30" height="30" viewBox="0 0 14 14" fill="none">
                <path
                  fill="currentColor"
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M5.11 2.42c.82-.5 1.79-.71 2.74-.6.96.11 1.85.55 2.52 1.23.63.63 1.03 1.45 1.16 2.32.66.2 1.24.61 1.65 1.17.44.62.64 1.37.55 2.12-.09.75-.45 1.44-1.02 1.95-1.3 1.15-3.52 1.63-5.63 1.6-2.12-.03-4.32-.57-5.6-1.67C.76 9.92.32 9.05.26 8.12c-.04-.62.08-1.24.36-1.78.4-.78 1.1-1.36 1.95-1.62.2-.9.7-1.7 1.4-2.24.5-.4 1.09-.65 1.72-.76.14-.02.28-.03.42-.03Z"
                />
              </svg>
            </div>
            <h1
              style={{
                margin: 0,
                fontSize: 24,
                letterSpacing: "-0.03em",
                fontWeight: 600,
              }}
            >
              Нет интернета
            </h1>
            <p
              style={{
                margin: "12px 0 0",
                fontSize: 15,
                lineHeight: 1.5,
                color: "rgba(255,255,255,0.45)",
              }}
            >
              Проверьте подключение или выключите VPN и обновите страницу.
            </p>
            <button
              id="offline-boot-reload"
              type="button"
              style={{
                marginTop: 32,
                width: "100%",
                height: 48,
                border: 0,
                borderRadius: 14,
                background: "#0066ff",
                color: "#fff",
                fontSize: 15,
                fontWeight: 600,
                fontFamily: "inherit",
                cursor: "pointer",
              }}
            >
              Обновить страницу
            </button>
          </div>
        </div>
        <script dangerouslySetInnerHTML={{ __html: offlineBootScript }} />
        <OfflineProvider>{children}</OfflineProvider>
      </body>
    </html>
  );
}
