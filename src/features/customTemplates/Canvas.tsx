/**
 * Canvas — the center pane of the builder. One card per field, draggable,
 * selectable, inline-editable. Heading fields collapse the section below
 * them. Each card gets a colored left rail by kind.
 *
 * Inline editing: clicking the label on a non-heading field turns it into an
 * input at the same font size/weight. Enter or blur commits, Escape cancels.
 * Pressing Tab while editing the last field adds a new text field below it
 * — the "type the form" flow.
 *
 * Motion: new cards spring in via CSS (scale 0.96 → 1, opacity 0 → 1, 180ms).
 * dnd-kit's own transform/transition handles drag reorder animations.
 */
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import {
  GripVertical,
  Plus,
  Trash2,
  Copy,
  ChevronDown,
  ChevronRight,
  Type,
  Text,
  AlignLeft,
  Hash,
  Calendar,
  ListChecks,
  CheckSquare,
  BadgeCheck,
  Image as ImageIcon,
  Rows3,
  Sparkles,
} from "lucide-react";
import type {
  TemplateField,
  TemplateFieldKind,
} from "../../../convex/lib/customTemplates";
import { FIELD_ACCENTS } from "./palette";
import { inferSuggestion, findDuplicateLabelIds } from "./smartInference";

const KIND_ICONS: Record<
  TemplateFieldKind,
  React.ComponentType<{ className?: string }>
> = {
  heading: Type,
  text: Text,
  textarea: AlignLeft,
  number: Hash,
  date: Calendar,
  select: ListChecks,
  checkbox: CheckSquare,
  photo: ImageIcon,
  passfail: BadgeCheck,
  table: Rows3,
};

export type CanvasProps = {
  fields: TemplateField[];
  selectedId: string | null;
  collapsedSectionIds: Set<string>;
  onSelect: (id: string) => void;
  onReorder: (from: number, to: number) => void;
  onRemove: (id: string) => void;
  onDuplicate: (id: string) => void;
  onUpdateField: (id: string, patch: Partial<TemplateField>) => void;
  onToggleCollapse: (headingId: string) => void;
  /** Triggers the slash menu anchored to a field card. */
  onRequestSlash: (rect: DOMRect) => void;
  /** Applies an inference suggestion (in-place kind swap). */
  onApplyInference: (id: string, newKind: TemplateFieldKind) => void;
  /** Field ids that should animate in with a staggered delay (e.g. fresh from AI). */
  justAddedIds?: Set<string>;
  emptyStateAction?: React.ReactNode;
};

export function Canvas({
  fields,
  selectedId,
  collapsedSectionIds,
  onSelect,
  onReorder,
  onRemove,
  onDuplicate,
  onUpdateField,
  onToggleCollapse,
  onRequestSlash,
  onApplyInference,
  justAddedIds,
  emptyStateAction,
}: CanvasProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = fields.findIndex((f) => f.id === active.id);
    const newIdx = fields.findIndex((f) => f.id === over.id);
    if (oldIdx !== -1 && newIdx !== -1) onReorder(oldIdx, newIdx);
  };

  // Compute which fields are hidden under collapsed sections. A heading with
  // collapse toggled hides everything after it up to the next level-1 heading.
  const hiddenIds = new Set<string>();
  let hideUntilNextHeading = false;
  for (const f of fields) {
    if (f.kind === "heading" && f.level === 1) {
      hideUntilNextHeading = collapsedSectionIds.has(f.id);
      continue;
    }
    if (hideUntilNextHeading) hiddenIds.add(f.id);
  }

  const dupes = findDuplicateLabelIds(fields);

  if (fields.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-10 text-center bg-gradient-to-b from-background to-muted/20">
        <div className="mx-auto size-12 rounded-full bg-amber-brand/10 border border-amber-brand/30 flex items-center justify-center mb-3">
          <Sparkles className="size-5 text-amber-brand" />
        </div>
        <p className="text-sm font-medium">Build your form</p>
        <p className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto">
          Type <kbd className="font-mono text-[10px] border rounded px-1 py-0.5 bg-muted">/</kbd> to insert a field, pick one from the palette, or try a starter template.
        </p>
        {emptyStateAction && <div className="mt-4">{emptyStateAction}</div>}
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={fields.map((f) => f.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-2">
          {(() => {
            // Assign staggered animation indexes only to cards currently in the
            // justAddedIds set, in source order — so fields from an AI batch
            // enter one after the other, not all at once.
            let staggerIdx = 0;
            return fields.map((field) => {
              const hidden = hiddenIds.has(field.id);
              if (hidden) return null;
              const isJustAdded = justAddedIds?.has(field.id) ?? false;
              const stagger = isJustAdded ? staggerIdx++ : -1;
              return (
                <FieldCard
                  key={field.id}
                  field={field}
                  selected={selectedId === field.id}
                  collapsed={
                    field.kind === "heading" &&
                    field.level === 1 &&
                    collapsedSectionIds.has(field.id)
                  }
                  isDuplicate={dupes.has(field.id)}
                  staggerIndex={stagger}
                  onSelect={() => onSelect(field.id)}
                  onRemove={() => onRemove(field.id)}
                  onDuplicate={() => onDuplicate(field.id)}
                  onUpdateField={(patch) => onUpdateField(field.id, patch)}
                  onToggleCollapse={() => onToggleCollapse(field.id)}
                  onRequestSlash={onRequestSlash}
                  onApplyInference={(k) => onApplyInference(field.id, k)}
                />
              );
            });
          })()}
        </div>
      </SortableContext>
    </DndContext>
  );
}

// ─── Single field card ───────────────────────────────

function FieldCard({
  field,
  selected,
  collapsed,
  isDuplicate,
  staggerIndex,
  onSelect,
  onRemove,
  onDuplicate,
  onUpdateField,
  onToggleCollapse,
  onRequestSlash,
  onApplyInference,
}: {
  field: TemplateField;
  selected: boolean;
  collapsed: boolean;
  isDuplicate: boolean;
  /** -1 when not recently added, 0..N for AI-generated stagger. */
  staggerIndex: number;
  onSelect: () => void;
  onRemove: () => void;
  onDuplicate: () => void;
  onUpdateField: (patch: Partial<TemplateField>) => void;
  onToggleCollapse: () => void;
  onRequestSlash: (rect: DOMRect) => void;
  onApplyInference: (k: TemplateFieldKind) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: field.id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const Icon = KIND_ICONS[field.kind];
  const accent = FIELD_ACCENTS[field.kind];

  const labelText =
    field.kind === "heading" ? field.text || "Section" : field.label || "";

  const suggestion =
    field.kind !== "heading" && field.kind !== "table"
      ? inferSuggestion(field)
      : null;

  // Springy entrance for newly-added fields. For AI-batch arrivals, each card
  // delays based on its staggerIndex so they appear in sequence (120ms step).
  const [entered, setEntered] = useState(false);
  useEffect(() => {
    const delay = staggerIndex >= 0 ? 60 + staggerIndex * 120 : 8;
    const t = setTimeout(() => setEntered(true), delay);
    return () => clearTimeout(t);
  }, [staggerIndex]);

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onSelect}
      className={cn(
        "group relative flex items-stretch rounded-md border bg-background overflow-hidden cursor-pointer",
        "transition-[transform,opacity,box-shadow,border-color] duration-200",
        entered ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-2 scale-[0.97]",
        // AI-stagger entries also get a soft amber pulse on entrance.
        staggerIndex >= 0 &&
          entered &&
          "animate-[ai-pulse_900ms_ease-out]",
        selected &&
          `border-transparent ring-2 ring-offset-2 ring-offset-background ${accent.glowClass}`,
        !selected && "hover:border-foreground/15 hover:shadow-sm",
      )}
      tabIndex={-1}
      data-field-id={field.id}
    >
      {/* Left accent rail */}
      <div
        className={cn(
          "w-1 shrink-0 border-l-2",
          accent.borderClass,
          "transition-colors",
        )}
      />

      <div className="flex-1 min-w-0 pl-2 pr-2 py-2">
        <div className="flex items-center gap-2">
          {/* Drag handle */}
          <button
            {...attributes}
            {...listeners}
            type="button"
            className="shrink-0 cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground transition-colors"
            aria-label="Drag to reorder"
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="size-4" />
          </button>

          {/* Kind badge */}
          <span
            className={cn(
              "size-6 inline-flex items-center justify-center rounded-sm shrink-0",
              accent.bgClass,
              accent.fgClass,
            )}
            title={accent.label}
          >
            <Icon className="size-3.5" />
          </span>

          {/* Heading collapse toggle */}
          {field.kind === "heading" && field.level === 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleCollapse();
              }}
              className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
              title={collapsed ? "Expand section" : "Collapse section"}
            >
              {collapsed ? (
                <ChevronRight className="size-4" />
              ) : (
                <ChevronDown className="size-4" />
              )}
            </button>
          )}

          <InlineLabel
            value={labelText}
            onCommit={(v) =>
              onUpdateField(
                field.kind === "heading"
                  ? ({ text: v } as Partial<TemplateField>)
                  : ({ label: v } as Partial<TemplateField>),
              )
            }
            className={cn(
              "flex-1 min-w-0 text-sm",
              field.kind === "heading" &&
                field.level === 1 &&
                "font-semibold text-base",
              field.kind === "heading" &&
                field.level === 2 &&
                "font-medium uppercase tracking-wider text-xs text-muted-foreground",
            )}
          />

          {/* Required star + duplicate warning */}
          <div className="flex items-center gap-1 shrink-0">
            {field.kind !== "heading" && field.required && (
              <span
                className="text-[10px] uppercase tracking-wider font-semibold text-amber-brand"
                title="Required"
              >
                REQ
              </span>
            )}
            {isDuplicate && (
              <span
                className="text-[10px] uppercase tracking-wider font-medium text-destructive"
                title="Another field has the same label"
              >
                DUP
              </span>
            )}
          </div>

          {/* Action icons */}
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={(e) => {
                e.stopPropagation();
                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                onRequestSlash(rect);
              }}
              title="Insert field after this"
            >
              <Plus className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={(e) => {
                e.stopPropagation();
                onDuplicate();
              }}
              title="Duplicate"
            >
              <Copy className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
              title="Delete"
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        </div>

        {/* Inference hint chip */}
        {suggestion && (
          <div className="mt-1.5 pl-12 flex items-center gap-1.5">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onApplyInference(suggestion.kind);
              }}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-medium transition-colors",
                "bg-amber-brand/10 border-amber-brand/40 text-amber-700 dark:text-amber-300",
                "hover:bg-amber-brand/20",
              )}
              title={suggestion.reason}
            >
              <Sparkles className="size-2.5" />
              {suggestion.label}
            </button>
            <span className="text-[10px] text-muted-foreground italic">
              {suggestion.reason}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Inline label editor ───────────────────────────────

function InlineLabel({
  value,
  onCommit,
  className,
}: {
  value: string;
  onCommit: (v: string) => void;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          setEditing(false);
          onCommit(draft);
        }}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === "Enter") {
            e.preventDefault();
            setEditing(false);
            onCommit(draft);
          } else if (e.key === "Escape") {
            e.preventDefault();
            setDraft(value);
            setEditing(false);
          }
        }}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "truncate bg-transparent border-b border-amber-brand/50 focus:border-amber-brand outline-none",
          className,
        )}
      />
    );
  }

  return (
    <span
      onClick={(e) => {
        e.stopPropagation();
        setEditing(true);
      }}
      className={cn(
        "truncate cursor-text hover:underline decoration-dotted underline-offset-2 decoration-muted-foreground/60",
        !value && "text-muted-foreground italic",
        className,
      )}
    >
      {value || "Untitled"}
    </span>
  );
}
