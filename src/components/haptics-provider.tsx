"use client";

import { HapticsProvider } from "@haptics/react";
import type { ReactNode } from "react";

/** Native vibration / iOS Taptic only — no audio fallback. */
export function AppHapticsProvider({ children }: { children: ReactNode }) {
  return (
    <HapticsProvider audioFallback={false} respectReducedMotion={false}>
      {children}
    </HapticsProvider>
  );
}
