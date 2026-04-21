import { useMutation, useQuery } from "convex/react";
import {
  createFileRoute,
  useRouter,
  useNavigate,
  Navigate,
} from "@tanstack/react-router";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Monitor } from "lucide-react";
import { TemplateBuilder } from "@/features/customTemplates/TemplateBuilder";
import { useCurrentMember } from "@/features/auth/useCurrentMember";
import { useSetBreadcrumbs } from "@/components/layout/breadcrumb-context";
import { permits } from "@/lib/permissions";
import { useIsMobile } from "@/hooks/use-is-mobile";
import {
  parseTemplateFields,
  stringifyTemplateFields,
  type TemplateField,
} from "../../../../convex/lib/customTemplates";
import type { BuilderSnapshot } from "@/features/customTemplates/useBuilderState";

export const Route = createFileRoute("/app/templates/$templateId")({
  component: TemplateEditorPage,
});

function TemplateEditorPage() {
  const { templateId } = Route.useParams();
  const navigate = useNavigate();
  const router = useRouter();
  const me = useCurrentMember();
  const isMobile = useIsMobile();
  const canManage = me?.state === "ok" && permits(me, "canManageTestTemplates");
  const template = useQuery(
    api.testTemplates.getById,
    canManage ? { templateId: templateId as Id<"testTemplates"> } : "skip",
  );
  const updateMut = useMutation(api.testTemplates.update);

  useSetBreadcrumbs(
    template
      ? [
          { label: "Templates", href: "/app/templates" },
          { label: template.name },
        ]
      : [{ label: "Templates", href: "/app/templates" }, { label: "…" }],
  );

  if (me === undefined) return null;
  if (me.state !== "ok" || !canManage) {
    return <Navigate to="/app" replace />;
  }
  if (template === undefined) {
    return (
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6 space-y-4">
        <Skeleton className="h-10 w-full max-w-md" />
        <Skeleton className="h-[60vh] w-full" />
      </div>
    );
  }
  if (template === null) {
    return (
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6">
        <p className="text-sm text-muted-foreground">Template not found.</p>
      </div>
    );
  }

  // The builder's 4-column layout (Palette / Canvas / Inspector / Preview)
  // doesn't collapse gracefully under ~768px. Rather than shipping a broken
  // experience, we gate it on mobile and offer the user a path back.
  if (isMobile) {
    return (
      <div className="mx-auto max-w-md px-4 py-10 text-center space-y-6">
        <div className="size-12 rounded-full bg-muted flex items-center justify-center mx-auto">
          <Monitor className="size-6 text-muted-foreground" />
        </div>
        <div className="space-y-2">
          <h1 className="font-heading text-xl font-semibold tracking-tight">
            {template.name}
          </h1>
          <p className="text-sm text-muted-foreground">
            Template editing works best on a larger screen. You can still use
            this template to create reports from your phone.
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <Button asChild>
            <a
              href="/app/templates"
              onClick={(e) => {
                e.preventDefault();
                void navigate({ to: "/app/templates" });
              }}
            >
              Back to templates
            </a>
          </Button>
        </div>
      </div>
    );
  }

  let initialFields: TemplateField[] = [];
  try {
    initialFields = parseTemplateFields(template.fieldsJson);
  } catch {
    initialFields = [];
  }

  const handleSave = async (v: BuilderSnapshot) => {
    await updateMut({
      templateId: templateId as Id<"testTemplates">,
      name: v.name,
      description: v.description,
      fieldsJson: stringifyTemplateFields(v.fields),
    });
  };

  // "Fresh" templates — no name customization yet, no fields — get the
  // starter gallery on mount. This is the "pick a starter, edit, save" flow.
  const offerStarterOnMount =
    initialFields.length === 0 && template.name === "Untitled template";

  return (
    <div className="w-full px-4 sm:px-6 py-4">
      <TemplateBuilder
        key={template._id}
        initialName={template.name}
        initialDescription={template.description ?? ""}
        initialFields={initialFields}
        onSave={handleSave}
        onCancel={() => {
          toast.success("Template saved");
          if (window.history.length > 1) router.history.back();
          else void navigate({ to: "/app/templates" });
        }}
        offerStarterOnMount={offerStarterOnMount}
      />
    </div>
  );
}
