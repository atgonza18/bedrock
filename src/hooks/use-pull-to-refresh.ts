import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Pull-to-refresh gesture for touch surfaces. Only engages when the page
 * is already scrolled to the top (so regular pull-down scroll is unaffected).
 *
 * Because Convex queries are reactive and self-refreshing, the "refresh"
 * here is mostly perceptual — we let the caller await any Promise (or
 * simply wait ~400ms) then dismiss the spinner. Great for the "something
 * happened" reassurance without a hard refetch.
 *
 * Usage:
 *   const { bind, indicator } = usePullToRefresh(async () => { await …; });
 *   return <div {...bind}>{indicator}{children}</div>
 */
export function usePullToRefresh(
  onRefresh: () => Promise<void> | void,
  options: { threshold?: number } = {},
) {
  const threshold = options.threshold ?? 70;
  const startYRef = useRef<number | null>(null);
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (window.scrollY > 0) return;
    startYRef.current = e.touches[0]?.clientY ?? null;
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (startYRef.current === null) return;
    const y = e.touches[0]?.clientY ?? 0;
    const d = y - startYRef.current;
    if (d <= 0) {
      setPull(0);
      return;
    }
    // Dampen the pull distance so the indicator doesn't follow 1:1.
    setPull(Math.min(threshold * 1.5, d * 0.5));
  }, [threshold]);

  const onTouchEnd = useCallback(async () => {
    const distance = pull;
    startYRef.current = null;
    setPull(0);
    if (distance >= threshold && !refreshing) {
      setRefreshing(true);
      try {
        await Promise.resolve(onRefresh());
      } finally {
        // Hold briefly so the user sees the indicator even if the refresh
        // was instantaneous.
        setTimeout(() => setRefreshing(false), 400);
      }
    }
  }, [pull, threshold, refreshing, onRefresh]);

  useEffect(() => {
    return () => {
      startYRef.current = null;
    };
  }, []);

  const bind = {
    onTouchStart,
    onTouchMove,
    onTouchEnd,
  };

  const progress = Math.min(1, pull / threshold);

  return { bind, pull, refreshing, progress };
}
