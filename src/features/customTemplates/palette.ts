/**
 * Per-field-type accent colors. Drives the palette chip, the canvas card
 * left-border, the preview badge, and the inspector header tint.
 *
 * We use OKLCH values that hold up well in both light and dark modes — same
 * hue family, slightly different lightness per mode handled by CSS vars.
 * The "bg" is a subtle tint, "fg" is the icon/label, "border" is a 10-20%
 * tint of the accent, "glow" is the soft ring shown when selected.
 */
import type { TemplateFieldKind } from "../../../convex/lib/customTemplates";

export type FieldAccent = {
  label: string;
  bgClass: string;
  fgClass: string;
  borderClass: string;
  glowClass: string;
};

export const FIELD_ACCENTS: Record<TemplateFieldKind, FieldAccent> = {
  heading: {
    label: "Heading",
    bgClass: "bg-slate-100 dark:bg-slate-800/60",
    fgClass: "text-slate-700 dark:text-slate-300",
    borderClass: "border-l-slate-400/70 dark:border-l-slate-500/70",
    glowClass: "ring-slate-400/30",
  },
  text: {
    label: "Short text",
    bgClass: "bg-sky-100 dark:bg-sky-900/40",
    fgClass: "text-sky-700 dark:text-sky-300",
    borderClass: "border-l-sky-500",
    glowClass: "ring-sky-500/30",
  },
  textarea: {
    label: "Paragraph",
    bgClass: "bg-indigo-100 dark:bg-indigo-900/40",
    fgClass: "text-indigo-700 dark:text-indigo-300",
    borderClass: "border-l-indigo-500",
    glowClass: "ring-indigo-500/30",
  },
  number: {
    label: "Number",
    bgClass: "bg-emerald-100 dark:bg-emerald-900/40",
    fgClass: "text-emerald-700 dark:text-emerald-300",
    borderClass: "border-l-emerald-500",
    glowClass: "ring-emerald-500/30",
  },
  date: {
    label: "Date",
    bgClass: "bg-violet-100 dark:bg-violet-900/40",
    fgClass: "text-violet-700 dark:text-violet-300",
    borderClass: "border-l-violet-500",
    glowClass: "ring-violet-500/30",
  },
  select: {
    label: "Dropdown",
    bgClass: "bg-amber-brand/15",
    fgClass: "text-amber-700 dark:text-amber-400",
    borderClass: "border-l-amber-brand",
    glowClass: "ring-amber-brand/40",
  },
  checkbox: {
    label: "Checkbox",
    bgClass: "bg-cyan-100 dark:bg-cyan-900/40",
    fgClass: "text-cyan-700 dark:text-cyan-300",
    borderClass: "border-l-cyan-500",
    glowClass: "ring-cyan-500/30",
  },
  photo: {
    label: "Photos",
    bgClass: "bg-rose-100 dark:bg-rose-900/40",
    fgClass: "text-rose-700 dark:text-rose-300",
    borderClass: "border-l-rose-500",
    glowClass: "ring-rose-500/30",
  },
  passfail: {
    label: "Pass / fail",
    bgClass: "bg-orange-100 dark:bg-orange-900/40",
    fgClass: "text-orange-700 dark:text-orange-300",
    borderClass: "border-l-orange-500",
    glowClass: "ring-orange-500/30",
  },
  table: {
    label: "Readings table",
    bgClass: "bg-teal-100 dark:bg-teal-900/40",
    fgClass: "text-teal-700 dark:text-teal-300",
    borderClass: "border-l-teal-500",
    glowClass: "ring-teal-500/30",
  },
};
