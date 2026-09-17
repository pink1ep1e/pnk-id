import {
  PRESETS,
  isIOS,
  isVibrationSupported,
  schedulePattern,
  toVibrateSequence,
  type PresetName,
} from "@haptics/core";

export type HapticKind = "light" | "medium" | "selection" | "success";

const KIND_TO_PRESET: Record<HapticKind, PresetName> = {
  light: "impact-light",
  medium: "impact-medium",
  selection: "selection",
  success: "success",
};

/**
 * Vibration only — no audio, no DOM switch overlays (those block scrolling).
 * Android: navigator.vibrate. iOS: best-effort within the user gesture.
 */
export function haptic(kind: HapticKind = "light") {
  if (typeof window === "undefined") return;

  const pattern = PRESETS[KIND_TO_PRESET[kind]];

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
      /* ignore */
    }
  }
}
