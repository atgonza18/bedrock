import { SVGProps } from "react";
import { cn } from "@/lib/utils";

/**
 * Bedrock brand mark — a two-peak mountain silhouette drawn as a single path.
 * Uses currentColor so it picks up whatever foreground color the parent sets.
 * Works at any size from 14px favicon up to hero scale.
 */
export function BedrockMark({ className, ...rest }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...rest}
    >
      <path d="M3.2 19.5 L9 10.8 L12 13.8 L16 7.5 L20.8 19.5 Z" />
    </svg>
  );
}

/**
 * Full lockup: mark in a contained square + wordmark. Used in nav surfaces.
 *
 * `variant="light"` = white wordmark on dark chip (for dark sidebars).
 * `variant="dark"` = dark chip + dark wordmark (for light surfaces).
 */
export function BedrockLogo({
  variant = "dark",
  size = "md",
  markOnly,
  className,
}: {
  variant?: "light" | "dark";
  size?: "sm" | "md" | "lg";
  markOnly?: boolean;
  className?: string;
}) {
  const sizeMap = {
    sm: { chip: "size-6", mark: "size-3.5", text: "text-sm" },
    md: { chip: "size-8", mark: "size-4", text: "text-base" },
    lg: { chip: "size-10", mark: "size-5", text: "text-lg" },
  };
  const s = sizeMap[size];

  const chipStyles =
    variant === "light"
      ? "bg-sidebar-foreground text-sidebar"
      : "bg-foreground text-background";
  const textStyles =
    variant === "light" ? "text-sidebar-foreground" : "text-foreground";

  return (
    <span
      className={cn("inline-flex items-center gap-2", className)}
      aria-label="Bedrock"
    >
      <span
        className={cn(
          "flex items-center justify-center rounded-md",
          s.chip,
          chipStyles,
        )}
      >
        <BedrockMark className={s.mark} aria-hidden />
      </span>
      {!markOnly && (
        <span
          className={cn(
            "font-heading font-bold tracking-tight",
            s.text,
            textStyles,
          )}
        >
          Bedrock
        </span>
      )}
    </span>
  );
}
