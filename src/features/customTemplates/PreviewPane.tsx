/**
 * PreviewPane — live-renders the in-progress template as a tech will see it.
 *
 * Modes:
 *   • Desktop   — full-width render (no frame)
 *   • Phone     — 390px-wide frame with rounded device chrome, scrollable
 *
 * Sample answers: a toggle filling the form with plausible values so execs
 * can see "here's what the filled-out form looks like" vs an empty skeleton.
 *
 * Collapsed sections in the canvas are respected here too, so the preview
 * always matches what the builder is looking at.
 */
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Monitor, Smartphone, Sparkles } from "lucide-react";
import { FormRenderer } from "./FormRenderer";
import { buildSampleValues } from "./sampleAnswers";
import type {
  FieldValues,
  TemplateField,
} from "../../../convex/lib/customTemplates";

export type PreviewPaneProps = {
  name: string;
  description: string;
  fields: TemplateField[];
  collapsedSectionIds: Set<string>;
};

export function PreviewPane({
  name,
  description,
  fields,
  collapsedSectionIds,
}: PreviewPaneProps) {
  const [mode, setMode] = useState<"desktop" | "phone">("desktop");
  const [sample, setSample] = useState(true);

  const visibleFields = useMemo(() => {
    const out: TemplateField[] = [];
    let hiding = false;
    for (const f of fields) {
      if (f.kind === "heading" && f.level === 1) {
        hiding = collapsedSectionIds.has(f.id);
        out.push(f); // still show the heading in preview (matches canvas)
        continue;
      }
      if (!hiding) out.push(f);
    }
    return out;
  }, [fields, collapsedSectionIds]);

  const sampleValues: FieldValues = useMemo(
    () => (sample ? buildSampleValues(visibleFields) : {}),
    [sample, visibleFields],
  );
  const [values, setValues] = useState<FieldValues>({});
  const effective = sample ? sampleValues : values;

  return (
    <div className="flex flex-col h-full min-h-0 border rounded-md overflow-hidden bg-muted/20">
      {/* Toolbar — one segmented control for all three toggles. */}
      <div className="flex items-center justify-between px-3 py-2 border-b bg-background/60 backdrop-blur">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium truncate">
            Live preview
          </span>
        </div>
        <div className="inline-flex items-center rounded-sm border bg-background overflow-hidden shrink-0">
          <SegButton
            active={sample}
            onClick={() => setSample((s) => !s)}
            title={sample ? "Show empty form" : "Fill with sample answers"}
          >
            <Sparkles className="size-3.5" />
            <span className="text-[10px] uppercase tracking-wider">Sample</span>
          </SegButton>
          <SegDivider />
          <SegButton
            active={mode === "desktop"}
            onClick={() => setMode("desktop")}
            title="Desktop preview"
            iconOnly
          >
            <Monitor className="size-3.5" />
          </SegButton>
          <SegButton
            active={mode === "phone"}
            onClick={() => setMode("phone")}
            title="Phone preview"
            iconOnly
          >
            <Smartphone className="size-3.5" />
          </SegButton>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 overflow-y-auto">
        {mode === "desktop" ? (
          <div className="mx-auto max-w-2xl px-5 py-6">
            <PreviewBody
              name={name}
              description={description}
              fields={visibleFields}
              values={effective}
              onValues={sample ? undefined : setValues}
            />
          </div>
        ) : (
          <div className="py-8 px-4 flex justify-center">
            <div
              className="w-[390px] bg-background rounded-[28px] border border-border shadow-xl overflow-hidden"
              style={{ boxShadow: "0 20px 60px -20px rgb(0 0 0 / 0.35)" }}
            >
              {/* Phone notch */}
              <div className="h-6 bg-background flex items-center justify-center">
                <div className="w-16 h-[3px] bg-muted-foreground/40 rounded-full" />
              </div>
              <div
                className="max-h-[640px] overflow-y-auto px-4 pb-6 pt-2"
                style={{ scrollbarWidth: "thin" }}
              >
                <PreviewBody
                  name={name}
                  description={description}
                  fields={visibleFields}
                  values={effective}
                  onValues={sample ? undefined : setValues}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SegButton({
  active,
  onClick,
  title,
  iconOnly,
  children,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  iconOnly?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={cn(
        "inline-flex items-center gap-1 px-2 py-1 text-xs font-medium transition-colors",
        iconOnly ? "min-w-[28px] justify-center" : "",
        active
          ? "bg-muted text-foreground"
          : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
      )}
    >
      {children}
    </button>
  );
}

function SegDivider() {
  return <span className="w-px self-stretch bg-border" aria-hidden />;
}

function PreviewBody({
  name,
  description,
  fields,
  values,
  onValues,
}: {
  name: string;
  description: string;
  fields: TemplateField[];
  values: FieldValues;
  onValues?: (v: FieldValues) => void;
}) {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-heading text-lg font-semibold tracking-tight">
          {name || "Untitled template"}
        </h1>
        {description && (
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      {fields.length === 0 ? (
        <div className="rounded-md border border-dashed p-8 text-center">
          <p className="text-xs text-muted-foreground">
            Add fields on the left to see them here.
          </p>
        </div>
      ) : (
        <FormRenderer
          fields={fields}
          values={values}
          onChange={onValues ?? (() => {})}
          readOnly={!onValues}
        />
      )}
    </div>
  );
}
