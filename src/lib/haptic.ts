/** Press feedback: Vibration API where available, short click on iOS. */

let audioCtx: AudioContext | null = null;

function playTick(kind: "light" | "medium" | "selection" | "success") {
  if (typeof window === "undefined") return;
  try {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!AC) return;
    if (!audioCtx) audioCtx = new AC();
    if (audioCtx.state === "suspended") void audioCtx.resume();

    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "sine";
    const freq =
      kind === "success" ? 520 : kind === "medium" ? 240 : kind === "selection" ? 360 : 300;
    const dur = kind === "medium" ? 0.028 : kind === "success" ? 0.04 : 0.018;
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.045, now + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + dur + 0.01);
  } catch {
    /* ignore */
  }
}

function isIosLike() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  return (
    /iP(hone|ad|od)/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

export function haptic(
  kind: "light" | "medium" | "selection" | "success" = "light",
) {
  if (typeof navigator === "undefined") return;

  const vibrate = navigator.vibrate?.bind(navigator);
  if (vibrate && !isIosLike()) {
    const pattern =
      kind === "light"
        ? 10
        : kind === "selection"
          ? 8
          : kind === "medium"
            ? 18
            : [12, 40, 12];
    try {
      if (vibrate(pattern)) return;
    } catch {
      /* fall through */
    }
  }

  // iOS Safari has no Vibration API — short click as feedback.
  playTick(kind);
}
