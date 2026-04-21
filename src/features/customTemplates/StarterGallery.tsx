/**
 * Starter gallery — shown when a fresh template is opened, or from a
 * "Browse starters" button in the builder. Picking one replaces the
 * template's fields (with a confirm if there's existing content).
 */
import { cn } from "@/lib/utils";
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
import { STARTER_TEMPLATES, type StarterTemplate } from "./starterTemplates";

const ACCENT_CLASSES: Record<StarterTemplate["accent"], string> = {
  amber: "from-amber-brand/10 to-amber-brand/5 border-amber-brand/40 text-amber-700 dark:text-amber-300",
  sky: "from-sky-500/10 to-sky-500/5 border-sky-500/40 text-sky-700 dark:text-sky-300",
  emerald: "from-emerald-500/10 to-emerald-500/5 border-emerald-500/40 text-emerald-700 dark:text-emerald-300",
  rose: "from-rose-500/10 to-rose-500/5 border-rose-500/40 text-rose-700 dark:text-rose-300",
  violet: "from-violet-500/10 to-violet-500/5 border-violet-500/40 text-violet-700 dark:text-violet-300",
  teal: "from-teal-500/10 to-teal-500/5 border-teal-500/40 text-teal-700 dark:text-teal-300",
};

export type StarterGalleryProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPick: (starter: StarterTemplate) => void;
};

export function StarterGallery({ open, onOpenChange, onPick }: StarterGalleryProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogEyebrow>Start faster</DialogEyebrow>
          <DialogTitle>Pick a starter template</DialogTitle>
          <DialogDescription>
            Every starter is a fork — edit, add, or remove fields once it's on your canvas.
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {STARTER_TEMPLATES.map((t) => (
              <button
                key={t.slug}
                type="button"
                onClick={() => onPick(t)}
                className={cn(
                  "text-left rounded-md border p-4 bg-gradient-to-br transition-all",
                  "hover:shadow-md hover:-translate-y-0.5 active:translate-y-0",
                  ACCENT_CLASSES[t.accent],
                )}
              >
                <div className="flex items-start gap-3">
                  <span className="size-10 inline-flex items-center justify-center rounded-md bg-background/80 border text-xl shrink-0">
                    {t.icon}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {t.name}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground leading-snug">
                      {t.description}
                    </p>
                    {t.fields.length > 0 && (
                      <p className="mt-2 text-[10px] uppercase tracking-wider text-muted-foreground/80">
                        {t.fields.length} field{t.fields.length === 1 ? "" : "s"}
                      </p>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </DialogBody>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="ghost">
              Cancel
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
