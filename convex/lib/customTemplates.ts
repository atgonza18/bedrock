/**
 * Shared template-field definitions used by the custom test templates feature.
 *
 * Field shape lives here because:
 *  1. The backend validates incoming templates and responses server-side.
 *  2. The frontend needs the exact same types for the builder and renderer.
 *
 * We keep the types in /convex/lib so both sides can import them:
 *   - server: import from "./lib/customTemplates"
 *   - client: import from "../../convex/lib/customTemplates" (or via path alias)
 */

export type FieldId = string;

export type HeadingField = {
  kind: "heading";
  id: FieldId;
  text: string;
  level: 1 | 2;
};

type CommonFieldProps = {
  id: FieldId;
  label: string;
  helpText?: string;
  required?: boolean;
};

export type TextField = CommonFieldProps & {
  kind: "text";
  placeholder?: string;
};

export type TextAreaField = CommonFieldProps & {
  kind: "textarea";
  placeholder?: string;
};

export type NumberField = CommonFieldProps & {
  kind: "number";
  unit?: string;
  min?: number;
  max?: number;
  step?: number;
};

export type DateField = CommonFieldProps & {
  kind: "date";
};

export type SelectField = CommonFieldProps & {
  kind: "select";
  options: string[];
};

export type CheckboxField = CommonFieldProps & {
  kind: "checkbox";
};

export type PhotoField = CommonFieldProps & {
  kind: "photo";
  minCount?: number;
};

export type PassFailField = CommonFieldProps & {
  kind: "passfail";
  passCriterion?: string;
};

export type TableColumn =
  | { id: FieldId; kind: "text"; label: string }
  | { id: FieldId; kind: "number"; label: string; unit?: string }
  | { id: FieldId; kind: "date"; label: string }
  | { id: FieldId; kind: "select"; label: string; options: string[] }
  | { id: FieldId; kind: "checkbox"; label: string }
  | { id: FieldId; kind: "passfail"; label: string };

export type TableField = CommonFieldProps & {
  kind: "table";
  columns: TableColumn[];
  minRows?: number;
};

export type TemplateField =
  | HeadingField
  | TextField
  | TextAreaField
  | NumberField
  | DateField
  | SelectField
  | CheckboxField
  | PhotoField
  | PassFailField
  | TableField;

export type TemplateFieldKind = TemplateField["kind"];

export const FIELD_KINDS: TemplateFieldKind[] = [
  "heading",
  "text",
  "textarea",
  "number",
  "date",
  "select",
  "checkbox",
  "photo",
  "passfail",
  "table",
];

// ---------- Value shapes (what the tech submits) ----------

export type FieldValue =
  | { kind: "text"; value: string }
  | { kind: "textarea"; value: string }
  | { kind: "number"; value: number | null }
  | { kind: "date"; value: number | null } // unix ms
  | { kind: "select"; value: string | null }
  | { kind: "checkbox"; value: boolean }
  | { kind: "photo"; storageIds: string[] }
  | { kind: "passfail"; value: "pass" | "fail" | "na" | null }
  | { kind: "table"; rows: Array<Record<FieldId, unknown>> };

export type FieldValues = Record<FieldId, FieldValue>;

// ---------- Parsing & validation helpers ----------

/**
 * Parse the stored `fieldsJson` string into an array of TemplateFields.
 * Throws on malformed input so callers can surface a clean error.
 *
 * We run a lightweight shape check rather than a full zod/valibot schema —
 * the frontend builder is the source of truth and will always write valid
 * data; this is defense-in-depth for direct DB pokes.
 */
export function parseTemplateFields(fieldsJson: string): TemplateField[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(fieldsJson);
  } catch (e) {
    throw new Error("fieldsJson is not valid JSON");
  }
  if (!Array.isArray(parsed)) {
    throw new Error("fieldsJson must be an array");
  }
  for (const [i, f] of parsed.entries()) {
    if (!f || typeof f !== "object") {
      throw new Error(`Field ${i} is not an object`);
    }
    const field = f as Record<string, unknown>;
    if (typeof field.id !== "string" || field.id.length === 0) {
      throw new Error(`Field ${i} missing valid id`);
    }
    if (typeof field.kind !== "string" || !FIELD_KINDS.includes(field.kind as TemplateFieldKind)) {
      throw new Error(`Field ${i} has unknown kind: ${String(field.kind)}`);
    }
  }
  return parsed as TemplateField[];
}

export function stringifyTemplateFields(fields: TemplateField[]): string {
  return JSON.stringify(fields);
}

export function parseFieldValues(valuesJson: string): FieldValues {
  if (!valuesJson) return {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(valuesJson);
  } catch {
    return {};
  }
  if (!parsed || typeof parsed !== "object") return {};
  return parsed as FieldValues;
}

export function stringifyFieldValues(values: FieldValues): string {
  return JSON.stringify(values);
}

/**
 * Default value for a freshly-added field. Used both when the builder adds
 * a field (to seed its inspector) and when a tech opens a new response form.
 */
export function defaultValueForField(field: TemplateField): FieldValue | null {
  switch (field.kind) {
    case "heading":
      return null; // headings don't store values
    case "text":
    case "textarea":
      return { kind: field.kind, value: "" };
    case "number":
      return { kind: "number", value: null };
    case "date":
      return { kind: "date", value: null };
    case "select":
      return { kind: "select", value: null };
    case "checkbox":
      return { kind: "checkbox", value: false };
    case "photo":
      return { kind: "photo", storageIds: [] };
    case "passfail":
      return { kind: "passfail", value: null };
    case "table":
      return { kind: "table", rows: [] };
  }
}

/**
 * Pre-fill any text fields in a template whose labels look like "project name"
 * or "project number / job number" with the values from the passed-in project.
 * Used when a tech creates a draft from a custom template — avoids re-typing
 * data the system already knows. Other fields are left unset so the tech still
 * sees the default empty state.
 *
 * Match is case-insensitive and ignores non-alphanumeric chars so variants
 * like "Project #", "project_name", or "Job Number" all hit.
 */
export function seedProjectFieldValues(
  fieldsJson: string,
  project: { name?: string; jobNumber?: string } | null | undefined,
): string {
  if (!project) return "{}";
  let fields: TemplateField[];
  try {
    fields = parseTemplateFields(fieldsJson);
  } catch {
    return "{}";
  }
  const values: FieldValues = {};
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "");
  for (const f of fields) {
    if (f.kind !== "text" && f.kind !== "textarea") continue;
    const label = norm(f.label || "");
    if (!label) continue;
    if (label === "projectname" || label === "project") {
      if (project.name) values[f.id] = { kind: f.kind, value: project.name };
    } else if (
      label === "projectnumber" ||
      label === "projectno" ||
      label === "projectid" ||
      label === "jobnumber" ||
      label === "jobno" ||
      label === "jobid"
    ) {
      if (project.jobNumber)
        values[f.id] = { kind: f.kind, value: project.jobNumber };
    }
  }
  return stringifyFieldValues(values);
}

/**
 * Validate that a set of values satisfies a template's required-field rules.
 * Returns a list of human-readable issues (empty = ok).
 */
export function validateValues(
  fields: TemplateField[],
  values: FieldValues,
): string[] {
  const issues: string[] = [];
  for (const f of fields) {
    if (f.kind === "heading") continue;
    if (!f.required) continue;
    const v = values[f.id];
    if (!v) {
      issues.push(`${f.label} is required`);
      continue;
    }
    switch (v.kind) {
      case "text":
      case "textarea":
        if (!v.value.trim()) issues.push(`${f.label} is required`);
        break;
      case "number":
        if (v.value === null || Number.isNaN(v.value))
          issues.push(`${f.label} is required`);
        break;
      case "date":
        if (v.value === null) issues.push(`${f.label} is required`);
        break;
      case "select":
      case "passfail":
        if (!v.value) issues.push(`${f.label} is required`);
        break;
      case "checkbox":
        if (!v.value) issues.push(`${f.label} must be checked`);
        break;
      case "photo": {
        const min =
          f.kind === "photo" && f.minCount !== undefined ? f.minCount : 1;
        if (v.storageIds.length < min)
          issues.push(
            `${f.label} needs at least ${min} photo${min === 1 ? "" : "s"}`,
          );
        break;
      }
      case "table":
        if (v.rows.length === 0)
          issues.push(`${f.label} needs at least one row`);
        break;
    }
  }
  return issues;
}
