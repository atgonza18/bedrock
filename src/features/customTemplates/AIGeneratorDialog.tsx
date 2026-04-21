/**
 * AI template generator — streaming Gemini 2.5 Pro with thought summaries.
 *
 * This is the showstopper UX moment of the builder: describe → watch it
 * think out loud → watch fields appear one by one → Done.
 *
 * Flow:
 *   1. User types a description, clicks Generate.
 *   2. We fetch the Convex HTTP action with an Authorization: Bearer <jwt>
 *      header. The server returns a Server-Sent Events stream.
 *   3. Each SSE event updates local state:
 *        - status   → rotating headline at top
 *        - thought  → appended to a scrolling thought-log panel
 *        - field_detected → adds a label to a running "built so far" list
 *        - complete → dismisses the dialog, applies fields to the canvas
 *        - error    → toast + leaves the dialog open
 *
 * Fall-back: if streaming fails outright, we also support a legacy one-shot
 * `useAction` call — never exposed, but the action file still exists as a
 * safety net if the HTTP endpoint misbehaves in production.
 */
import { useRef, useState } from "react";
import { useConvex } from "convex/react";
import { useAuthToken } from "@convex-dev/auth/react";
import { toast } from "sonner";
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogEyebrow,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Sparkles, Brain, Layers, Loader2, Check } from "lucide-react";
import {
  parseTemplateFields,
  type TemplateField,
} from "../../../convex/lib/customTemplates";

const EXAMPLE_PROMPTS = [
  "Density test with 5 readings and pass/fail per point",
  "Concrete slump + air content with two photos required",
  "Pre-pour formwork and rebar checklist with critical hold points",
  "Daily safety walk with PPE checklist and hazard notes",
];

export type AIGeneratorDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onResult: (payload: { fields: TemplateField[]; name: string | null }) => void;
};

type StreamState =
  | { phase: "idle" }
  | {
      phase: "streaming";
      status: string;
      thoughts: string;
      detectedLabels: string[];
      detectedName: string | null;
    };

export function AIGeneratorDialog({
  open,
  onOpenChange,
  onResult,
}: AIGeneratorDialogProps) {
  const convex = useConvex();
  const token = useAuthToken();
  const [description, setDescription] = useState("");
  const [state, setState] = useState<StreamState>({ phase: "idle" });
  const abortRef = useRef<AbortController | null>(null);
  const thoughtScrollRef = useRef<HTMLDivElement>(null);

  const streaming = state.phase === "streaming";

  const cancel = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setState({ phase: "idle" });
  };

  const submit = async () => {
    const desc = description.trim();
    if (!desc) return;

    if (!token) {
      toast.error("Auth token unavailable. Try refreshing the page.");
      return;
    }

    const baseUrl = siteUrlFromConvex(convex);
    if (!baseUrl) {
      toast.error("Convex site URL not available.");
      return;
    }

    abortRef.current = new AbortController();
    setState({
      phase: "streaming",
      status: "Connecting…",
      thoughts: "",
      detectedLabels: [],
      detectedName: null,
    });

    let completed = false;

    try {
      const response = await fetch(`${baseUrl}/api/generate-template-stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ description: desc }),
        signal: abortRef.current.signal,
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        const error = (body as { error?: string }).error ?? "HTTP_ERROR";
        handleError(error);
        return;
      }
      if (!response.body) {
        handleError("NO_STREAM_BODY");
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // SSE events are separated by a blank line.
        let sep: number;
        while ((sep = buffer.indexOf("\n\n")) !== -1) {
          const raw = buffer.slice(0, sep);
          buffer = buffer.slice(sep + 2);
          const line = raw.split("\n").find((l) => l.startsWith("data: "));
          if (!line) continue;
          let data: any;
          try {
            data = JSON.parse(line.slice(6));
          } catch {
            continue;
          }
          handleEvent(data);
          if (data.type === "complete") {
            completed = true;
            try {
              const fields = parseTemplateFields(data.fieldsJson);
              const name =
                typeof data.name === "string" && data.name.trim()
                  ? data.name.trim()
                  : null;
              onResult({ fields, name });
              toast.success(
                name
                  ? `Generated "${name}" — ${fields.length} fields`
                  : `Generated ${fields.length} fields`,
              );
              setDescription("");
              onOpenChange(false);
            } catch {
              toast.error("AI response was malformed");
            }
          } else if (data.type === "error") {
            handleError(data.code ?? "AI_STREAM_ERROR", data.message);
          }
        }
      }

      if (!completed) {
        handleError("AI_STREAM_INCOMPLETE");
      }
    } catch (e: any) {
      if (e?.name === "AbortError") return; // user cancelled
      handleError("NETWORK_ERROR", e?.message);
    } finally {
      if (!completed) setState({ phase: "idle" });
      abortRef.current = null;
    }
  };

  function handleEvent(data: any) {
    setState((s) => {
      if (s.phase !== "streaming") return s;
      switch (data.type) {
        case "status":
          return { ...s, status: String(data.message ?? s.status) };
        case "thought": {
          const nextThoughts = (s.thoughts + String(data.text ?? ""))
            .replace(/\r/g, "")
            .slice(-4000);
          requestAnimationFrame(() => {
            const el = thoughtScrollRef.current;
            if (el) el.scrollTop = el.scrollHeight;
          });
          return { ...s, thoughts: nextThoughts };
        }
        case "name_detected": {
          const name = String(data.name ?? "").trim();
          if (!name) return s;
          return { ...s, detectedName: name };
        }
        case "field_detected": {
          const label = String(data.label ?? "").trim();
          if (!label) return s;
          if (s.detectedLabels.includes(label)) return s;
          return { ...s, detectedLabels: [...s.detectedLabels, label] };
        }
        default:
          return s;
      }
    });
  }

  function handleError(code: string, message?: string) {
    if (code === "AI_NOT_CONFIGURED") {
      toast.error(
        "Set GEMINI_API_KEY in your Convex deployment to enable AI generation",
      );
    } else if (code === "FORBIDDEN" || code === "UNAUTHENTICATED") {
      toast.error("You don't have permission to generate templates");
    } else if (code === "AI_PARSE_FAILED" || code === "AI_EMPTY_RESULT") {
      toast.error("The AI's response was empty or malformed — try rewording");
    } else {
      toast.error(message ?? "Generation failed");
    }
    setState({ phase: "idle" });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && streaming) cancel();
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-full bg-gradient-to-br from-amber-brand to-amber-brand/50 flex items-center justify-center">
              <Sparkles className="size-4 text-background" />
            </div>
            <div>
              <DialogEyebrow>AI draft</DialogEyebrow>
              <DialogTitle>Describe your test</DialogTitle>
            </div>
          </div>
          <DialogDescription>
            Gemini 2.5 Pro drafts a template in real time — watch it think and
            build the form field by field.
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-3">
          {!streaming ? (
            <>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. density test with 5 readings and pass/fail per point"
                rows={3}
                className="resize-none"
                autoFocus
                onKeyDown={(e) => {
                  if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                    e.preventDefault();
                    void submit();
                  }
                }}
              />
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
                  Try an example
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {EXAMPLE_PROMPTS.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setDescription(p)}
                      className="text-[11px] rounded-full border bg-background px-2 py-1 text-muted-foreground hover:text-foreground hover:border-amber-brand/40 hover:bg-amber-brand/5 transition-colors"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground">
                This replaces the current fields. You can undo with{" "}
                <kbd className="font-mono text-[10px] border rounded px-1 py-0.5 bg-muted">
                  ⌘Z
                </kbd>
                .
              </p>
            </>
          ) : (
            <StreamingPanel
              status={state.status}
              thoughts={state.thoughts}
              detectedName={state.detectedName}
              detectedLabels={state.detectedLabels}
              thoughtScrollRef={thoughtScrollRef}
            />
          )}
        </DialogBody>

        <DialogFooter>
          {streaming ? (
            <Button type="button" variant="ghost" onClick={cancel}>
              Cancel
            </Button>
          ) : (
            <DialogClose asChild>
              <Button type="button" variant="ghost">
                Cancel
              </Button>
            </DialogClose>
          )}
          <Button
            type="button"
            onClick={() => void submit()}
            disabled={streaming || !description.trim()}
            className="min-w-[130px]"
          >
            {streaming ? (
              <>
                <Loader2 className="size-3.5 mr-1 animate-spin" />
                Drafting…
              </>
            ) : (
              <>
                <Sparkles className="size-3.5 mr-1" />
                Generate
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Live streaming panel ──────────────────────────────────────────

function StreamingPanel({
  status,
  thoughts,
  detectedName,
  detectedLabels,
  thoughtScrollRef,
}: {
  status: string;
  thoughts: string;
  detectedName: string | null;
  detectedLabels: string[];
  thoughtScrollRef: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <div className="space-y-3">
      {/* Status chip */}
      <div className="flex items-center gap-2 rounded-md border border-amber-brand/40 bg-amber-brand/10 px-3 py-2">
        <div className="size-2 rounded-full bg-amber-brand animate-pulse" />
        <p className="text-xs font-medium text-foreground">{status}</p>
      </div>

      {/* Detected name */}
      {detectedName && (
        <div className="rounded-md border border-amber-brand/40 bg-gradient-to-br from-amber-brand/10 to-amber-brand/5 px-3 py-2 animate-in fade-in slide-in-from-top-1 duration-300">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
            Suggested title
          </p>
          <p className="text-sm font-semibold text-foreground mt-0.5">
            {detectedName}
          </p>
        </div>
      )}

      {/* Thinking log */}
      <div className="rounded-md border bg-muted/30 overflow-hidden">
        <div className="flex items-center gap-1.5 border-b bg-background/70 px-3 py-1.5">
          <Brain className="size-3.5 text-muted-foreground" />
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
            Thinking
          </p>
        </div>
        <div
          ref={thoughtScrollRef}
          className="max-h-40 overflow-y-auto p-3 text-xs font-mono leading-relaxed text-muted-foreground whitespace-pre-wrap"
          style={{ scrollbarWidth: "thin" }}
        >
          {thoughts || (
            <span className="italic text-muted-foreground/60">
              Gemini's thought summaries will appear here…
            </span>
          )}
          {thoughts && <span className="inline-block w-1.5 h-3 ml-0.5 bg-foreground/50 animate-pulse" />}
        </div>
      </div>

      {/* Detected fields */}
      <div className="rounded-md border">
        <div className="flex items-center justify-between border-b bg-background/70 px-3 py-1.5">
          <div className="inline-flex items-center gap-1.5">
            <Layers className="size-3.5 text-muted-foreground" />
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
              Fields detected
            </p>
          </div>
          <span className="text-[10px] text-muted-foreground tabular-nums">
            {detectedLabels.length}
          </span>
        </div>
        <div className="p-3">
          {detectedLabels.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">
              Waiting on the first field…
            </p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {detectedLabels.map((label, i) => (
                <span
                  key={`${label}-${i}`}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full border bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500/40 px-2 py-0.5 text-[11px] text-emerald-700 dark:text-emerald-300",
                    "animate-in fade-in slide-in-from-bottom-1 duration-300",
                  )}
                >
                  <Check className="size-3" />
                  {label}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────

/**
 * Convex publishes the deployment URL via the client (e.g.
 * https://abc.convex.cloud). HTTP actions live on the paired convex.site URL
 * (https://abc.convex.site) — the client doesn't expose that directly, but we
 * can derive it from the main URL.
 */
function siteUrlFromConvex(convex: ReturnType<typeof useConvex>): string | null {
  // `url` is a public field on the ConvexReactClient.
  const url = (convex as any).url as string | undefined;
  if (!url) return null;
  return url.replace(/\.convex\.cloud(\/?$|\/)/, ".convex.site$1").replace(/\/$/, "");
}
