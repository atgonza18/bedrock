/**
 * Smart field-type inference.
 *
 * When a PM names a text field "Test date" — they probably meant a Date field.
 * This module spots those mismatches from the label text alone and returns a
 * suggested kind + human explanation, so the builder can surface a dismissible
 * chip that converts the field in one click.
 *
 * Never auto-switches the kind. The PM has final say; the chip is a nudge.
 */
import type {
  TemplateField,
  TemplateFieldKind,
} from "../../../convex/lib/customTemplates";

export type InferenceSuggestion = {
  kind: TemplateFieldKind;
  label: string; // "Make this a Date field"
  reason: string; // "Labels with 'date' typically use the Date picker"
};

/**
 * Given a field, return a single suggestion if the label strongly implies a
 * different kind. Priority: date → photo → passfail → number. Returns null
 * when the current kind already matches or no rule fires.
 */
export function inferSuggestion(field: TemplateField): InferenceSuggestion | null {
  if (field.kind === "heading" || field.kind === "table") return null;
  const label = (field.label ?? "").toLowerCase().trim();
  if (!label) return null;

  // Date first — narrow keyword match but high-conviction when it fires.
  if (field.kind !== "date" && /\b(date|scheduled|when|day)\b/.test(label)) {
    return {
      kind: "date",
      label: "Make this a Date field",
      reason: "Labels with “date” usually want the date picker",
    };
  }

  if (
    field.kind !== "photo" &&
    /\b(photo|photos|picture|pictures|image|images|snap)\b/.test(label)
  ) {
    return {
      kind: "photo",
      label: "Make this a Photo field",
      reason: "Labels that mention photos should use the uploader",
    };
  }

  if (
    field.kind !== "passfail" &&
    /\b(pass|fail|acceptable|within\s*spec|accept|reject)\b/.test(label)
  ) {
    return {
      kind: "passfail",
      label: "Make this a Pass/Fail field",
      reason: "Acceptance criteria read naturally as a three-state pill",
    };
  }

  if (
    field.kind !== "number" &&
    /\b(psi|pcf|mph|°f|°c|degrees|inch(es)?|count|qty|quantity|compaction|slump|strength|density|moisture|ratio|ph)\b/.test(
      label,
    )
  ) {
    return {
      kind: "number",
      label: "Make this a Number field",
      reason: "Numeric units detected in the label",
    };
  }

  if (
    field.kind !== "select" &&
    /\b(select|choose|type|category|status|method|grade|option)\b/.test(label) &&
    field.kind === "text"
  ) {
    return {
      kind: "select",
      label: "Switch to a Dropdown",
      reason: "Category-like labels are usually a fixed set of options",
    };
  }

  return null;
}

export function findDuplicateLabelIds(fields: TemplateField[]): Set<string> {
  const byLabel = new Map<string, string[]>();
  for (const f of fields) {
    if (f.kind === "heading") continue;
    const key = (f.label ?? "").trim().toLowerCase();
    if (!key) continue;
    const existing = byLabel.get(key) ?? [];
    existing.push(f.id);
    byLabel.set(key, existing);
  }
  const dupes = new Set<string>();
  for (const ids of byLabel.values()) {
    if (ids.length > 1) for (const id of ids) dupes.add(id);
  }
  return dupes;
}
