/** Short vibration for press feedback (no-op where unsupported). */
export function haptic(
  kind: "light" | "medium" | "selection" | "success" = "light",
) {
  if (typeof navigator === "undefined") return;
  const vibrate = navigator.vibrate?.bind(navigator);
  if (!vibrate) return;

  const pattern =
    kind === "light"
      ? 10
      : kind === "selection"
        ? 8
        : kind === "medium"
          ? 18
          : [12, 40, 12];

  try {
    vibrate(pattern);
  } catch {
    /* ignore */
  }
}
