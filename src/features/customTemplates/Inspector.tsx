/**
 * Inspector — the right pane. Shows settings for the currently-selected field.
 *
 * Most of the logic is straightforward: per-field-kind editors. The interesting
 * bits are:
 *   1. A "smart swap" banner at the top when the label implies a different
 *      kind (click to apply; dismisses on next label change).
 *   2. Column editor for table fields (sub-form of sub-forms).
 *   3. An empty state that nudges the user toward the canvas.
 */
import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, X, Sparkles, Wand2 } from "lucide-react";
import type {
  TemplateField,
  TemplateFieldKind,
  TableColumn,
} from "../../../convex/lib/customTemplates";
import { freshFieldId } from "./fieldDefaults";
import { inferSuggestion } from "./smartInference";
import { FIELD_ACCENTS } from "./palette";

export type InspectorProps = {
  field: TemplateField | null;
  onChange: (patch: Partial<TemplateField>) => void;
  onApplyInference: (kind: TemplateFieldKind) => void;
};

export function Inspector({ field, onChange, onApplyInference }: InspectorProps) {
  if (!field) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-4 py-10 text-center">
        <div className="size-10 rounded-full bg-muted border flex items-center justify-center mb-3">
          <Wand2 className="size-4 text-muted-foreground" />
        </div>
        <p className="text-xs text-muted-foreground max-w-xs">
          Select a field on the canvas to edit its label, help text, and options here.
        </p>
      </div>
    );
  }

  const accent = FIELD_ACCENTS[field.kind];
  const suggestion = useMemo(() => inferSuggestion(field), [field]);

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div
        className={cn(
          "px-3 py-2 border-b flex items-center gap-2",
          accent.bgClass,
        )}
      >
        <span
          className={cn(
            "text-[10px] uppercase tracking-wider font-semibold",
            accent.fgClass,
          )}
        >
          {accent.label}
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {suggestion && (
          <button
            type="button"
            onClick={() => onApplyInference(suggestion.kind)}
            className={cn(
              "w-full flex items-start gap-2 rounded-md border border-amber-brand/40 bg-amber-brand/10 px-2.5 py-2 text-left hover:bg-amber-brand/15 transition-colors",
            )}
          >
            <Sparkles className="size-3.5 mt-0.5 text-amber-brand shrink-0" />
            <span className="min-w-0">
              <span className="block text-xs font-medium text-foreground">
                {suggestion.label}
              </span>
              <span className="block text-[11px] text-muted-foreground">
                {suggestion.reason}
              </span>
            </span>
          </button>
        )}

        {field.kind === "heading" ? (
          <HeadingEditor
            field={field as Extract<TemplateField, { kind: "heading" }>}
            onChange={onChange}
          />
        ) : (
          <GeneralEditor field={field} onChange={onChange} />
        )}
      </div>
    </div>
  );
}

function HeadingEditor({
  field,
  onChange,
}: {
  field: Extract<TemplateField, { kind: "heading" }>;
  onChange: (patch: Partial<TemplateField>) => void;
}) {
  return (
    <>
      <InspectorLabel>Text</InspectorLabel>
      <Input
        value={field.text}
        onChange={(e) => onChange({ text: e.target.value } as any)}
      />
      <InspectorLabel>Level</InspectorLabel>
      <Select
        value={String(field.level)}
        onValueChange={(v) => onChange({ level: Number(v) as 1 | 2 } as any)}
      >
        <SelectTrigger className="rounded-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="1">Section (collapsible)</SelectItem>
          <SelectItem value="2">Subsection (small caps)</SelectItem>
        </SelectContent>
      </Select>
    </>
  );
}

function GeneralEditor({
  field,
  onChange,
}: {
  field: Exclude<TemplateField, { kind: "heading" }>;
  onChange: (patch: Partial<TemplateField>) => void;
}) {
  return (
    <>
      <InspectorLabel>Label</InspectorLabel>
      <Input
        value={field.label}
        onChange={(e) => onChange({ label: e.target.value } as any)}
      />

      <InspectorLabel optional>Help text</InspectorLabel>
      <Textarea
        value={field.helpText ?? ""}
        onChange={(e) =>
          onChange({ helpText: e.target.value || undefined } as any)
        }
        placeholder="Shown below the label"
        rows={2}
        className="resize-none"
      />

      <label className="flex items-center gap-2 cursor-pointer pt-1">
        <input
          type="checkbox"
          className="size-4 accent-amber-brand"
          checked={field.required ?? false}
          onChange={(e) => onChange({ required: e.target.checked } as any)}
        />
        <span className="text-sm">Required</span>
      </label>

      {(field.kind === "text" || field.kind === "textarea") && (
        <>
          <InspectorLabel optional>Placeholder</InspectorLabel>
          <Input
            value={field.placeholder ?? ""}
            onChange={(e) =>
              onChange({ placeholder: e.target.value || undefined } as any)
            }
          />
        </>
      )}

      {field.kind === "number" && (
        <>
          <InspectorLabel optional>Unit</InspectorLabel>
          <Input
            value={field.unit ?? ""}
            onChange={(e) =>
              onChange({ unit: e.target.value || undefined } as any)
            }
            placeholder="psi, °F, in…"
          />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <InspectorLabel optional>Min</InspectorLabel>
              <Input
                type="number"
                value={field.min ?? ""}
                onChange={(e) =>
                  onChange({
                    min: e.target.value === "" ? undefined : Number(e.target.value),
                  } as any)
                }
              />
            </div>
            <div>
              <InspectorLabel optional>Max</InspectorLabel>
              <Input
                type="number"
                value={field.max ?? ""}
                onChange={(e) =>
                  onChange({
                    max: e.target.value === "" ? undefined : Number(e.target.value),
                  } as any)
                }
              />
            </div>
          </div>
        </>
      )}

      {field.kind === "select" && (
        <>
          <InspectorLabel>Options</InspectorLabel>
          <OptionEditor
            options={field.options}
            onChange={(opts) => onChange({ options: opts } as any)}
          />
        </>
      )}

      {field.kind === "passfail" && (
        <>
          <InspectorLabel optional>Pass criterion</InspectorLabel>
          <Textarea
            value={field.passCriterion ?? ""}
            onChange={(e) =>
              onChange({ passCriterion: e.target.value || undefined } as any)
            }
            placeholder="e.g. ≥ 95% compaction"
            rows={2}
            className="resize-none"
          />
        </>
      )}

      {field.kind === "photo" && (
        <>
          <InspectorLabel optional>Minimum photo count</InspectorLabel>
          <Input
            type="number"
            min="0"
            value={field.minCount ?? ""}
            onChange={(e) =>
              onChange({
                minCount: e.target.value === "" ? undefined : Number(e.target.value),
              } as any)
            }
            placeholder="0 = no minimum"
          />
        </>
      )}

      {field.kind === "table" && (
        <>
          <InspectorLabel>Columns</InspectorLabel>
          <ColumnEditor
            columns={field.columns}
            onChange={(cols) => onChange({ columns: cols } as any)}
          />
        </>
      )}
    </>
  );
}

function InspectorLabel({
  children,
  optional,
}: {
  children: React.ReactNode;
  optional?: boolean;
}) {
  return (
    <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
      {children}
      {optional && (
        <span className="text-muted-foreground/60 font-normal normal-case tracking-normal ml-1.5">
          Optional
        </span>
      )}
    </Label>
  );
}

function OptionEditor({
  options,
  onChange,
}: {
  options: string[];
  onChange: (next: string[]) => void;
}) {
  const update = (i: number, v: string) => {
    const next = [...options];
    next[i] = v;
    onChange(next);
  };
  const remove = (i: number) => onChange(options.filter((_, idx) => idx !== i));
  const add = () => onChange([...options, ""]);
  return (
    <div className="space-y-1.5">
      {options.map((o, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <Input value={o} onChange={(e) => update(i, e.target.value)} />
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => remove(i)}
            className="text-muted-foreground hover:text-destructive"
          >
            <X className="size-3.5" />
          </Button>
        </div>
      ))}
      <Button
        variant="outline"
        size="sm"
        onClick={add}
        className="h-7 rounded-sm text-xs w-full"
      >
        <Plus className="size-3.5" />
        Add option
      </Button>
    </div>
  );
}

function ColumnEditor({
  columns,
  onChange,
}: {
  columns: TableColumn[];
  onChange: (next: TableColumn[]) => void;
}) {
  const update = (i: number, patch: Partial<TableColumn>) => {
    const next = [...columns];
    next[i] = { ...next[i], ...patch } as TableColumn;
    onChange(next);
  };
  const remove = (i: number) => onChange(columns.filter((_, idx) => idx !== i));
  const add = () =>
    onChange([
      ...columns,
      { id: freshFieldId("c"), kind: "text", label: "Column" },
    ]);

  const changeKind = (i: number, kind: TableColumn["kind"]) => {
    const old = columns[i];
    let next: TableColumn;
    if (kind === "select") {
      next = { id: old.id, kind: "select", label: old.label, options: ["A", "B"] };
    } else if (kind === "number") {
      next = { id: old.id, kind: "number", label: old.label };
    } else {
      next = { id: old.id, kind, label: old.label } as TableColumn;
    }
    update(i, next);
  };

  return (
    <div className="space-y-2">
      {columns.map((c, i) => (
        <div key={c.id} className="rounded-sm border bg-muted/30 p-2 space-y-1.5">
          <div className="flex items-center gap-1.5">
            <Input
              value={c.label}
              onChange={(e) => update(i, { label: e.target.value } as any)}
              placeholder="Column label"
              className="h-7 text-xs"
            />
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => remove(i)}
              className="text-muted-foreground hover:text-destructive"
            >
              <X className="size-3.5" />
            </Button>
          </div>
          <Select
            value={c.kind}
            onValueChange={(k) => changeKind(i, k as TableColumn["kind"])}
          >
            <SelectTrigger className="h-7 text-xs rounded-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="text">Text</SelectItem>
              <SelectItem value="number">Number</SelectItem>
              <SelectItem value="date">Date</SelectItem>
              <SelectItem value="select">Dropdown</SelectItem>
              <SelectItem value="checkbox">Checkbox</SelectItem>
              <SelectItem value="passfail">Pass / fail</SelectItem>
            </SelectContent>
          </Select>
          {c.kind === "number" && (
            <Input
              value={c.unit ?? ""}
              onChange={(e) =>
                update(i, { unit: e.target.value || undefined } as any)
              }
              placeholder="Unit"
              className="h-7 text-xs"
            />
          )}
          {c.kind === "select" && (
            <OptionEditor
              options={c.options}
              onChange={(opts) => update(i, { options: opts } as any)}
            />
          )}
        </div>
      ))}
      <Button
        variant="outline"
        size="sm"
        onClick={add}
        className="h-7 rounded-sm text-xs w-full"
      >
        <Plus className="size-3.5" />
        Add column
      </Button>
    </div>
  );
}
