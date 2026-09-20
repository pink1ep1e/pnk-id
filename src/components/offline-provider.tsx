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
    void navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);

  return (
    <>
      {children}
      {offline ? <OfflineScreen /> : null}
    </>
  );
}
