import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { api } from "../../../../convex/_generated/api";
import { toast } from "sonner";
import { useCurrentMember } from "@/features/auth/useCurrentMember";
import { useSetBreadcrumbs } from "@/components/layout/breadcrumb-context";
import { permits } from "@/lib/permissions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Copy, Archive, RotateCcw } from "lucide-react";
import { parseTemplateFields } from "../../../../convex/lib/customTemplates";

export const Route = createFileRoute("/app/templates/")({
  component: AdminTemplatesPage,
});

function AdminTemplatesPage() {
  const me = useCurrentMember();
  useSetBreadcrumbs([{ label: "Templates" }]);
  const [showArchived, setShowArchived] = useState(false);
  const canManage = me?.state === "ok" && permits(me, "canManageTestTemplates");
  const templates = useQuery(
    api.testTemplates.list,
    canManage ? { includeArchived: showArchived } : "skip",
  );

  if (me === undefined) return null;
  if (me.state !== "ok" || !canManage) {
    return <Navigate to="/app" replace />;
  }
  const createMut = useMutation(api.testTemplates.create);
  const cloneMut = useMutation(api.testTemplates.clone);
  const setStatusMut = useMutation(api.testTemplates.setStatus);

  const handleNew = async () => {
    const id = await createMut({
      name: "Untitled template",
      fieldsJson: "[]",
    });
    window.location.href = `/app/templates/${id}`;
  };

  const active = useMemo(
    () => (templates ?? []).filter((t) => t.status === "active"),
    [templates],
  );
  const archived = useMemo(
    () => (templates ?? []).filter((t) => t.status === "archived"),
    [templates],
  );

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6 space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight">Templates</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Custom test forms for edge cases beyond the five built-in report kinds.
        </p>
      </div>
      <Card>
        <CardHeader className="flex flex-row items-start justify-between">
          <div>
            <CardTitle>Custom test templates</CardTitle>
            <CardDescription>
              Build forms for tests that don't fit the five built-in kinds.
              Templates appear in the "New report" picker for every active
              project.
            </CardDescription>
          </div>
          <Button size="sm" onClick={() => void handleNew()}>
            <Plus className="size-4 mr-1" />
            New template
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {templates === undefined ? (
            <Skeleton className="h-24 w-full" />
          ) : active.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">
              No templates yet. Click "New template" to start — you can name it,
              add fields, and save in one sitting.
            </p>
          ) : (
            <TemplateTable
              rows={active}
              onClone={(id) =>
                void cloneMut({ templateId: id }).then(() =>
                  toast.success("Template duplicated"),
                )
              }
              onArchive={(id) =>
                void setStatusMut({ templateId: id, status: "archived" }).then(
                  () => toast.success("Archived"),
                )
              }
            />
          )}

          <label className="inline-flex items-center gap-2 cursor-pointer pt-2">
            <input
              type="checkbox"
              className="size-3.5 accent-amber-brand"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
            />
            <span className="text-xs text-muted-foreground">
              Show archived ({archived.length})
            </span>
          </label>

          {showArchived && archived.length > 0 && (
            <div className="pt-2">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
                Archived
              </p>
              <TemplateTable
                rows={archived}
                archivedView
                onRestore={(id) =>
                  void setStatusMut({ templateId: id, status: "active" }).then(
                    () => toast.success("Restored"),
                  )
                }
                onClone={(id) =>
                  void cloneMut({ templateId: id }).then(() =>
                    toast.success("Template duplicated"),
                  )
                }
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function TemplateTable({
  rows,
  archivedView,
  onClone,
  onArchive,
  onRestore,
}: {
  rows: Array<{
    _id: any;
    name: string;
    description?: string;
    fieldsJson: string;
    usageCount?: number;
  }>;
  archivedView?: boolean;
  onClone: (id: any) => void;
  onArchive?: (id: any) => void;
  onRestore?: (id: any) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Fields</TableHead>
            <TableHead>Usage</TableHead>
            <TableHead className="w-40" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((t) => {
            let fieldCount = 0;
            try {
              fieldCount = parseTemplateFields(t.fieldsJson).length;
            } catch {
              fieldCount = 0;
            }
            return (
              <TableRow key={t._id}>
                <TableCell>
                  <Link
                    to="/app/templates/$templateId"
                    params={{ templateId: t._id }}
                    className="font-medium hover:underline"
                  >
                    {t.name}
                  </Link>
                  {t.description && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {t.description}
                    </p>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs">
                    {fieldCount} field{fieldCount === 1 ? "" : "s"}
                  </Badge>
                </TableCell>
                <TableCell>
                  {(t.usageCount ?? 0) === 0 ? (
                    <span className="text-xs text-muted-foreground italic">
                      Unused
                    </span>
                  ) : (
                    <Badge variant="secondary" className="text-xs">
                      {t.usageCount} report{t.usageCount === 1 ? "" : "s"}
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="inline-flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => onClone(t._id)}
                      title="Duplicate"
                    >
                      <Copy className="size-3.5" />
                    </Button>
                    {archivedView ? (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => onRestore?.(t._id)}
                        title="Restore"
                      >
                        <RotateCcw className="size-3.5" />
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => onArchive?.(t._id)}
                        title="Archive"
                      >
                        <Archive className="size-3.5" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
