"use client";

import { cn } from "@/lib/utils";
import {
  AnimatePresence,
  motion,
  useDragControls,
  type PanInfo,
} from "motion/react";
import {
  type ReactNode,
  useEffect,
  useState,
} from "react";

function useIsMobileSheet() {
  const [mobile, setMobile] = useState(true);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const sync = () => setMobile(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  return mobile;
}

export function BottomSheet({
  open,
  onClose,
  children,
  labelledBy,
  className,
  dismissible = true,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  labelledBy?: string;
  className?: string;
  /** When false, backdrop/swipe/Escape do not close (e.g. nested cropper). */
  dismissible?: boolean;
}) {
  const mobile = useIsMobileSheet();
  const dragControls = useDragControls();

  useEffect(() => {
    if (!open || !dismissible) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose, dismissible]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (!dismissible || !mobile) return;
    if (info.offset.y > 110 || info.velocity.y > 700) onClose();
  };

  return (
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center sm:p-4">
          <motion.button
            type="button"
            aria-label="Закрыть"
            className="absolute inset-0 bg-black/65 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.14 }}
            onClick={() => {
              if (dismissible) onClose();
            }}
          />

          <motion.div
            role="dialog"
            aria-modal
            aria-labelledby={labelledBy}
            className={cn(
              "relative z-10 w-full sm:max-w-[520px] max-h-[92dvh] flex flex-col rounded-t-[28px] sm:rounded-[28px] bg-[#1a1c22] shadow-[0_24px_80px_rgba(0,0,0,0.55)]",
              className,
            )}
            initial={mobile ? { y: "100%" } : { opacity: 0, scale: 0.96, y: 12 }}
            animate={mobile ? { y: 0 } : { opacity: 1, scale: 1, y: 0 }}
            exit={mobile ? { y: "100%" } : { opacity: 0, scale: 0.96, y: 12 }}
            transition={
              mobile
                ? { type: "spring", damping: 34, stiffness: 520, mass: 0.75 }
                : { duration: 0.14, ease: [0.2, 0.8, 0.2, 1] }
            }
            drag={mobile && dismissible ? "y" : false}
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.04, bottom: 0.6 }}
            onDragEnd={onDragEnd}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div
              className="sm:hidden flex justify-center pt-3 pb-1 shrink-0 touch-none cursor-grab active:cursor-grabbing"
              onPointerDown={(e) => {
                if (dismissible) dragControls.start(e);
              }}
            >
              <span className="h-1 w-10 rounded-full bg-white/30" aria-hidden />
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-2 sm:p-7 sm:pt-6">
              {children}
            </div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
