import {
  PRESETS,
  isIOS,
  isVibrationSupported,
  schedulePattern,
  toVibrateSequence,
  type PresetName,
} from "@haptics/core";

export type HapticKind = "light" | "medium" | "selection" | "success";

/** Maps app kinds → @haptics presets (use these as `data-haptic` values). */
export const HAPTIC_PRESET: Record<HapticKind, PresetName> = {
  light: "impact-light",
  medium: "impact-medium",
  selection: "selection",
  success: "success",
};

/**
 * Imperative haptic for non-tap moments (e.g. QR decode).
 * For button taps prefer `data-haptic` + HapticsProvider (real iOS Taptic).
 * Never plays audio.
 */
export function haptic(kind: HapticKind = "light") {
  if (typeof window === "undefined") return;

  const pattern = PRESETS[HAPTIC_PRESET[kind]];

  try {
    if (isVibrationSupported()) {
      navigator.vibrate(toVibrateSequence(pattern));
      return;
    }
  } catch {
    /* ignore */
  }

  if (isIOS()) {
    try {
      schedulePattern(pattern);
    } catch {
      /* ignore — iOS 26.5+ ignores programmatic ticks */
    }
  }
}
