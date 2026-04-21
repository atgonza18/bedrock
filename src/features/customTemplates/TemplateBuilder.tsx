/**
 * TemplateBuilder — the shell that composes Canvas, Inspector, PreviewPane,
 * and the SlashMenu into a single builder experience.
 *
 * Layout (desktop):
 *   ┌───────────────────────────────────────────────────────────────┐
 *   │ Toolbar: name · saved-ago · undo/redo · blocks · AI · starter │
 *   ├──────────┬────────────────────┬──────────────┬────────────────┤
 *   │ Palette  │ Canvas             │ Inspector    │ Preview        │
 *   └──────────┴────────────────────┴──────────────┴────────────────┘
 *
 * Keyboard shortcuts:
 *   /            Open slash menu to insert a field
 *   Cmd/Ctrl-S   Force save now
 *   Cmd/Ctrl-Z   Undo
 *   Cmd/Ctrl-⇧Z  Redo
 *   Cmd/Ctrl-D   Duplicate selected field
 *   Delete       Delete selected field
 *   ↑/↓          Move selection up/down
 *   Cmd-↑/↓      Move selected field up/down
 *   Enter        Open inline label editor (canvas also supports click)
 *   Esc          Deselect
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft,
  Undo2,
  Redo2,
  Sparkles,
  Library,
  LayoutTemplate,
  Circle,
  CheckCircle2,
  AlertTriangle,
  PanelRightClose,
  PanelRightOpen,
  Check,
} from "lucide-react";
import { SlashMenu } from "./SlashMenu";
import { Canvas } from "./Canvas";
import { PreviewPane } from "./PreviewPane";
import { Inspector } from "./Inspector";
import { StarterGallery } from "./StarterGallery";
import { FieldLibraryDialog } from "./FieldLibraryDialog";
import { AIGeneratorDialog } from "./AIGeneratorDialog";
import { FIELD_PALETTE, newField, freshFieldId } from "./fieldDefaults";
import { FIELD_ACCENTS } from "./palette";
import { useBuilderState, type BuilderSnapshot } from "./useBuilderState";
import type {
  TemplateField,
  TemplateFieldKind,
} from "../../../convex/lib/customTemplates";
import {
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
} from "lucide-react";

const PALETTE_ICONS: Record<
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

export type TemplateBuilderProps = {
  initialName: string;
  initialDescription: string;
  initialFields: TemplateField[];
  onSave: (v: BuilderSnapshot) => Promise<void>;
  onCancel?: () => void;
  /** Shown inline when the template was freshly created (empty fields). */
  offerStarterOnMount?: boolean;
};

export function TemplateBuilder({
  initialName,
  initialDescription,
  initialFields,
  onSave,
  onCancel,
  offerStarterOnMount,
}: TemplateBuilderProps) {
  const state = useBuilderState(
    { name: initialName, description: initialDescription, fields: initialFields },
    async (snap) => onSave(snap),
  );

  const [slashOpen, setSlashOpen] = useState(false);
  const [slashAnchor, setSlashAnchor] = useState<DOMRect | null>(null);
  const [insertAfterId, setInsertAfterId] = useState<string | null>(null);
  const [starterOpen, setStarterOpen] = useState(!!offerStarterOnMount);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  // Field ids from the last AI generation — Canvas uses these to animate cards
  // in with a staggered delay. Cleared after the animation finishes.
  const [justAddedIds, setJustAddedIds] = useState<Set<string>>(() => new Set());
  // Preview defaults to visible only on truly wide screens (≥1440px). Below
  // that, the 4-column layout crowds the canvas, so we start it collapsed and
  // let the user toggle it on.
  const [previewOpen, setPreviewOpen] = useState(() =>
    typeof window === "undefined" ? true : window.innerWidth >= 1440,
  );

  const addFieldButtonRef = useRef<HTMLButtonElement>(null);

  const selected = useMemo(
    () => state.fields.find((f) => f.id === state.selectedId) ?? null,
    [state.fields, state.selectedId],
  );

  // ─── Field mutations ───────────────────────────────
  const insertField = useCallback(
    (kind: TemplateFieldKind, afterId?: string | null) => {
      const f = newField(kind);
      state.setFields((cur) => {
        if (!afterId) return [...cur, f];
        const i = cur.findIndex((x) => x.id === afterId);
        if (i === -1) return [...cur, f];
        const next = [...cur];
        next.splice(i + 1, 0, f);
        return next;
      });
      state.setSelectedId(f.id);
    },
    [state],
  );

  const updateField = useCallback(
    (id: string, patch: Partial<TemplateField>) => {
      state.setFields((cur) =>
        cur.map((f) =>
          f.id === id ? ({ ...f, ...patch } as TemplateField) : f,
        ),
      );
    },
    [state],
  );

  const removeField = useCallback(
    (id: string) => {
      state.setFields((cur) => cur.filter((f) => f.id !== id));
      if (state.selectedId === id) state.setSelectedId(null);
    },
    [state],
  );

  const duplicateField = useCallback(
    (id: string) => {
      const src = state.fields.find((f) => f.id === id);
      if (!src) return;
      const copy: TemplateField = { ...(src as any), id: freshFieldId() };
      state.setFields((cur) => {
        const i = cur.findIndex((f) => f.id === id);
        const next = [...cur];
        next.splice(i + 1, 0, copy);
        return next;
      });
      state.setSelectedId(copy.id);
    },
    [state],
  );

  const reorderField = useCallback(
    (from: number, to: number) => {
      state.setFields((cur) => {
        const next = [...cur];
        const [removed] = next.splice(from, 1);
        next.splice(to, 0, removed);
        return next;
      });
    },
    [state],
  );

  const applyInference = useCallback(
    (id: string, newKind: TemplateFieldKind) => {
      state.setFields((cur) =>
        cur.map((f) => {
          if (f.id !== id) return f;
          const replacement = newField(newKind);
          // Preserve the label / help text when swapping kinds.
          const label = "label" in f ? f.label : undefined;
          const helpText = "helpText" in f ? f.helpText : undefined;
          const required = "required" in f ? f.required : undefined;
          return {
            ...replacement,
            id: f.id,
            ...(label ? { label } : {}),
            ...(helpText ? { helpText } : {}),
            ...(required !== undefined ? { required } : {}),
          } as TemplateField;
        }),
      );
    },
    [state],
  );

  // ─── Keyboard shortcuts ───────────────────────────────
  useEffect(() => {
    const isTypingTarget = (t: EventTarget | null): boolean => {
      if (!(t instanceof HTMLElement)) return false;
      const tag = t.tagName;
      return tag === "INPUT" || tag === "TEXTAREA" || t.isContentEditable;
    };

    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      const typing = isTypingTarget(e.target);

      // Cmd-S always — save even if typing.
      if (mod && e.key.toLowerCase() === "s" && !e.shiftKey) {
        e.preventDefault();
        void state.forceFlush();
        return;
      }

      // Cmd-Z / Cmd-Shift-Z always.
      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) state.redo();
        else state.undo();
        return;
      }

      if (typing) return;

      if (e.key === "/") {
        e.preventDefault();
        const rect = addFieldButtonRef.current?.getBoundingClientRect();
        if (rect) {
          setInsertAfterId(state.selectedId);
          setSlashAnchor(rect);
          setSlashOpen(true);
        }
        return;
      }

      if ((e.key === "Delete" || e.key === "Backspace") && state.selectedId) {
        e.preventDefault();
        removeField(state.selectedId);
        return;
      }

      if (mod && e.key.toLowerCase() === "d" && state.selectedId) {
        e.preventDefault();
        duplicateField(state.selectedId);
        return;
      }

      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        const cur = state.fields.findIndex((f) => f.id === state.selectedId);
        if (cur === -1) {
          if (state.fields[0]) state.setSelectedId(state.fields[0].id);
          return;
        }
        if (mod) {
          e.preventDefault();
          const to =
            e.key === "ArrowDown"
              ? Math.min(cur + 1, state.fields.length - 1)
              : Math.max(cur - 1, 0);
          if (to !== cur) reorderField(cur, to);
        } else {
          e.preventDefault();
          const next =
            e.key === "ArrowDown"
              ? Math.min(cur + 1, state.fields.length - 1)
              : Math.max(cur - 1, 0);
          state.setSelectedId(state.fields[next]?.id ?? null);
        }
        return;
      }

      if (e.key === "Escape") {
        state.setSelectedId(null);
        return;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [state, duplicateField, removeField, reorderField]);

  // ─── Slash menu commit ───────────────────────────────
  const handleSlashPick = (kind: TemplateFieldKind) => {
    insertField(kind, insertAfterId);
    setSlashOpen(false);
    setInsertAfterId(null);
  };

  // ─── Render ───────────────────────────────
  const savedLabel = useSavedLabel(state.saveStatus, state.lastSavedAt);

  const handleDone = async () => {
    await state.forceFlush();
    onCancel?.();
  };

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)] min-w-0 overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-2 border-b pb-3 mb-3 min-w-0">
        {onCancel && (
          <Button variant="ghost" size="icon-sm" onClick={onCancel} className="shrink-0">
            <ArrowLeft className="size-4" />
          </Button>
        )}
        <div className="flex-1 min-w-0 flex items-center gap-2">
          <Input
            value={state.name}
            onChange={(e) => state.setName(e.target.value)}
            placeholder="Template name"
            className="h-9 text-base font-semibold rounded-sm border-transparent bg-transparent px-2 hover:border-border focus-visible:border-ring shadow-none flex-1 min-w-0 max-w-md"
          />
          <SavedPill status={state.saveStatus} label={savedLabel} />
        </div>

        {/* Action cluster — icon-only on narrow, label on lg+ */}
        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={state.undo}
            disabled={!state.canUndo}
            title="Undo (⌘Z)"
          >
            <Undo2 className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={state.redo}
            disabled={!state.canRedo}
            title="Redo (⇧⌘Z)"
          >
            <Redo2 className="size-4" />
          </Button>
          <div className="w-px h-5 bg-border mx-1" />
          <Button
            variant="ghost"
            size="sm"
            className="h-8 rounded-sm px-2 text-xs"
            onClick={() => setStarterOpen(true)}
            title="Starter templates"
          >
            <LayoutTemplate className="size-3.5" />
            <span className="hidden xl:inline ml-1">Starters</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 rounded-sm px-2 text-xs"
            onClick={() => setLibraryOpen(true)}
            title="Field library"
          >
            <Library className="size-3.5" />
            <span className="hidden xl:inline ml-1">Blocks</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAiOpen(true)}
            className="h-8 rounded-sm px-2 text-xs border-amber-brand/40 bg-amber-brand/5 hover:bg-amber-brand/10 text-foreground"
            title="AI draft"
          >
            <Sparkles className="size-3.5 text-amber-brand" />
            <span className="hidden xl:inline ml-1">AI draft</span>
          </Button>
          <div className="w-px h-5 bg-border mx-1" />
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setPreviewOpen((v) => !v)}
            title={previewOpen ? "Hide preview" : "Show preview"}
          >
            {previewOpen ? (
              <PanelRightClose className="size-4" />
            ) : (
              <PanelRightOpen className="size-4" />
            )}
          </Button>
          <div className="w-px h-5 bg-border mx-1" />
          {/* Save & Done — users want an explicit "I'm finished" button. Auto-save
              still fires on every change; this flushes once more and exits. */}
          <Button
            size="sm"
            onClick={() => void handleDone()}
            className="h-8 rounded-sm px-3 text-xs"
            title="Save and return to Templates (⌘S to just save)"
          >
            <Check className="size-3.5" />
            <span className="ml-1">Save &amp; done</span>
          </Button>
        </div>
      </div>

      {/* Body — CSS grid instead of flex so content can never push siblings
          off-screen. Column tracks are explicit; the canvas column uses
          minmax(0, 1fr) so it flex-shrinks before growing past its track. */}
      <div
        className="grid flex-1 gap-3 min-h-0 min-w-0"
        style={{
          gridTemplateColumns: previewOpen
            ? "208px minmax(0, 1fr) 400px"
            : "208px minmax(0, 1fr)",
        }}
      >
        {/* Palette */}
        <aside className="min-w-0 border rounded-md overflow-y-auto bg-background/40">
          <div className="sticky top-0 bg-background px-3 py-2 border-b flex items-center justify-between">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Add field
            </p>
            <button
              ref={addFieldButtonRef}
              type="button"
              onClick={(e) => {
                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                setInsertAfterId(state.selectedId);
                setSlashAnchor(rect);
                setSlashOpen(true);
              }}
              className="text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1"
              title="Open slash menu (/)"
            >
              <kbd className="font-mono bg-muted/60 border rounded px-1">/</kbd>
            </button>
          </div>
          <div className="p-1.5 space-y-1">
            {FIELD_PALETTE.map((p) => {
              const Icon = PALETTE_ICONS[p.kind];
              const accent = FIELD_ACCENTS[p.kind];
              return (
                <button
                  key={p.kind}
                  type="button"
                  onClick={() => insertField(p.kind, state.selectedId)}
                  className={cn(
                    "w-full flex items-start gap-2 rounded-sm border border-transparent px-1.5 py-1.5 text-left hover:bg-muted hover:border-border/60 transition-all hover:translate-x-0.5",
                  )}
                >
                  <span
                    className={cn(
                      "size-6 inline-flex items-center justify-center rounded-sm shrink-0",
                      accent.bgClass,
                      accent.fgClass,
                    )}
                  >
                    <Icon className="size-3.5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-medium text-foreground truncate">
                      {p.label}
                    </span>
                    <span className="block text-[10px] text-muted-foreground leading-snug truncate">
                      {p.hint}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </aside>

        {/* Canvas + Inspector (nested as a sub-grid so the inspector has a
            fixed track and the canvas flex-shrinks to fit) */}
        <section className="min-w-0 flex flex-col border rounded-md overflow-hidden bg-background/40">
          <div className="sticky top-0 bg-background/80 backdrop-blur px-4 py-2.5 border-b flex items-center justify-between gap-2 min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground shrink-0">
              Canvas
            </p>
            <Input
              value={state.description}
              onChange={(e) => state.setDescription(e.target.value)}
              placeholder="Short description (optional)"
              className="max-w-xs h-7 rounded-sm text-xs bg-transparent border-transparent hover:border-border focus-visible:border-ring shadow-none min-w-0"
            />
          </div>

          <div
            className="flex-1 grid min-h-0 min-w-0"
            style={{ gridTemplateColumns: "minmax(0, 1fr) 256px" }}
          >
            <div className="overflow-y-auto overflow-x-hidden p-3 min-w-0">
              <Canvas
                fields={state.fields}
                selectedId={state.selectedId}
                collapsedSectionIds={state.collapsedSectionIds}
                justAddedIds={justAddedIds}
                onSelect={(id) => state.setSelectedId(id)}
                onReorder={reorderField}
                onRemove={removeField}
                onDuplicate={duplicateField}
                onUpdateField={updateField}
                onToggleCollapse={state.toggleSectionCollapse}
                onRequestSlash={(rect) => {
                  setInsertAfterId(state.selectedId);
                  setSlashAnchor(rect);
                  setSlashOpen(true);
                }}
                onApplyInference={applyInference}
                emptyStateAction={
                  <div className="flex items-center gap-2 justify-center">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setStarterOpen(true)}
                      className="rounded-sm h-7 text-xs"
                    >
                      <LayoutTemplate className="size-3.5" />
                      Use a starter
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => setAiOpen(true)}
                      className="rounded-sm h-7 text-xs"
                    >
                      <Sparkles className="size-3.5" />
                      AI draft
                    </Button>
                  </div>
                }
              />
            </div>

            {/* Inspector — fixed 256px grid track; can't push the canvas. */}
            <aside className="border-l min-h-0 min-w-0 overflow-hidden flex flex-col bg-background/60">
              <Inspector
                field={selected}
                onChange={(patch) => {
                  if (state.selectedId) updateField(state.selectedId, patch);
                }}
                onApplyInference={(k) => {
                  if (state.selectedId) applyInference(state.selectedId, k);
                }}
              />
            </aside>
          </div>
        </section>

        {/* Preview — fixed 400px grid track */}
        {previewOpen && (
          <section className="min-w-0 min-h-0 overflow-hidden">
            <PreviewPane
              name={state.name}
              description={state.description}
              fields={state.fields}
              collapsedSectionIds={state.collapsedSectionIds}
            />
          </section>
        )}
      </div>

      {/* Overlays */}
      <SlashMenu
        open={slashOpen}
        anchor={slashAnchor}
        onSelect={handleSlashPick}
        onClose={() => setSlashOpen(false)}
      />
      <StarterGallery
        open={starterOpen}
        onOpenChange={setStarterOpen}
        onPick={(s) => {
          state.replaceAll({
            name: state.name || s.name,
            description: state.description || s.description,
            fields: s.fields,
          });
          setStarterOpen(false);
        }}
      />
      <FieldLibraryDialog
        open={libraryOpen}
        onOpenChange={setLibraryOpen}
        currentFields={state.fields}
        onInsert={(fields) =>
          state.setFields((cur) => [...cur, ...fields])
        }
      />
      <AIGeneratorDialog
        open={aiOpen}
        onOpenChange={setAiOpen}
        onResult={({ fields, name }) => {
          // Only accept the AI-suggested name if the user hasn't put
          // meaningful effort into the existing one. Anything beyond the
          // default seed ("Untitled template") stays untouched.
          const keepExistingName =
            state.name.trim() !== "" &&
            state.name.trim() !== "Untitled template";
          state.replaceAll({
            name: keepExistingName ? state.name : name ?? state.name,
            description: state.description,
            fields,
          });
          // Mark every field as "just added" so the Canvas staggers them in.
          const ids = new Set(fields.map((f) => f.id));
          setJustAddedIds(ids);
          const clearAfterMs = 60 + ids.size * 120 + 1000;
          setTimeout(() => setJustAddedIds(new Set()), clearAfterMs);
        }}
      />

      {/* Shortcut hint footer */}
      <div className="mt-3 flex items-center justify-center gap-4 text-[10px] text-muted-foreground">
        <Hint k="/">insert field</Hint>
        <Hint k="⌘Z">undo</Hint>
        <Hint k="⌘D">duplicate</Hint>
        <Hint k="Del">delete</Hint>
        <Hint k="⌘↑/↓">reorder</Hint>
        <Hint k="⌘S">save</Hint>
      </div>
    </div>
  );
}

// ─── Saved pill ──────────────────────────────────────────────────

function useSavedLabel(
  status: "idle" | "dirty" | "saving" | "saved" | "error",
  lastSavedAt: number | null,
): string {
  const [, force] = useState(0);
  useEffect(() => {
    const t = setInterval(() => force((n) => n + 1), 30_000);
    return () => clearInterval(t);
  }, []);
  if (status === "saving") return "Saving…";
  if (status === "dirty") return "Unsaved changes";
  if (status === "error") return "Save failed";
  if (!lastSavedAt) return "Ready";
  const s = Math.max(1, Math.round((Date.now() - lastSavedAt) / 1000));
  if (s < 60) return `Saved ${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `Saved ${m}m ago`;
  const h = Math.round(m / 60);
  return `Saved ${h}h ago`;
}

function SavedPill({
  status,
  label,
}: {
  status: "idle" | "dirty" | "saving" | "saved" | "error";
  label: string;
}) {
  const icon =
    status === "saving" ? (
      <Circle className="size-3 text-muted-foreground animate-pulse" />
    ) : status === "error" ? (
      <AlertTriangle className="size-3 text-destructive" />
    ) : status === "dirty" ? (
      <Circle className="size-3 text-amber-brand fill-amber-brand" />
    ) : (
      <CheckCircle2 className="size-3 text-emerald-600" />
    );
  return (
    <div className="inline-flex items-center gap-1.5 rounded-full border bg-background/70 px-2 py-0.5 text-[11px] text-muted-foreground">
      {icon}
      <span>{label}</span>
    </div>
  );
}

function Hint({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1">
      <kbd className="font-mono bg-muted/60 border rounded px-1 py-0.5 text-[10px]">
        {k}
      </kbd>
      <span>{children}</span>
    </span>
  );
}
