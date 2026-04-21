import { useEffect, useRef } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation } from "convex/react";
import { z } from "zod";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { Skeleton } from "@/components/ui/skeleton";

const searchSchema = z.object({
  projectId: z.string(),
  templateId: z.string().optional(),
});

export const Route = createFileRoute("/app/reports/new/$kind")({
  validateSearch: searchSchema,
  component: NewReportPage,
});

const VALID_KINDS = [
  "concrete_field",
  "nuclear_density",
  "proof_roll",
  "dcp",
  "pile_load",
  "custom",
] as const;

function NewReportPage() {
  const { kind } = Route.useParams();
  const { projectId, templateId } = Route.useSearch();
  const navigate = useNavigate();
  const createDraft = useMutation(api.reports.mutations.createDraft);
  const calledRef = useRef(false);

  useEffect(() => {
    if (calledRef.current) return;
    calledRef.current = true;

    if (!VALID_KINDS.includes(kind as any)) {
      void navigate({ to: "/app", replace: true });
      return;
    }

    if (kind === "custom" && !templateId) {
      // A custom report requires a template. Without one, send the user back.
      void navigate({ to: "/app", replace: true });
      return;
    }

    void createDraft({
      projectId: projectId as Id<"projects">,
      kind: kind as (typeof VALID_KINDS)[number],
      fieldDate: Date.now(),
      templateId:
        kind === "custom" ? (templateId as Id<"testTemplates">) : undefined,
    }).then((reportId) => {
      void navigate({
        to: "/app/reports/$reportId",
        params: { reportId },
        replace: true,
      });
    });
  }, [kind, projectId, templateId, navigate, createDraft]);

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8 space-y-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-64 w-full" />
      <p className="text-sm text-muted-foreground text-center">
        Creating report...
      </p>
    </div>
  );
}
