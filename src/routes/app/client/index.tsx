import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentMember } from "@/features/auth/useCurrentMember";
import { useSetBreadcrumbs } from "@/components/layout/breadcrumb-context";
import { ReportStatusBadge } from "@/features/reports/ReportStatusBadge";
import { FileText, Download, FolderKanban } from "lucide-react";
import { PageTransition } from "@/components/layout/PageTransition";
import { KIND_LABELS } from "@/lib/constants";

export const Route = createFileRoute("/app/client/")({
  component: ClientDashboard,
});

function ClientDashboard() {
  const me = useCurrentMember();

  // Only client role users should see this page.
  if (me?.state === "ok" && me.membership.role !== "client") {
    return <Navigate to="/app" replace />;
  }

  const reports = useQuery(api.reports.queries.listForClient);

  useSetBreadcrumbs([{ label: "Your Reports" }]);

  const greeting =
    me?.state === "ok"
      ? `Welcome, ${me.profile.fullName.split(" ")[0]}`
      : "Welcome";

  return (
    <PageTransition>
      <div className="mx-auto max-w-5xl px-4 sm:px-6 py-6 space-y-6">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight">
            {greeting}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Approved reports for your projects.
          </p>
        </div>

        {reports === undefined ? (
          <div className="space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : reports.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="size-12 rounded-full bg-amber-brand/10 flex items-center justify-center mb-4">
                <FileText className="size-6 text-amber-brand" />
              </div>
              <h3 className="font-heading font-semibold mb-1">No reports yet</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                Approved reports will appear here once they are ready.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {reports.map((r) => (
              <Link
                key={r._id}
                to="/app/reports/$reportId"
                params={{ reportId: r._id }}
              >
                <Card className="hover:shadow-md transition-shadow duration-150 group">
                  <CardContent className="py-4">
                    <div className="flex items-center gap-3">
                      <div className="size-9 rounded-lg bg-muted flex items-center justify-center shrink-0 group-hover:bg-emerald-50 dark:group-hover:bg-emerald-950/30 transition-colors duration-150">
                        <FileText className="size-4 text-muted-foreground group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors duration-150" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-sm font-medium">
                            {r.number}
                          </span>
                          <Badge variant="outline" className="text-xs capitalize">
                            {KIND_LABELS[r.kind] ?? r.kind.replace(/_/g, " ")}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                          <FolderKanban className="h-3 w-3" />
                          {r.projectName}
                          <span className="font-mono">({r.jobNumber})</span>
                          {r.approvedAt && (
                            <>
                              {" "}&middot; Approved{" "}
                              {new Date(r.approvedAt).toLocaleDateString()}
                            </>
                          )}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <ReportStatusBadge status={r.status} />
                        {r.pdfUrl && (
                          <Button
                            asChild
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <a
                              href={r.pdfUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <Download className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </PageTransition>
  );
}
