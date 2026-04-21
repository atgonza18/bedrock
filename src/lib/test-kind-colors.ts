/**
 * Per-test-type accent colors. Each kind gets a signature hue so that color
 * becomes information — a PM scanning the queue sees emerald and knows it's
 * a nuclear density report before reading the label.
 *
 * Hues picked for maximum distinguishability in oklch and for legibility on
 * both the warm-stone light theme and the slate dark theme.
 *
 * Used by: kind icons, volume-by-type chart, kind chips on report cards.
 */
export type TestKind =
  | "concrete_field"
  | "nuclear_density"
  | "proof_roll"
  | "dcp"
  | "pile_load";

export type KindColor = {
  /** Stand-alone hex (used in @react-pdf and inline styles). */
  hex: string;
  /** CSS oklch literal (used in Tailwind arbitrary values). */
  oklch: string;
  /** Short human label, mostly for legend. */
  label: string;
};

export const KIND_COLORS: Record<TestKind, KindColor> = {
  concrete_field: {
    hex: "#c89340",
    oklch: "oklch(0.72 0.14 75)",
    label: "Amber",
  },
  nuclear_density: {
    hex: "#2b9f79",
    oklch: "oklch(0.65 0.12 165)",
    label: "Emerald",
  },
  proof_roll: {
    hex: "#3b7ecc",
    oklch: "oklch(0.60 0.13 245)",
    label: "Sky",
  },
  dcp: {
    hex: "#8354c3",
    oklch: "oklch(0.55 0.15 290)",
    label: "Violet",
  },
  pile_load: {
    hex: "#c94a5f",
    oklch: "oklch(0.60 0.16 15)",
    label: "Rose",
  },
};

/** Safe lookup that returns a neutral fallback for unknown kinds. */
export function kindColor(kind: string): KindColor {
  return (
    KIND_COLORS[kind as TestKind] ?? {
      hex: "#8a8a8a",
      oklch: "oklch(0.55 0 0)",
      label: "Neutral",
    }
  );
}
