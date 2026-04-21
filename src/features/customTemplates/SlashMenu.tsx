/**
 * Slash-command inline menu for inserting fields.
 *
 * Positioned relative to a caller-supplied anchor element. Users type to filter,
 * arrow keys to navigate, Enter to commit. Escapes or blurring the list closes.
 *
 * Not a real popover library — we render a portal'd absolute-positioned div
 * anchored to getBoundingClientRect. Good enough for this use case, and we
 * avoid hauling in @radix-ui/popover just for this surface.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
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
import { FIELD_PALETTE } from "./fieldDefaults";
import { FIELD_ACCENTS } from "./palette";
import type { TemplateFieldKind } from "../../../convex/lib/customTemplates";

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

export type SlashMenuProps = {
  open: boolean;
  anchor: DOMRect | null;
  onSelect: (kind: TemplateFieldKind) => void;
  onClose: () => void;
};

export function SlashMenu({ open, anchor, onSelect, onClose }: SlashMenuProps) {
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return FIELD_PALETTE;
    return FIELD_PALETTE.filter(
      (p) =>
        p.label.toLowerCase().includes(q) ||
        p.kind.toLowerCase().includes(q) ||
        p.hint.toLowerCase().includes(q),
    );
  }, [query]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setHighlight(0);
      const t = setTimeout(() => inputRef.current?.focus(), 0);
      return () => clearTimeout(t);
    }
  }, [open]);

  useEffect(() => {
    setHighlight(0);
  }, [query]);

  // Keep highlight within bounds as the list filters.
  useEffect(() => {
    if (filtered.length === 0) return;
    if (highlight >= filtered.length) setHighlight(filtered.length - 1);
  }, [filtered, highlight]);

  if (!open || !anchor) return null;

  const menu = (
    <div
      ref={listRef}
      className="fixed z-[1000] w-72 rounded-md border border-border bg-popover shadow-lg overflow-hidden animate-in fade-in-0 zoom-in-95 duration-100"
      style={{
        top: Math.min(anchor.bottom + 6, window.innerHeight - 360),
        left: Math.min(anchor.left, window.innerWidth - 300),
      }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="border-b p-2">
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              onClose();
            } else if (e.key === "ArrowDown") {
              e.preventDefault();
              setHighlight((h) => Math.min(h + 1, filtered.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setHighlight((h) => Math.max(h - 1, 0));
            } else if (e.key === "Enter") {
              e.preventDefault();
              const picked = filtered[highlight];
              if (picked) onSelect(picked.kind);
            }
          }}
          placeholder="Search field types…"
          className="w-full h-8 px-2 rounded-sm border text-xs bg-background focus:outline-none focus:ring-1 focus:ring-amber-brand/50 focus:border-amber-brand/60"
        />
      </div>
      <div className="max-h-80 overflow-y-auto p-1">
        {filtered.length === 0 ? (
          <div className="px-3 py-3 text-xs text-muted-foreground">
            No field types match "{query}"
          </div>
        ) : (
          filtered.map((p, i) => {
            const Icon = KIND_ICONS[p.kind];
            const accent = FIELD_ACCENTS[p.kind];
            const active = i === highlight;
            return (
              <button
                key={p.kind}
                type="button"
                onMouseEnter={() => setHighlight(i)}
                onClick={() => onSelect(p.kind)}
                className={cn(
                  "w-full flex items-start gap-2.5 rounded-sm px-2 py-1.5 text-left transition-colors",
                  active ? "bg-muted" : "hover:bg-muted/60",
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 size-6 inline-flex items-center justify-center rounded-sm",
                    accent.bgClass,
                    accent.fgClass,
                  )}
                >
                  <Icon className="size-3.5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-medium text-foreground">
                    {p.label}
                  </span>
                  <span className="block text-[11px] text-muted-foreground leading-snug truncate">
                    {p.hint}
                  </span>
                </span>
              </button>
            );
          })
        )}
      </div>
      <div className="border-t px-2 py-1 bg-muted/30 flex items-center gap-2 text-[10px] text-muted-foreground">
        <kbd className="font-mono bg-background border rounded px-1">↑↓</kbd>
        <span>navigate</span>
        <kbd className="font-mono bg-background border rounded px-1">Enter</kbd>
        <span>add</span>
        <kbd className="font-mono bg-background border rounded px-1">Esc</kbd>
        <span>close</span>
      </div>
    </div>
  );

  return createPortal(menu, document.body);
}
