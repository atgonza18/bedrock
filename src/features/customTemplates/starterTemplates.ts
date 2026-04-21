/**
 * Curated starter templates shown on the "New template" gallery.
 *
 * Each entry produces a filled-out field list a PM can use as-is or fork.
 * The ids are stable within the file (they're deterministic random-looking
 * strings) so the builder's dedup/ordering logic behaves predictably when
 * the same starter is imported multiple times and forked.
 *
 * Adding a new starter: keep it ≤8 fields, cover one end-to-end test scenario,
 * and reuse field kinds that exercise the builder (at least one passfail or
 * table field is ideal so the preview looks substantial).
 */
import type { TemplateField } from "../../../convex/lib/customTemplates";

export type StarterTemplate = {
  slug: string;
  name: string;
  description: string;
  accent: "amber" | "sky" | "emerald" | "rose" | "violet" | "teal";
  icon: string; // short emoji / unicode glyph shown in the gallery card
  fields: TemplateField[];
};

// Short deterministic-looking ids keep the starter data readable without
// colliding across templates (different prefixes per template).
const F = (prefix: string, i: number) => `f_${prefix}${i}`;
const C = (prefix: string, i: number) => `c_${prefix}${i}`;

export const STARTER_TEMPLATES: StarterTemplate[] = [
  {
    slug: "blank",
    name: "Blank template",
    description: "Start from scratch with no fields.",
    accent: "amber",
    icon: "✦",
    fields: [],
  },
  {
    slug: "concrete-slump",
    name: "Concrete slump quick check",
    description: "Slump, air, temp, plus a pass/fail gate and photo.",
    accent: "sky",
    icon: "⬢",
    fields: [
      { kind: "heading", id: F("cs", 1), text: "Concrete Placement", level: 1 },
      {
        kind: "text",
        id: F("cs", 2),
        label: "Mix design #",
        required: true,
        placeholder: "e.g. C-4000A",
      },
      {
        kind: "number",
        id: F("cs", 3),
        label: "Slump",
        required: true,
        unit: "in",
        min: 0,
        max: 10,
      },
      {
        kind: "number",
        id: F("cs", 4),
        label: "Air content",
        required: true,
        unit: "%",
        min: 0,
        max: 12,
      },
      { kind: "number", id: F("cs", 5), label: "Concrete temp", unit: "°F" },
      {
        kind: "passfail",
        id: F("cs", 6),
        label: "Within spec",
        passCriterion: "Slump ≤ 5 in, Air 4–8%",
      },
      {
        kind: "photo",
        id: F("cs", 7),
        label: "Placement photos",
        required: true,
        minCount: 1,
      },
    ],
  },
  {
    slug: "daily-safety",
    name: "Daily safety walk",
    description: "Morning site walk — hazards, PPE, sign-off.",
    accent: "rose",
    icon: "◉",
    fields: [
      { kind: "heading", id: F("ds", 1), text: "Site Safety Walk", level: 1 },
      { kind: "date", id: F("ds", 2), label: "Walk date", required: true },
      {
        kind: "select",
        id: F("ds", 3),
        label: "Weather",
        options: ["Clear", "Overcast", "Rain", "Snow", "Wind"],
      },
      {
        kind: "checkbox",
        id: F("ds", 4),
        label: "All workers wearing required PPE",
      },
      {
        kind: "checkbox",
        id: F("ds", 5),
        label: "Fall-protection points inspected",
      },
      {
        kind: "textarea",
        id: F("ds", 6),
        label: "Hazards observed",
        placeholder: "Location + description",
      },
      {
        kind: "photo",
        id: F("ds", 7),
        label: "Site photos",
      },
    ],
  },
  {
    slug: "density-readings",
    name: "Nuclear density (5 readings)",
    description: "Repeating table with station, depth, moisture, compaction.",
    accent: "emerald",
    icon: "▲",
    fields: [
      { kind: "heading", id: F("nd", 1), text: "Nuclear Density Test", level: 1 },
      { kind: "text", id: F("nd", 2), label: "Lot / area", required: true },
      {
        kind: "number",
        id: F("nd", 3),
        label: "Max dry density (MDD)",
        unit: "pcf",
      },
      {
        kind: "number",
        id: F("nd", 4),
        label: "Optimum moisture (OMC)",
        unit: "%",
      },
      {
        kind: "table",
        id: F("nd", 5),
        label: "Readings",
        required: true,
        columns: [
          { id: C("nd", 1), kind: "text", label: "Station" },
          { id: C("nd", 2), kind: "number", label: "Depth", unit: "in" },
          { id: C("nd", 3), kind: "number", label: "Moisture", unit: "%" },
          { id: C("nd", 4), kind: "number", label: "Dry density", unit: "pcf" },
          { id: C("nd", 5), kind: "number", label: "Compaction", unit: "%" },
          { id: C("nd", 6), kind: "passfail", label: "Result" },
        ],
      },
      { kind: "photo", id: F("nd", 6), label: "Field photos" },
    ],
  },
  {
    slug: "punch-item",
    name: "Inspector punch item",
    description: "One-issue punchlist entry with severity + recommendation.",
    accent: "violet",
    icon: "◆",
    fields: [
      { kind: "heading", id: F("pi", 1), text: "Punch Item", level: 1 },
      { kind: "text", id: F("pi", 2), label: "Location / grid", required: true },
      {
        kind: "select",
        id: F("pi", 3),
        label: "Severity",
        required: true,
        options: ["Low", "Medium", "High", "Critical"],
      },
      {
        kind: "textarea",
        id: F("pi", 4),
        label: "Issue description",
        required: true,
      },
      {
        kind: "textarea",
        id: F("pi", 5),
        label: "Recommended action",
      },
      { kind: "photo", id: F("pi", 6), label: "Photos", required: true, minCount: 1 },
    ],
  },
  {
    slug: "pre-pour-checklist",
    name: "Pre-pour concrete checklist",
    description: "Formwork, rebar, embedments pass/fail checklist.",
    accent: "teal",
    icon: "▣",
    fields: [
      { kind: "heading", id: F("pp", 1), text: "Pre-Pour Checklist", level: 1 },
      { kind: "text", id: F("pp", 2), label: "Pour location", required: true },
      { kind: "date", id: F("pp", 3), label: "Scheduled pour", required: true },
      {
        kind: "passfail",
        id: F("pp", 4),
        label: "Formwork braced and aligned",
      },
      { kind: "passfail", id: F("pp", 5), label: "Rebar size & spacing verified" },
      { kind: "passfail", id: F("pp", 6), label: "Clearance / cover verified" },
      { kind: "passfail", id: F("pp", 7), label: "Embeds set and tied" },
      { kind: "textarea", id: F("pp", 8), label: "Notes" },
      { kind: "photo", id: F("pp", 9), label: "Pre-pour photos", minCount: 2 },
    ],
  },
];
