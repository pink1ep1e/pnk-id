"use client";

import { useCallback, useRef } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";

const DEFAULT_MOVE_PX = 14;

type PressState = {
  x: number;
  y: number;
  tracking: boolean;
  pointerId: number | null;
};

/**
 * Fire only on a real tap (press + release without dragging).
 * Cancels as soon as the finger moves — so scrolling over controls stays a scroll.
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

  const clear = useCallback(() => {
    state.current = {
      x: 0,
      y: 0,
      tracking: false,
      pointerId: null,
    };
  }, []);

  const movedTooFar = useCallback(
    (clientX: number, clientY: number) => {
      const s = state.current;
      const dx = clientX - s.x;
      const dy = clientY - s.y;
      return dx * dx + dy * dy > moveThresholdPx * moveThresholdPx;
    },
    [moveThresholdPx],
  );

  const onPointerDown = useCallback((e: ReactPointerEvent<HTMLElement>) => {
    if (e.button !== 0) return;
    state.current = {
      x: e.clientX,
      y: e.clientY,
      tracking: true,
      pointerId: e.pointerId,
    };
  }, []);

  const onPointerMove = useCallback(
    (e: ReactPointerEvent<HTMLElement>) => {
      const s = state.current;
      if (!s.tracking || s.pointerId !== e.pointerId) return;
      if (movedTooFar(e.clientX, e.clientY)) clear();
    },
    [clear, movedTooFar],
  );

  const onPointerUp = useCallback(
    (e: ReactPointerEvent<HTMLElement>) => {
      const s = state.current;
      if (!s.tracking || s.pointerId !== e.pointerId) return;
      const ok = !movedTooFar(e.clientX, e.clientY);
      clear();
      if (ok) onTapRef.current();
    },
    [clear, movedTooFar],
  );

  const onPointerCancel = useCallback(
    (e: ReactPointerEvent<HTMLElement>) => {
      if (state.current.pointerId !== e.pointerId) return;
      clear();
    },
    [clear],
  );

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
  };
}
