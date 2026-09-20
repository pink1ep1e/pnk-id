"use client";

import { OfflineScreen } from "@/components/offline-screen";
import { useEffect, useState } from "react";

function readOffline() {
  return typeof navigator !== "undefined" && navigator.onLine === false;
}

export function OfflineProvider({ children }: { children: React.ReactNode }) {
  const [offline, setOffline] = useState(readOffline);

  useEffect(() => {
    const boot = document.getElementById("offline-boot");
    const sync = () => {
      setOffline(!navigator.onLine);
      // React owns the offline UI after hydration.
      if (boot) boot.hidden = true;
    };
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    void navigator.serviceWorker
      .register("/sw.js", { updateViaCache: "none" })
      .then((reg) => {
        void reg.update();
        // Drop ancient caches left by previous SW versions.
        if ("caches" in window) {
          void caches.keys().then((keys) =>
            Promise.all(
              keys
                .filter((k) => k.startsWith("pnk-id-offline-") && k !== "pnk-id-offline-v4")
                .map((k) => caches.delete(k)),
            ),
          );
        }
      })
      .catch(() => {});
  }, []);

  return (
    <>
      {children}
      {offline ? <OfflineScreen /> : null}
    </>
  );
}
