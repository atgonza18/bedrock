/**
 * Default seed values for freshly-added fields in the builder.
 * Kept separate from the backend validator so the builder can tune builder-only
 * starting text without touching the server-side types.
 */
import type {
  TemplateField,
  TemplateFieldKind,
} from "../../../convex/lib/customTemplates";

export function freshFieldId(prefix = "f"): string {
  // Short, URL-safe, unique-enough for local ordering. Not a security id.
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;
}

export function newField(kind: TemplateFieldKind): TemplateField {
  const id = freshFieldId();
  switch (kind) {
    case "heading":
      return { kind: "heading", id, text: "Section", level: 1 };
    case "text":
      return { kind: "text", id, label: "Label", required: false };
    case "textarea":
      return { kind: "textarea", id, label: "Notes", required: false };
    case "number":
      return { kind: "number", id, label: "Value", required: false };
    case "date":
      return { kind: "date", id, label: "Date", required: false };
    case "select":
      return {
        kind: "select",
        id,
        label: "Choice",
        options: ["Option A", "Option B"],
        required: false,
      };
    case "checkbox":
      return { kind: "checkbox", id, label: "Confirm", required: false };
    case "photo":
      return { kind: "photo", id, label: "Photos", required: false };
    case "passfail":
      return { kind: "passfail", id, label: "Result", required: false };
    case "table":
      return {
        kind: "table",
        id,
        label: "Readings",
        columns: [
          { id: freshFieldId("c"), kind: "text", label: "Location" },
          { id: freshFieldId("c"), kind: "number", label: "Value" },
        ],
        required: false,
      };
  }
}

export const FIELD_PALETTE: Array<{
  kind: TemplateFieldKind;
  label: string;
  hint: string;
}> = [
  { kind: "heading", label: "Heading", hint: "Section divider / label" },
  { kind: "text", label: "Short text", hint: "Single-line input" },
  { kind: "textarea", label: "Paragraph", hint: "Multi-line notes" },
  { kind: "number", label: "Number", hint: "Numeric with optional unit" },
  { kind: "date", label: "Date", hint: "Date picker" },
  { kind: "select", label: "Dropdown", hint: "Pick one of several options" },
  { kind: "checkbox", label: "Checkbox", hint: "Yes / no confirmation" },
  { kind: "passfail", label: "Pass / fail", hint: "Pass · Fail · N/A" },
  { kind: "photo", label: "Photos", hint: "Upload one or more images" },
  { kind: "table", label: "Readings table", hint: "Repeating rows of values" },
];
