import { type ReactNode } from "react";

/**
 * Wraps page content with a subtle fade-in-up animation.
 * Use at the top level of each page component to give
 * navigation a smooth, premium feel.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  return <div className="animate-fade-in-up">{children}</div>;
}
