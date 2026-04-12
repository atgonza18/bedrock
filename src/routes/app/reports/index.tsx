import { useMemo, useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ReportStatusBadge } from "@/features/reports/ReportStatusBadge";
import { useSetBreadcrumbs } from "@/components/layout/breadcrumb-context";
import { FileText, FolderKanban, ArrowUpDown, Clock } from "lucide-react";
import { PageTransition } from "@/components/layout/PageTransition";
import { KIND_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/app/reports/")({
  component: MyReportsPage,
});

const STATUS_FILTERS = [
  { value: "all", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "submitted", label: "Submitted" },
  { value: "in_review", label: "In Review" },
  { value: "rejected", label: "Rejected" },
  { value: "approved", label: "Approved" },
  { value: "delivered", label: "Delivered" },
] as const;

const SORT_OPTIONS = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "field_date", label: "Field date" },
  { value: "recently_updated", label: "Recently updated" },
] as const;

function formatShortDate(ts: number | undefined): string {
  if (!ts) return "";
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

/** Get the most relevant date for display based on status. */
function getDisplayDate(r: { status: string; fieldDate?: number; submittedAt?: number; approvedAt?: number; deliveredAt?: number; _creationTime: number }): { label: string; ts: number } {
  if (r.status === "delivered" && r.deliveredAt) return { label: "Delivered", ts: r.deliveredAt };
  if (r.status === "approved" && r.approvedAt) return { label: "Approved", ts: r.approvedAt };
  if ((r.status === "submitted" || r.status === "in_review") && r.submittedAt) return { label: "Submitted", ts: r.submittedAt };
  if (r.fieldDate) return { label: "Field date", ts: r.fieldDate };
  return { label: "Created", ts: r._creationTime };
}

function MyReportsPage() {
  const reports = useQuery(api.reports.queries.listMyReports);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("newest");

  useSetBreadcrumbs([{ label: "My Reports" }]);

  // Filter
  const filtered = useMemo(() => {
    if (!reports) return undefined;
    const base = statusFilter === "all" ? reports : reports.filter((r) => r.status === statusFilter);

    // Sort
    const sorted = [...base];
    switch (sortBy) {
      case "oldest":
        sorted.sort((a, b) => a._creationTime - b._creationTime);
        break;
      case "field_date":
        sorted.sort((a, b) => (b.fieldDate ?? 0) - (a.fieldDate ?? 0));
        break;
      case "recently_updated": {
        const lastActivity = (r: (typeof reports)[number]) =>
          Math.max(r.deliveredAt ?? 0, r.approvedAt ?? 0, r.submittedAt ?? 0, r._creationTime);
        sorted.sort((a, b) => lastActivity(b) - lastActivity(a));
        break;
      }
      case "newest":
      default:
        sorted.sort((a, b) => b._creationTime - a._creationTime);
        break;
    }
    return sorted;
  }, [reports, statusFilter, sortBy]);

  // Compute counts for filter pills
  const counts: Record<string, number> = {};
  if (reports) {
    for (const r of reports) {
      counts[r.status] = (counts[r.status] ?? 0) + 1;
    }
  }

  return (
    <PageTransition>
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-6 space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight">My Reports</h1>
        <p className="text-sm text-muted-foreground mt-1">
          All reports you&rsquo;ve created, across every project.
        </p>
      </div>

      {/* Filters + sort */}
      {reports && reports.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          {/* Status filters */}
          <div className="flex flex-wrap gap-2 flex-1">
            {STATUS_FILTERS.map(({ value, label }) => {
              const count = value === "all" ? reports.length : (counts[value] ?? 0);
              if (value !== "all" && count === 0) return null;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setStatusFilter(value)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
                    statusFilter === value
                      ? "border-foreground/20 bg-foreground/5 text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted",
                  )}
                >
                  {label}
                  <span className="text-muted-foreground">{count}</span>
                </button>
              );
            })}
          </div>

          {/* Sort dropdown */}
          <div className="flex items-center gap-2 shrink-0">
            <ArrowUpDown className="size-3.5 text-muted-foreground" />
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="h-7 w-[160px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

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
              Create a report from a project page. All your reports will
              appear here.
            </p>
          </CardContent>
        </Card>
      ) : filtered && filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-sm text-muted-foreground">
              No reports match this filter.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered?.map((r) => {
            const displayDate = getDisplayDate(r);
            return (
              <Link
                key={r._id}
                to="/app/reports/$reportId"
                params={{ reportId: r._id }}
              >
                <Card className="hover:shadow-md transition-shadow duration-150 group">
                  <CardContent className="py-4">
                    <div className="flex items-center gap-3">
                      <div className="size-9 rounded-lg bg-muted flex items-center justify-center shrink-0 group-hover:bg-amber-brand/10 transition-colors duration-150">
                        <FileText className="size-4 text-muted-foreground group-hover:text-amber-brand transition-colors duration-150" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-sm font-medium">
                            {r.number}
                          </span>
                          <Badge
                            variant="outline"
                            className="text-xs capitalize"
                          >
                            {KIND_LABELS[r.kind] ?? r.kind}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                          <FolderKanban className="h-3 w-3" />
                          {r.projectName}
                        </p>
                        {r.status === "rejected" && r.rejectionReason && (
                          <p className="text-xs text-red-600 dark:text-red-400 mt-1 line-clamp-1 italic">
                            &ldquo;{r.rejectionReason}&rdquo;
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right hidden sm:block">
                          <p className="text-xs text-muted-foreground flex items-center gap-1 justify-end">
                            <Clock className="size-3" />
                            {displayDate.label}
                          </p>
                          <p className="text-xs font-medium mt-0.5">
                            {formatShortDate(displayDate.ts)}
                          </p>
                        </div>
                        <ReportStatusBadge status={r.status} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
    </PageTransition>
  );
}
