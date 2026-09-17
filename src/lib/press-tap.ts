"use client";

import { useCallback, useRef } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";

const DEFAULT_MOVE_PX = 10;

type PressState = {
  x: number;
  y: number;
  tracking: boolean;
  pointerId: number | null;
};

/**
 * Fire only on a real tap (press + release without dragging).
 * Stable across re-renders so scroll gestures don't flip tabs.
 */
export function usePressTap(
  onTap: () => void,
  moveThresholdPx = DEFAULT_MOVE_PX,
) {
  const onTapRef = useRef(onTap);
  onTapRef.current = onTap;

  const state = useRef<PressState>({
    x: 0,
    y: 0,
    tracking: false,
    pointerId: null,
  });

  const onPointerDown = useCallback((e: ReactPointerEvent<HTMLElement>) => {
    if (e.button !== 0) return;
    state.current = {
      x: e.clientX,
      y: e.clientY,
      tracking: true,
      pointerId: e.pointerId,
    };
  }, []);

  const onPointerUp = useCallback(
    (e: ReactPointerEvent<HTMLElement>) => {
      const s = state.current;
      if (!s.tracking || s.pointerId !== e.pointerId) return;
      state.current = { ...s, tracking: false, pointerId: null };
      const dx = e.clientX - s.x;
      const dy = e.clientY - s.y;
      if (dx * dx + dy * dy <= moveThresholdPx * moveThresholdPx) {
        onTapRef.current();
      }
    },
    [moveThresholdPx],
  );

  const onPointerCancel = useCallback((e: ReactPointerEvent<HTMLElement>) => {
    const s = state.current;
    if (s.pointerId !== e.pointerId) return;
    state.current = { ...s, tracking: false, pointerId: null };
  }, []);

  return { onPointerDown, onPointerUp, onPointerCancel };
}
