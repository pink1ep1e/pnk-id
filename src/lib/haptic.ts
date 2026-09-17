/** Press feedback for taps. iOS has no Vibration API — use a click within the gesture. */

type HapticKind = "light" | "medium" | "selection" | "success";

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AC =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!AC) return null;
  if (!audioCtx) audioCtx = new AC();
  return audioCtx;
}

/** Tiny PCM click as WAV — plays more reliably on iOS than oscillators alone. */
const CLICK_WAV =
  "data:audio/wav;base64,UklGRrkCAABXQVZFZm10IBAAAAABAAEAIlYAACJWAAABAAgAZGF0YZUCAACAi5eirbfBydHY3eLl5+jo5uPf2tTNxb20qqCVioB1a2BXTkU9NjArJyQiIiIjJikuMzlASFFZYmx2f4mSm6SstLvBx8vP0tPU1NPQzcnEv7ixqqKakYmAd29mX1dQSkQ/Ozg2NDM0NTc6PUJHTFNZYGhvd3+Hj5adpKqwtbm9wMLDxMTDwb+7t7OuqKKclY6HgHlya2VfWVRQTEhGREJCQkNER0pNUVZbYGZscnl/hYuSl52ipqqusbS1tre3trWzsK2ppaCclpGLhoB6dW9qZWFdWVZTUU9OTk5OUFFUV1peYmZrcHV6f4SJjpOXm5+ipaiqq6ysrKyrqaekoZ6alpKOiYWAe3dzbmpnY2BeW1pYV1dXWFlaXF5hZGdrb3N3e3+Dh4uPkpaZnJ6goqOkpKSjoqGfnZuYlZKPi4iEgHx5dXJua2lmZGJhYF9fX19gYWNlZ2lsb3J1eHx/goaJjI+Sk5WWl5eXl5eWlpWTkpCOjIqHhYKAfnt5d3RycW9ubGtrampqamtsbW5vcXJ0dnh7fX+Bg4aIiYuNjpCRkpKTk5OTkpGRj46Ni4qIhoSCgH58enh3dXNycXBvb25ubm5vb3BxcnR1dnh6fH1/gYOEhoiJiouNjY6Pj4+Pj4+OjYyLiomIhoWDgoB+fXt6eHd2dXRzcnJycXFycnJzdHV2d3h5e3x9fn+AgYOEhYaHh4iJiYmKioqKiYmJiIeHhoWEgoGAf318e3p5eHd2dXV0dHR0dHR1dXZ3eHl6e3x9fn+Bg4WGh4iJiouLjIyMjIyMi4uKiYiHhoWEgoGAf358e3p5eHd2dXV0dHR0dHR1dXZ3eHl6e3x9fn+AgYOEhYaHh4iJiYmKioqKiYmJiIeH";

function playWavClick(volume = 0.45) {
  try {
    const a = new Audio(CLICK_WAV);
    a.volume = Math.min(1, Math.max(0, volume));
    void a.play().catch(() => undefined);
  } catch {
    /* ignore */
  }
}

async function playOscClick(kind: HapticKind) {
  const ctx = getAudioContext();
  if (!ctx) return;
  if (ctx.state === "suspended") {
    try {
      await ctx.resume();
    } catch {
      return;
    }
  }

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "triangle";
  const freq =
    kind === "success"
      ? 480
      : kind === "medium"
        ? 220
        : kind === "selection"
          ? 340
          : 280;
  const peak =
    kind === "medium" || kind === "success" ? 0.22 : 0.16;
  const dur = kind === "medium" ? 0.04 : kind === "success" ? 0.05 : 0.025;

  osc.frequency.setValueAtTime(freq, now);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(peak, now + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + dur + 0.02);
}

function isIosLike() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  return (
    /iP(hone|ad|od)/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

/** Call from pointerdown so iOS treats it as a user gesture. */
export function haptic(kind: HapticKind = "light") {
  if (typeof window === "undefined") return;

  try {
    navigator.vibrate?.(
      kind === "light"
        ? 10
        : kind === "selection"
          ? 8
          : kind === "medium"
            ? 18
            : [12, 40, 12],
    );
  } catch {
    /* ignore */
  }

  if (isIosLike()) {
    // Prime + play inside the same gesture tick.
    const ctx = getAudioContext();
    if (ctx?.state === "suspended") {
      void ctx.resume().then(() => {
        void playOscClick(kind);
      });
    } else {
      void playOscClick(kind);
    }
    playWavClick(kind === "medium" || kind === "success" ? 0.55 : 0.4);
    return;
  }

  void playOscClick(kind);
}

/** Warm AudioContext on first page interaction (iOS). */
export function primeHaptics() {
  if (typeof window === "undefined") return;
  const ctx = getAudioContext();
  if (ctx?.state === "suspended") void ctx.resume();
  playWavClick(0.01);
}
