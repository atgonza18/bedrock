import { useCallback, useRef } from "react";
import { haptics } from "@/lib/haptics";

type Handlers = {
  onPointerDown: (e: React.PointerEvent) => void;
  onPointerUp: () => void;
  onPointerMove: (e: React.PointerEvent) => void;
  onPointerCancel: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
};

/**
 * Long-press detector for touch / pointer surfaces. Fires after `delay`ms
 * of held contact without significant movement. Emits a small haptic tap
 * on trigger so the user knows something happened.
 *
 * Also intercepts right-click (onContextMenu) so mouse users get parity.
 */
export function useLongPress(
  callback: () => void,
  options: { delay?: number; moveThreshold?: number } = {},
): Handlers {
  const delay = options.delay ?? 500;
  const moveThreshold = options.moveThreshold ?? 8;
  const timerRef = useRef<number | null>(null);
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const firedRef = useRef(false);

  const clear = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    startRef.current = null;
  }, []);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      firedRef.current = false;
      startRef.current = { x: e.clientX, y: e.clientY };
      timerRef.current = window.setTimeout(() => {
        haptics.tap();
        firedRef.current = true;
        callback();
      }, delay);
    },
    [callback, delay],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!startRef.current || timerRef.current === null) return;
      const dx = e.clientX - startRef.current.x;
      const dy = e.clientY - startRef.current.y;
      if (dx * dx + dy * dy > moveThreshold * moveThreshold) clear();
    },
    [clear, moveThreshold],
  );

  const onPointerUp = useCallback(() => {
    clear();
  }, [clear]);

  const onPointerCancel = useCallback(() => {
    clear();
  }, [clear]);

  const onContextMenu = useCallback(
    (e: React.MouseEvent) => {
      // Right-click parity for desktop / mouse users.
      e.preventDefault();
      haptics.tap();
      callback();
    },
    [callback],
  );

  return { onPointerDown, onPointerUp, onPointerMove, onPointerCancel, onContextMenu };
}
