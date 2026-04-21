import { ReactNode, useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export type WizardStep = {
  label: string;
  content: ReactNode;
};

type Props = {
  steps: WizardStep[];
};

/**
 * On mobile (< sm): one step at a time with a numeric step indicator.
 * On desktop (>= sm): all steps stacked, unchanged.
 */
export function ReportWizard({ steps }: Props) {
  const [currentStep, setCurrentStep] = useState(0);
  const total = steps.length;
  const mobileTopRef = useRef<HTMLDivElement>(null);
  const firstRender = useRef(true);

  // Scroll to top of the mobile step container when step changes (not on initial render).
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    if (typeof window === "undefined") return;
    if (window.matchMedia("(min-width: 640px)").matches) return;
    mobileTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [currentStep]);

  return (
    <>
      {/* Desktop */}
      <div className="hidden sm:block space-y-6">
        {steps.map((step, i) => (
          <div key={i}>{step.content}</div>
        ))}
      </div>

      {/* Mobile */}
      <div className="sm:hidden">
        <div ref={mobileTopRef} className="scroll-mt-16" aria-hidden />
        <div className="flex items-center justify-between mb-2 px-1">
          <span className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground tabular-nums">
            Step{" "}
            <span className="font-mono text-foreground">
              {String(currentStep + 1).padStart(2, "0")}
            </span>{" "}
            <span className="text-muted-foreground/60">/</span>{" "}
            <span className="font-mono">{String(total).padStart(2, "0")}</span>
          </span>
          <span className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground truncate ml-3">
            {steps[currentStep].label}
          </span>
        </div>

        {/* Segmented progress */}
        <div className="flex items-center gap-1 mb-5 px-1">
          {steps.map((step, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setCurrentStep(i)}
              className={cn(
                "flex-1 h-0.5 rounded-full transition-colors",
                i <= currentStep ? "bg-foreground" : "bg-border",
              )}
              aria-label={`Step ${i + 1}: ${step.label}`}
            />
          ))}
        </div>

        <div className="min-h-[300px]">{steps[currentStep].content}</div>

        <div className="flex items-center justify-between mt-5 pt-3 border-t">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={currentStep === 0}
            onClick={() => setCurrentStep((s) => Math.max(0, s - 1))}
          >
            <ChevronLeft className="size-4" />
            Back
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={currentStep === total - 1}
            onClick={() => setCurrentStep((s) => Math.min(total - 1, s + 1))}
          >
            Next
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>
    </>
  );
}
