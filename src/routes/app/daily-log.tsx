import { useState, useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ReportStatusBadge } from "@/features/reports/ReportStatusBadge";
import { useSetBreadcrumbs } from "@/components/layout/breadcrumb-context";
import { CalendarDays, FileText, FolderKanban } from "lucide-react";
import { PageTransition } from "@/components/layout/PageTransition";
import { KIND_LABELS } from "@/lib/constants";

export const Route = createFileRoute("/app/daily-log")({
  component: DailyLogPage,
});

/** Return the start-of-day timestamp (midnight local) for a Date. */
function startOfDay(d: Date): number {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy.getTime();
}

/** Format a Date as YYYY-MM-DD for the date input. */
function toInputDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function DailyLogPage() {
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());

  useSetBreadcrumbs([{ label: "Daily Log" }]);

  const dayTimestamp = useMemo(() => startOfDay(selectedDate), [selectedDate]);

  const reports = useQuery(api.reports.queries.listDailyLog, {
    date: dayTimestamp,
  });

  // Group reports by project
  const grouped = useMemo(() => {
    if (!reports) return null;
    const map = new Map<string, { projectName: string; reports: typeof reports }>();
    for (const r of reports) {
      const key = r.projectId;
      if (!map.has(key)) {
        map.set(key, { projectName: r.projectName, reports: [] });
      }
      map.get(key)!.reports.push(r);
    }
    return Array.from(map.entries()).map(([projectId, data]) => ({
      projectId,
      ...data,
    }));
  }, [reports]);

  // Summary stats
  const stats = useMemo(() => {
    if (!reports) return null;
    const byKind: Record<string, number> = {};
    for (const r of reports) {
      byKind[r.kind] = (byKind[r.kind] ?? 0) + 1;
    }
    return {
      total: reports.length,
      byKind: Object.entries(byKind).map(([kind, count]) => ({ kind, count })),
    };
  }, [reports]);

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val) {
      // Parse as local date (YYYY-MM-DD input gives local midnight)
      const parts = val.split("-");
      const d = new Date(
        Number(parts[0]),
        Number(parts[1]) - 1,
        Number(parts[2]),
      );
      setSelectedDate(d);
    }
  };

  return (
    <PageTransition>
      <div className="mx-auto max-w-5xl px-4 sm:px-6 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="font-heading text-2xl font-bold tracking-tight">
              Daily Log
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Your field reports for a given day.
            </p>
          </div>
          <Input
            type="date"
            value={toInputDate(selectedDate)}
            onChange={handleDateChange}
            className="w-auto"
          />
        </div>

        {/* Summary stats */}
        {stats && stats.total > 0 && (
          <div className="flex flex-wrap gap-3">
            <Badge variant="secondary" className="text-sm px-3 py-1">
              {stats.total} report{stats.total !== 1 ? "s" : ""}
            </Badge>
            {stats.byKind.map(({ kind, count }) => (
              <Badge key={kind} variant="outline" className="text-xs px-2.5 py-1 capitalize">
                {KIND_LABELS[kind as keyof typeof KIND_LABELS] ?? kind}: {count}
              </Badge>
            ))}
          </div>
        )}

        {/* Report list */}
        {reports === undefined ? (
          <div className="space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : reports.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="size-12 rounded-full bg-muted flex items-center justify-center mb-4">
                <CalendarDays className="size-6 text-muted-foreground" />
              </div>
              <h3 className="font-heading font-semibold mb-1">
                No reports for this day
              </h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                You don&rsquo;t have any field reports with a date on{" "}
                {selectedDate.toLocaleDateString()}. Try selecting a different
                date.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {grouped?.map(({ projectId, projectName, reports: projectReports }) => (
              <Card key={projectId}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FolderKanban className="h-4 w-4 text-muted-foreground" />
                    {projectName}
                  </CardTitle>
                  <CardDescription>
                    {projectReports.length} report
                    {projectReports.length !== 1 ? "s" : ""}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {projectReports.map((r) => (
                    <Link
                      key={r._id}
                      to="/app/reports/$reportId"
                      params={{ reportId: r._id }}
                    >
                      <div className="flex items-center gap-3 rounded-md border px-3 py-2.5 hover:bg-muted/50 transition-colors">
                        <div className="size-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                          <FileText className="size-4 text-muted-foreground" />
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
                              {KIND_LABELS[r.kind as keyof typeof KIND_LABELS] ?? r.kind}
                            </Badge>
                          </div>
                        </div>
                        <ReportStatusBadge status={r.status} />
                      </div>
                    </Link>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </PageTransition>
  );
}
