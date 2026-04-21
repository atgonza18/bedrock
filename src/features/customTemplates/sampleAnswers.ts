/**
 * Fills a template with plausible sample values for the Preview pane.
 *
 * The preview is MUCH more useful when it doesn't look empty — execs checking
 * a template want to see "this is what the filled-out form will look like on
 * a tech's phone", not a blank skeleton. We derive sample values from field
 * labels (so "slump" gets a slump-like number, "mix design" gets a plausible
 * mix code) and fall back to generic defaults when we have no better guess.
 */
import type {
  FieldValues,
  TemplateField,
  FieldValue,
  TableColumn,
} from "../../../convex/lib/customTemplates";

export function buildSampleValues(fields: TemplateField[]): FieldValues {
  const out: FieldValues = {};
  for (const f of fields) {
    if (f.kind === "heading") continue;
    out[f.id] = sampleFor(f);
  }
  return out;
}

function sampleFor(f: Exclude<TemplateField, { kind: "heading" }>): FieldValue {
  const label = (f.label ?? "").toLowerCase();

  switch (f.kind) {
    case "text":
      return { kind: "text", value: sampleForTextLabel(label) };
    case "textarea":
      return {
        kind: "textarea",
        value:
          label.includes("note") || label.includes("description")
            ? "All observed conditions within expected tolerance. No action required."
            : "Sample entry for preview.",
      };
    case "number":
      return { kind: "number", value: sampleForNumberLabel(label, f.unit) };
    case "date":
      return { kind: "date", value: Date.now() };
    case "select":
      return { kind: "select", value: f.options[0] ?? null };
    case "checkbox":
      return { kind: "checkbox", value: true };
    case "passfail":
      return { kind: "passfail", value: "pass" };
    case "photo":
      return { kind: "photo", storageIds: [] };
    case "table":
      return { kind: "table", rows: sampleTableRows(f.columns) };
  }
}

function sampleForTextLabel(label: string): string {
  if (label.includes("mix")) return "C-4000A";
  if (label.includes("station")) return "14+25";
  if (label.includes("lot") || label.includes("area")) return "North fill, Lot 3";
  if (label.includes("location") || label.includes("grid")) return "Grid B4";
  if (label.includes("ticket")) return "TKT-00421";
  if (label.includes("number") || label.includes("#")) return "00183";
  return "Sample";
}

function sampleForNumberLabel(label: string, unit?: string): number {
  if (label.includes("slump")) return 4.5;
  if (label.includes("air")) return 5.5;
  if (label.includes("temp")) return label.includes("ambient") ? 72 : 68;
  if (label.includes("compaction")) return 97.2;
  if (label.includes("moisture")) return 9.4;
  if (label.includes("dry") && label.includes("density")) return 118.4;
  if (label.includes("mdd")) return 121.0;
  if (label.includes("omc")) return 10.2;
  if (label.includes("depth")) return 6;
  if (label.includes("strength") || unit === "psi") return 4125;
  if (unit === "%") return 95;
  if (unit === "°F") return 72;
  return 12.5;
}

function sampleTableRows(columns: TableColumn[]): Array<Record<string, unknown>> {
  // Three rows feel "filled" without overwhelming the preview.
  return [0, 1, 2].map((rowIdx) => {
    const row: Record<string, unknown> = {};
    for (const c of columns) {
      switch (c.kind) {
        case "text":
          row[c.id] = `${sampleForTextLabel(c.label.toLowerCase())} ${rowIdx + 1}`;
          break;
        case "number": {
          const base = sampleForNumberLabel(c.label.toLowerCase(), c.unit);
          row[c.id] = Number((base + rowIdx * 0.6).toFixed(1));
          break;
        }
        case "date":
          row[c.id] = Date.now() - rowIdx * 86_400_000;
          break;
        case "select":
          row[c.id] = c.options?.[0] ?? "";
          break;
        case "checkbox":
          row[c.id] = rowIdx % 2 === 0;
          break;
        case "passfail":
          row[c.id] = rowIdx === 2 ? "fail" : "pass";
          break;
      }
    }
    return row;
  });
}
