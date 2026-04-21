import { type ReactNode } from "react";

/**
 * Wraps a page with a snappy enter animation (180ms).
 * Set `stagger` to cascade the animation across direct children
 * (+40ms each, ~first 5 children). Respects prefers-reduced-motion.
 */
export function PageTransition({
  children,
  stagger,
}: {
  children: ReactNode;
  stagger?: boolean;
}) {
  if (stagger) {
    return <div data-stagger>{children}</div>;
  }
  return <div className="animate-fade-in-up">{children}</div>;
}
