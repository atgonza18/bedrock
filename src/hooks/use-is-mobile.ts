import { useEffect, useState } from "react";

/**
 * Matches any viewport narrower than Tailwind's `md` breakpoint (768px).
 * Used to decide whether to render mobile-first UI variants (bottom nav,
 * template-builder gate, etc).
 */
export function useIsMobile(breakpointPx = 768): boolean {
  const [matches, setMatches] = useState(() =>
    typeof window === "undefined"
      ? false
      : window.matchMedia(`(max-width: ${breakpointPx - 1}px)`).matches,
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia(`(max-width: ${breakpointPx - 1}px)`);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    // Safari <14 uses addListener; everything else addEventListener.
    if (mq.addEventListener) {
      mq.addEventListener("change", handler);
      return () => mq.removeEventListener("change", handler);
    }
    mq.addListener(handler);
    return () => mq.removeListener(handler);
  }, [breakpointPx]);

  return matches;
}
