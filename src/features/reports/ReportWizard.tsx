import { ReactNode, useState } from "react";
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
 * On mobile (< sm): shows one step at a time with prev/next navigation
 * and a step indicator. On desktop (>= sm): shows all steps stacked
 * with separators — same as before.
 */
export function ReportWizard({ steps }: Props) {
  const [currentStep, setCurrentStep] = useState(0);

  return (
    <>
      {/* Desktop: all sections visible */}
      <div className="hidden sm:block space-y-6">
        {steps.map((step, i) => (
          <div key={i}>{step.content}</div>
        ))}
      </div>

      {/* Mobile: step-by-step wizard */}
      <div className="sm:hidden">
        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-4 px-1">
          {steps.map((step, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setCurrentStep(i)}
              className={cn(
                "flex-1 h-1 rounded-full transition-all duration-300",
                i === currentStep
                  ? "bg-amber-brand h-1.5"
                  : i < currentStep
                    ? "bg-amber-brand/40"
                    : "bg-muted"
              )}
              aria-label={`Step ${i + 1}: ${step.label}`}
            />
          ))}
        </div>

        {/* Step label */}
        <p className="font-heading text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-1">
          Step {currentStep + 1} of {steps.length} &mdash; {steps[currentStep].label}
        </p>

        {/* Step content */}
        <div className="min-h-[300px]">
          {steps[currentStep].content}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={currentStep === 0}
            onClick={() => setCurrentStep((s) => Math.max(0, s - 1))}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <span className="text-xs text-muted-foreground">
            {currentStep + 1} / {steps.length}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={currentStep === steps.length - 1}
            onClick={() => setCurrentStep((s) => Math.min(steps.length - 1, s + 1))}
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>
    </>
  );
}
