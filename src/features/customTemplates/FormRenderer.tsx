/**
 * Generic renderer for a custom test template.
 *
 * Used by:
 *   1. TemplateBuilder "Preview" mode (readOnly=false, onChange discards).
 *   2. Tech-facing custom report detail page (readOnly when status !== draft/rejected).
 *   3. Approver / viewer read-only rendering after submission.
 *
 * The renderer is intentionally dumb: given the field list + value map +
 * onChange, it renders inputs and calls onChange with the next value map.
 * Persistence, debounce, photo upload, validation UI — all owned by the
 * caller so this component stays portable between contexts.
 */
import { useState } from "react";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Plus, Trash2, Upload, X, Check, Minus } from "lucide-react";
import { VoiceInputButton } from "@/components/ui/voice-input-button";
import type {
  TemplateField,
  FieldValue,
  FieldValues,
  TableColumn,
} from "../../../convex/lib/customTemplates";
import {
  defaultValueForField,
} from "../../../convex/lib/customTemplates";

export type PhotoUrlMap = Record<
  string,
  Array<{ storageId: string; url: string | null }>
>;

/**
 * Mobile keyboard/autocomplete hints inferred from a text field's label.
 * Pops the right iOS/Android keyboard and applies sensible capitalization
 * without requiring the PM to configure anything in the template builder.
 */
function textFieldHints(label: string): {
  type?: string;
  inputMode?: "text" | "email" | "tel" | "decimal" | "numeric" | "search" | "url";
  autoComplete?: string;
  autoCapitalize?: "off" | "sentences" | "words" | "characters";
  autoCorrect?: "on" | "off";
  spellCheck?: boolean;
} {
  const l = (label || "").toLowerCase();
  if (/email/.test(l)) {
    return {
      type: "email",
      inputMode: "email",
      autoComplete: "email",
      autoCapitalize: "off",
      autoCorrect: "off",
      spellCheck: false,
    };
  }
  if (/phone|mobile|cell/.test(l)) {
    return {
      type: "tel",
      inputMode: "tel",
      autoComplete: "tel",
      autoCapitalize: "off",
      autoCorrect: "off",
      spellCheck: false,
    };
  }
  if (/\bzip\b|postal/.test(l)) {
    return {
      inputMode: "numeric",
      autoComplete: "postal-code",
      autoCapitalize: "characters",
    };
  }
  // Alphanumeric ID-style fields — use all-caps keyboard. Check BEFORE "name"
  // since "Project Name" / "Project Number" / "Sample ID" otherwise match
  // "name" → person-autocomplete, which is wrong.
  if (/\b(job|ticket|cylinder|truck|mix\s*design|serial)\s*(#|number|no\.?|id)?\b/.test(l)) {
    return {
      autoCapitalize: "characters",
      autoCorrect: "off",
      spellCheck: false,
    };
  }
  if (/\bproject\s*(#|number|no\.?|id)\b/.test(l)) {
    return {
      autoCapitalize: "characters",
      autoCorrect: "off",
      spellCheck: false,
    };
  }
  if (/\bsample\s*(#|number|no\.?|id)\b/.test(l)) {
    return {
      autoCapitalize: "characters",
      autoCorrect: "off",
      spellCheck: false,
    };
  }
  if (/\b(technician|inspector|approver|operator)\b/.test(l)) {
    return {
      autoComplete: "name",
      autoCapitalize: "words",
      autoCorrect: "off",
      spellCheck: false,
    };
  }
  if (/\bname\b/.test(l)) {
    // Project Name, Material Name, etc. — Title Case but no person-autocomplete.
    return {
      autoCapitalize: "words",
      autoCorrect: "off",
      spellCheck: false,
    };
  }
  return { autoCapitalize: "sentences", autoCorrect: "on", spellCheck: true };
}

export type FormRendererProps = {
  fields: TemplateField[];
  values: FieldValues;
  onChange: (next: FieldValues) => void;
  /** If set, all inputs are disabled. */
  readOnly?: boolean;
  /** Optional signed photo URLs by fieldId. If not set, photo fields show storageIds only. */
  photoUrls?: PhotoUrlMap;
  /** Upload handler for photo fields. Caller is responsible for Convex storage. */
  onUploadPhotos?: (fieldId: string, files: File[]) => Promise<void>;
  /** Remove-photo handler for photo fields. */
  onRemovePhoto?: (fieldId: string, storageId: string) => Promise<void>;
  /** Shown above the form when non-empty (validation errors etc). */
  errors?: string[];
};

export function FormRenderer({
  fields,
  values,
  onChange,
  readOnly,
  photoUrls,
  onUploadPhotos,
  onRemovePhoto,
  errors,
}: FormRendererProps) {
  const setValue = (fieldId: string, next: FieldValue) => {
    if (readOnly) return;
    onChange({ ...values, [fieldId]: next });
  };

  return (
    <div className="space-y-6">
      {errors && errors.length > 0 && (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3">
          <p className="text-xs font-medium uppercase tracking-wider text-destructive">
            Please resolve before submitting
          </p>
          <ul className="mt-1.5 list-disc pl-5 text-sm text-destructive">
            {errors.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      {fields.length === 0 && (
        <p className="text-sm text-muted-foreground italic">
          This template has no fields yet.
        </p>
      )}

      {fields.map((field) => {
        if (field.kind === "heading") {
          return <HeadingRow key={field.id} field={field} />;
        }
        const current =
          values[field.id] ??
          (defaultValueForField(field) as FieldValue);
        return (
          <FieldRow
            key={field.id}
            field={field}
            value={current}
            onChange={(v) => setValue(field.id, v)}
            readOnly={readOnly}
            photoUrls={photoUrls?.[field.id]}
            onUploadPhotos={
              onUploadPhotos
                ? (files) => onUploadPhotos(field.id, files)
                : undefined
            }
            onRemovePhoto={
              onRemovePhoto
                ? (sid) => onRemovePhoto(field.id, sid)
                : undefined
            }
          />
        );
      })}
    </div>
  );
}

function HeadingRow({
  field,
}: {
  field: Extract<TemplateField, { kind: "heading" }>;
}) {
  const Tag = field.level === 1 ? "h2" : "h3";
  return (
    <div className="border-b pb-1.5">
      <Tag
        className={cn(
          "font-heading tracking-tight",
          field.level === 1
            ? "text-lg font-semibold"
            : "text-sm font-semibold uppercase tracking-wider text-muted-foreground",
        )}
      >
        {field.text || "Section"}
      </Tag>
    </div>
  );
}

function FieldRow({
  field,
  value,
  onChange,
  readOnly,
  photoUrls,
  onUploadPhotos,
  onRemovePhoto,
}: {
  field: Exclude<TemplateField, { kind: "heading" }>;
  value: FieldValue;
  onChange: (next: FieldValue) => void;
  readOnly?: boolean;
  photoUrls?: Array<{ storageId: string; url: string | null }>;
  onUploadPhotos?: (files: File[]) => Promise<void>;
  onRemovePhoto?: (storageId: string) => Promise<void>;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline gap-2">
        <Label className="text-sm font-medium">
          {field.label}
          {field.required && <span className="text-destructive ml-0.5">*</span>}
        </Label>
      </div>
      {field.helpText && (
        <p className="text-xs text-muted-foreground">{field.helpText}</p>
      )}
      <FieldInput
        field={field}
        value={value}
        onChange={onChange}
        readOnly={readOnly}
        photoUrls={photoUrls}
        onUploadPhotos={onUploadPhotos}
        onRemovePhoto={onRemovePhoto}
      />
    </div>
  );
}

function FieldInput({
  field,
  value,
  onChange,
  readOnly,
  photoUrls,
  onUploadPhotos,
  onRemovePhoto,
}: {
  field: Exclude<TemplateField, { kind: "heading" }>;
  value: FieldValue;
  onChange: (next: FieldValue) => void;
  readOnly?: boolean;
  photoUrls?: Array<{ storageId: string; url: string | null }>;
  onUploadPhotos?: (files: File[]) => Promise<void>;
  onRemovePhoto?: (storageId: string) => Promise<void>;
}) {
  switch (field.kind) {
    case "text": {
      const v = value.kind === "text" ? value.value : "";
      const hints = textFieldHints(field.label);
      return (
        <Input
          value={v}
          placeholder={field.placeholder}
          onChange={(e) =>
            onChange({ kind: "text", value: e.target.value })
          }
          disabled={readOnly}
          {...hints}
        />
      );
    }
    case "textarea": {
      const v = value.kind === "textarea" ? value.value : "";
      return (
        <div className="flex gap-2 items-start">
          <Textarea
            value={v}
            placeholder={field.placeholder}
            rows={3}
            onChange={(e) =>
              onChange({ kind: "textarea", value: e.target.value })
            }
            disabled={readOnly}
            autoCapitalize="sentences"
            autoCorrect="on"
            spellCheck
            className="flex-1"
          />
          {!readOnly && (
            <VoiceInputButton
              onAppend={(chunk) => {
                const next = v ? `${v}${v.endsWith(" ") ? "" : " "}${chunk}` : chunk;
                onChange({ kind: "textarea", value: next });
              }}
              ariaLabel={`Dictate ${field.label}`}
            />
          )}
        </div>
      );
    }
    case "number": {
      const v = value.kind === "number" ? value.value : null;
      const isInteger = field.step !== undefined && field.step >= 1 && Number.isInteger(field.step);
      return (
        <div className="flex items-center gap-2">
          <Input
            type="number"
            value={v ?? ""}
            min={field.min}
            max={field.max}
            step={field.step ?? "any"}
            inputMode={isInteger ? "numeric" : "decimal"}
            autoComplete="off"
            onChange={(e) =>
              onChange({
                kind: "number",
                value: e.target.value === "" ? null : Number(e.target.value),
              })
            }
            disabled={readOnly}
            className="max-w-[200px]"
          />
          {field.unit && (
            <span className="text-sm text-muted-foreground">{field.unit}</span>
          )}
        </div>
      );
    }
    case "date": {
      const v = value.kind === "date" ? value.value : null;
      return (
        <Input
          type="date"
          value={v ? format(new Date(v), "yyyy-MM-dd") : ""}
          onChange={(e) =>
            onChange({
              kind: "date",
              value: e.target.value
                ? new Date(e.target.value).getTime()
                : null,
            })
          }
          disabled={readOnly}
          className="max-w-[200px]"
        />
      );
    }
    case "select": {
      const v = value.kind === "select" ? value.value : null;
      return (
        <Select
          value={v ?? ""}
          onValueChange={(next) =>
            onChange({ kind: "select", value: next || null })
          }
          disabled={readOnly}
        >
          <SelectTrigger className="max-w-[280px]">
            <SelectValue placeholder="Select…" />
          </SelectTrigger>
          <SelectContent>
            {field.options.map((o) => (
              <SelectItem key={o} value={o}>
                {o}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }
    case "checkbox": {
      const v = value.kind === "checkbox" ? value.value : false;
      return (
        <label className="inline-flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={v}
            onChange={(e) =>
              onChange({ kind: "checkbox", value: e.target.checked })
            }
            disabled={readOnly}
            className="size-4 accent-amber-brand"
          />
          <span className="text-sm text-muted-foreground">Yes</span>
        </label>
      );
    }
    case "passfail": {
      const v = value.kind === "passfail" ? value.value : null;
      return (
        <div className="space-y-1.5">
          <PassFailToggle
            value={v}
            onChange={(next) => onChange({ kind: "passfail", value: next })}
            disabled={readOnly}
          />
          {field.passCriterion && (
            <p className="text-xs text-muted-foreground italic">
              Pass criterion: {field.passCriterion}
            </p>
          )}
        </div>
      );
    }
    case "photo": {
      const storageIds = value.kind === "photo" ? value.storageIds : [];
      return (
        <PhotoField
          storageIds={storageIds}
          photoUrls={photoUrls}
          readOnly={readOnly}
          onUploadPhotos={onUploadPhotos}
          onRemovePhoto={onRemovePhoto}
        />
      );
    }
    case "table": {
      const rows = value.kind === "table" ? value.rows : [];
      return (
        <TableField
          columns={field.columns}
          rows={rows}
          onChange={(nextRows) =>
            onChange({ kind: "table", rows: nextRows })
          }
          readOnly={readOnly}
        />
      );
    }
  }
}

// ─── Pass / fail tri-state control ───────────────────────────────

function PassFailToggle({
  value,
  onChange,
  disabled,
}: {
  value: "pass" | "fail" | "na" | null;
  onChange: (v: "pass" | "fail" | "na") => void;
  disabled?: boolean;
}) {
  const options: Array<{
    key: "pass" | "fail" | "na";
    label: string;
    icon: React.ReactNode;
    activeClass: string;
  }> = [
    {
      key: "pass",
      label: "Pass",
      icon: <Check className="size-3.5" />,
      activeClass: "bg-emerald-600/10 border-emerald-600/40 text-emerald-700 dark:text-emerald-400",
    },
    {
      key: "fail",
      label: "Fail",
      icon: <X className="size-3.5" />,
      activeClass: "bg-destructive/10 border-destructive/40 text-destructive",
    },
    {
      key: "na",
      label: "N/A",
      icon: <Minus className="size-3.5" />,
      activeClass: "bg-muted border-border text-muted-foreground",
    },
  ];
  return (
    <div className="inline-flex items-center overflow-hidden rounded-sm border bg-background">
      {options.map((o, i) => {
        const active = value === o.key;
        return (
          <button
            key={o.key}
            type="button"
            disabled={disabled}
            onClick={() => onChange(o.key)}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors",
              i > 0 && "border-l",
              active ? o.activeClass : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
              disabled && "opacity-50 cursor-not-allowed",
            )}
          >
            {o.icon}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

// ─── Photo field ───────────────────────────────

function PhotoField({
  storageIds,
  photoUrls,
  readOnly,
  onUploadPhotos,
  onRemovePhoto,
}: {
  storageIds: string[];
  photoUrls?: Array<{ storageId: string; url: string | null }>;
  readOnly?: boolean;
  onUploadPhotos?: (files: File[]) => Promise<void>;
  onRemovePhoto?: (storageId: string) => Promise<void>;
}) {
  const [uploading, setUploading] = useState(false);

  // Build a URL map the renderer can use, falling back to ids when no URLs.
  const byId = new Map<string, string | null>(
    (photoUrls ?? []).map((p) => [p.storageId, p.url]),
  );

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {storageIds.length === 0 && (
          <p className="text-xs text-muted-foreground italic">No photos yet</p>
        )}
        {storageIds.map((sid) => {
          const url = byId.get(sid) ?? null;
          return (
            <div
              key={sid}
              className="relative group w-24 h-24 rounded-sm overflow-hidden border bg-muted"
            >
              {url ? (
                <img
                  src={url}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[10px] text-muted-foreground">
                  pending
                </div>
              )}
              {!readOnly && onRemovePhoto && (
                <button
                  type="button"
                  onClick={() => void onRemovePhoto(sid)}
                  className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity size-5 rounded-full bg-background/90 border flex items-center justify-center"
                >
                  <X className="size-3" />
                </button>
              )}
            </div>
          );
        })}
      </div>
      {!readOnly && onUploadPhotos && (
        <label
          className={cn(
            "inline-flex items-center gap-1.5 rounded-sm border border-dashed px-3 py-1.5 text-xs cursor-pointer",
            "hover:bg-muted/50 transition-colors",
            uploading && "opacity-50 cursor-wait",
          )}
        >
          <Upload className="size-3.5" />
          {uploading ? "Uploading…" : "Add photos"}
          <input
            type="file"
            multiple
            accept="image/*"
            className="hidden"
            onChange={async (e) => {
              const files = Array.from(e.target.files ?? []);
              if (files.length === 0) return;
              setUploading(true);
              try {
                await onUploadPhotos(files);
              } finally {
                setUploading(false);
                e.target.value = "";
              }
            }}
          />
        </label>
      )}
    </div>
  );
}

// ─── Repeating rows table ───────────────────────────────

function TableField({
  columns,
  rows,
  onChange,
  readOnly,
}: {
  columns: TableColumn[];
  rows: Array<Record<string, unknown>>;
  onChange: (next: Array<Record<string, unknown>>) => void;
  readOnly?: boolean;
}) {
  const addRow = () => {
    const fresh: Record<string, unknown> = {};
    for (const c of columns) {
      fresh[c.id] = c.kind === "checkbox" ? false : "";
    }
    onChange([...rows, fresh]);
  };
  const removeRow = (i: number) => {
    onChange(rows.filter((_, idx) => idx !== i));
  };
  const updateCell = (i: number, colId: string, next: unknown) => {
    const copy = [...rows];
    copy[i] = { ...copy[i], [colId]: next };
    onChange(copy);
  };

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto rounded-sm border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50 text-xs">
              {columns.map((c) => (
                <th
                  key={c.id}
                  className="px-2.5 py-2 text-left font-medium text-muted-foreground"
                >
                  {c.label}
                  {c.kind === "number" && "unit" in c && c.unit && (
                    <span className="ml-1 text-muted-foreground/60">
                      ({c.unit})
                    </span>
                  )}
                </th>
              ))}
              {!readOnly && <th className="w-10" />}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={columns.length + (readOnly ? 0 : 1)}
                  className="px-2.5 py-4 text-center text-xs text-muted-foreground italic"
                >
                  No rows yet
                </td>
              </tr>
            )}
            {rows.map((row, i) => (
              <tr key={i} className="border-b last:border-0">
                {columns.map((c) => (
                  <td key={c.id} className="px-1.5 py-1">
                    <TableCell
                      column={c}
                      value={row[c.id]}
                      onChange={(v) => updateCell(i, c.id, v)}
                      readOnly={readOnly}
                    />
                  </td>
                ))}
                {!readOnly && (
                  <td className="px-1.5 py-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => removeRow(i)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!readOnly && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addRow}
          className="h-7 rounded-sm text-xs"
        >
          <Plus className="size-3.5" />
          Add row
        </Button>
      )}
    </div>
  );
}

function TableCell({
  column,
  value,
  onChange,
  readOnly,
}: {
  column: TableColumn;
  value: unknown;
  onChange: (next: unknown) => void;
  readOnly?: boolean;
}) {
  switch (column.kind) {
    case "text":
      return (
        <Input
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          disabled={readOnly}
          className="h-8 rounded-sm border-transparent bg-transparent hover:border-border focus-visible:border-ring shadow-none"
        />
      );
    case "number":
      return (
        <Input
          type="number"
          value={(value as number | null) ?? ""}
          onChange={(e) =>
            onChange(e.target.value === "" ? null : Number(e.target.value))
          }
          disabled={readOnly}
          className="h-8 rounded-sm border-transparent bg-transparent hover:border-border focus-visible:border-ring shadow-none"
        />
      );
    case "date":
      return (
        <Input
          type="date"
          value={
            typeof value === "number" && value > 0
              ? format(new Date(value), "yyyy-MM-dd")
              : ""
          }
          onChange={(e) =>
            onChange(
              e.target.value ? new Date(e.target.value).getTime() : null,
            )
          }
          disabled={readOnly}
          className="h-8 rounded-sm border-transparent bg-transparent hover:border-border focus-visible:border-ring shadow-none"
        />
      );
    case "select":
      return (
        <Select
          value={(value as string) ?? ""}
          onValueChange={(v) => onChange(v)}
          disabled={readOnly}
        >
          <SelectTrigger className="h-8 rounded-sm border-transparent bg-transparent hover:border-border focus:border-ring shadow-none">
            <SelectValue placeholder="—" />
          </SelectTrigger>
          <SelectContent>
            {column.options.map((o) => (
              <SelectItem key={o} value={o}>
                {o}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    case "checkbox":
      return (
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={(e) => onChange(e.target.checked)}
          disabled={readOnly}
          className="size-4 accent-amber-brand"
        />
      );
    case "passfail": {
      const v = value as "pass" | "fail" | "na" | null;
      const label =
        v === "pass" ? "Pass" : v === "fail" ? "Fail" : v === "na" ? "N/A" : "—";
      const variant: React.ComponentProps<typeof Badge>["variant"] =
        v === "pass"
          ? "default"
          : v === "fail"
            ? "destructive"
            : v === "na"
              ? "secondary"
              : "outline";
      return (
        <Select
          value={v ?? ""}
          onValueChange={(next) => onChange(next || null)}
          disabled={readOnly}
        >
          <SelectTrigger className="h-8 w-[96px] rounded-sm border-transparent bg-transparent hover:border-border focus:border-ring shadow-none">
            <Badge variant={variant} className="text-[10px] uppercase">
              {label}
            </Badge>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pass">Pass</SelectItem>
            <SelectItem value="fail">Fail</SelectItem>
            <SelectItem value="na">N/A</SelectItem>
          </SelectContent>
        </Select>
      );
    }
  }
}
