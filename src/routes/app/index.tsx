import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCurrentMember } from "@/features/auth/useCurrentMember";
import { useSetBreadcrumbs } from "@/components/layout/breadcrumb-context";
import { ReportStatusBadge } from "@/features/reports/ReportStatusBadge";
import {
  FolderKanban,
  FileText,
  ClipboardCheck,
  ArrowRight,
  TrendingUp,
  Timer,
  AlertTriangle,
  BarChart3,
} from "lucide-react";
import { PageTransition } from "@/components/layout/PageTransition";
import { KIND_LABELS } from "@/lib/constants";

export const Route = createFileRoute("/app/")({
  component: DashboardPage,
});

const BAR_COLORS = [
  "bg-[oklch(0.75_0.16_75)]",
  "bg-[oklch(0.55_0.08_250)]",
  "bg-[oklch(0.65_0.12_145)]",
  "bg-[oklch(0.60_0.15_30)]",
  "bg-[oklch(0.55_0.12_290)]",
];

function formatTurnaround(hours: number | null): string {
  if (hours === null) return "--";
  if (hours < 48) return `${Math.round(hours)}h`;
  const days = hours / 24;
  return `${days.toFixed(1)}d`;
}

function DashboardPage() {
  const me = useCurrentMember();

  // Client users get redirected to their dashboard.
  if (me?.state === "ok" && me.membership.role === "client") {
    return <Navigate to="/app/client" replace />;
  }

  const isAdmin = me?.state === "ok" && me.membership.role === "admin";
  const isPmOrAdmin =
    me?.state === "ok" &&
    (me.membership.role === "pm" || me.membership.role === "admin");

  const projects = useQuery(api.projects.list);
  const myReports = useQuery(api.reports.queries.listMyReports);
  const queue = useQuery(
    api.reports.queries.listReviewQueue,
    isPmOrAdmin ? {} : "skip",
  );
  const adminStats = useQuery(
    api.reports.queries.getAdminDashboardStats,
    isAdmin ? {} : "skip",
  );

  useSetBreadcrumbs([{ label: "Dashboard" }]);

  const greeting =
    me?.state === "ok"
      ? `Welcome back, ${me.profile.fullName.split(" ")[0]}`
      : "Welcome back";

  return (
    <PageTransition>
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6 space-y-8">
      {/* Greeting */}
      <div>
        <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight">
          {greeting}
        </h1>
        <p className="text-muted-foreground mt-1">
          Here&rsquo;s what&rsquo;s happening with your field testing.
        </p>
      </div>

      {/* Needs Attention */}
      {(() => {
        const rejectedCount = myReports?.filter(r => r.status === "rejected").length ?? 0;
        const submittedCount = queue?.filter(r => r.status === "submitted").length ?? 0;
        const hasAlerts = rejectedCount > 0 || (isPmOrAdmin && queue && queue.length > 0);
        if (!hasAlerts) return null;
        return (
          <div className="space-y-3">
            {rejectedCount > 0 && (
              <Card className="border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/20">
                <CardContent className="py-4">
                  <div className="flex items-center gap-3">
                    <div className="size-9 rounded-lg bg-red-100 dark:bg-red-900/50 flex items-center justify-center shrink-0">
                      <AlertTriangle className="size-4 text-red-600 dark:text-red-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-red-800 dark:text-red-300">
                        {rejectedCount} report{rejectedCount !== 1 ? "s" : ""} need{rejectedCount === 1 ? "s" : ""} corrections
                      </p>
                      <p className="text-xs text-red-600/80 dark:text-red-400/80 mt-0.5">
                        A reviewer requested changes. Fix and resubmit to continue the approval process.
                      </p>
                    </div>
                    <Button asChild size="sm" variant="outline" className="shrink-0 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/50">
                      <Link to="/app/reports">Review</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
            {isPmOrAdmin && queue && queue.length > 0 && (
              <Card className="border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20">
                <CardContent className="py-4">
                  <div className="flex items-center gap-3">
                    <div className="size-9 rounded-lg bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center shrink-0">
                      <ClipboardCheck className="size-4 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                        {submittedCount} report{submittedCount !== 1 ? "s" : ""} awaiting review
                      </p>
                      <p className="text-xs text-amber-600/80 dark:text-amber-400/80 mt-0.5">
                        Field reports are waiting for your review and approval.
                      </p>
                    </div>
                    <Button asChild size="sm" variant="outline" className="shrink-0 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/50">
                      <Link to="/app/queue">Review queue</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        );
      })()}

      {/* Executive Ops Metrics — admin only */}
      {isAdmin && (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="size-4 text-muted-foreground" aria-hidden="true" />
            <h2 className="text-xs font-heading font-semibold text-muted-foreground uppercase tracking-wider">
              Ops Metrics
            </h2>
            <span className="text-xs text-muted-foreground/60">&middot; Last 30 days</span>
          </div>

          {adminStats === undefined ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i} className="overflow-hidden">
                  <CardContent className="py-5">
                    <div className="flex items-center justify-between">
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-8 w-16" />
                        <Skeleton className="h-3 w-20" />
                      </div>
                      <Skeleton className="size-11 rounded-xl" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <ExecMetricCard
                  label="Reports Delivered"
                  value={adminStats.deliveredCount}
                  unit="last 30 days"
                  icon={TrendingUp}
                  accent="from-blue-500/10 to-indigo-500/5"
                  iconColor="text-blue-600"
                  dimZero
                />
                <ExecMetricCard
                  label="Avg Turnaround"
                  value={formatTurnaround(adminStats.avgTurnaroundHours)}
                  unit="field to delivery"
                  icon={Timer}
                  accent="from-amber-brand/10 to-amber-600/5"
                  iconColor="text-amber-600"
                />
                <ExecMetricCard
                  label="Review Queue"
                  value={adminStats.queueDepth}
                  unit={`${adminStats.submittedCount} submitted \u00B7 ${adminStats.inReviewCount} in review`}
                  icon={ClipboardCheck}
                  accent="from-emerald-500/10 to-emerald-600/5"
                  iconColor="text-emerald-600"
                  dimZero
                />
                <ExecMetricCard
                  label="Rejection Rate"
                  value={adminStats.rejectionRate !== null ? `${adminStats.rejectionRate}%` : "--"}
                  unit={
                    adminStats.rejectionRate !== null
                      ? `${adminStats.rejectedCount} of ${adminStats.rejectedCount + adminStats.approvedCount} decisions`
                      : "no decisions yet"
                  }
                  icon={AlertTriangle}
                  accent="from-red-500/8 to-rose-500/4"
                  iconColor="text-red-500"
                />
              </div>

              {/* Kind breakdown */}
              <KindBreakdown data={adminStats.deliveredByKind} />
            </>
          )}
        </section>
      )}

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatsCard
          title="Active Projects"
          value={projects?.length}
          icon={FolderKanban}
          href="/app/projects"
          accent="from-blue-500/10 to-blue-600/5"
          iconColor="text-blue-600"
        />
        <StatsCard
          title="My Reports"
          value={myReports?.length}
          icon={FileText}
          href="/app/reports"
          accent="from-amber-brand/10 to-amber-600/5"
          iconColor="text-amber-600"
        />
        {isPmOrAdmin && (
          <StatsCard
            title="Review Queue"
            value={Array.isArray(queue) ? queue.length : undefined}
            icon={ClipboardCheck}
            href="/app/queue"
            accent="from-emerald-500/10 to-emerald-600/5"
            iconColor="text-emerald-600"
          />
        )}
      </div>

      {/* Quick access sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent reports */}
        <Card className="overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-heading font-semibold">
              Recent Reports
            </CardTitle>
            <Button asChild variant="ghost" size="sm" className="text-xs">
              <Link to="/app/reports">
                View all
                <ArrowRight className="h-3 w-3 ml-1" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {myReports === undefined ? (
              <div className="space-y-3">
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
              </div>
            ) : myReports.length === 0 ? (
              <div className="py-8 text-center">
                <FileText className="size-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  No reports yet. Create one from a project.
                </p>
              </div>
            ) : (
              <div className="space-y-0.5">
                {myReports.slice(0, 5).map((r) => (
                  <Link
                    key={r._id}
                    to="/app/reports/$reportId"
                    params={{ reportId: r._id }}
                    className="flex items-center justify-between rounded-lg px-3 py-2.5 hover:bg-accent transition-colors duration-150 group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="size-8 rounded-md bg-muted flex items-center justify-center shrink-0 group-hover:bg-amber-brand/10 transition-colors duration-150">
                        <FileText className="size-3.5 text-muted-foreground group-hover:text-amber-brand transition-colors duration-150" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium font-mono truncate">
                          {r.number}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {r.projectName} &middot;{" "}
                          <span className="capitalize">
                            {KIND_LABELS[r.kind] ?? r.kind}
                          </span>
                        </p>
                      </div>
                    </div>
                    <ReportStatusBadge status={r.status} />
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent projects */}
        <Card className="overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-heading font-semibold">
              Projects
            </CardTitle>
            <Button asChild variant="ghost" size="sm" className="text-xs">
              <Link to="/app/projects">
                View all
                <ArrowRight className="h-3 w-3 ml-1" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {projects === undefined ? (
              <div className="space-y-3">
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
              </div>
            ) : projects.length === 0 ? (
              <div className="py-8 text-center">
                <FolderKanban className="size-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  No projects yet. An admin can create one.
                </p>
              </div>
            ) : (
              <div className="space-y-0.5">
                {projects.slice(0, 5).map((p) => (
                  <Link
                    key={p._id}
                    to="/app/projects/$projectId"
                    params={{ projectId: p._id }}
                    className="flex items-center justify-between rounded-lg px-3 py-2.5 hover:bg-accent transition-colors duration-150 group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="size-8 rounded-md bg-muted flex items-center justify-center shrink-0 group-hover:bg-blue-500/10 transition-colors duration-150">
                        <FolderKanban className="size-3.5 text-muted-foreground group-hover:text-blue-600 transition-colors duration-150" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {p.name}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {p.jobNumber}
                          {p.city && p.state
                            ? ` \u00B7 ${p.city}, ${p.state}`
                            : ""}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="shrink-0 text-xs">
                      {p.status}
                    </Badge>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
    </PageTransition>
  );
}

// ─── Executive Metric Card ───────────────────────────────────────────────────

function ExecMetricCard({
  label,
  value,
  unit,
  icon: Icon,
  accent,
  iconColor,
  dimZero,
}: {
  label: string;
  value: string | number;
  unit?: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
  iconColor: string;
  dimZero?: boolean;
}) {
  const isZero = value === 0 || value === "0";
  const isDim = value === "--" || (dimZero && isZero);

  return (
    <Card className="relative overflow-hidden group">
      {/* Gradient accent on hover */}
      <div
        className={`absolute inset-0 bg-gradient-to-br ${accent} opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none`}
      />
      <CardContent className="relative py-5">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-sm text-muted-foreground font-medium">
              {label}
            </p>
            <p
              className={`font-heading text-2xl font-bold tracking-tight mt-1 ${
                isDim ? "text-muted-foreground/50" : ""
              }`}
            >
              {value}
            </p>
            {unit && (
              <p className="text-xs text-muted-foreground mt-0.5">{unit}</p>
            )}
          </div>
          <div className="size-11 rounded-xl bg-muted flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-200">
            <Icon className={`size-5 ${iconColor}`} aria-hidden="true" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Kind Breakdown (CSS bar chart) ──────────────────────────────────────────

function KindBreakdown({
  data,
}: {
  data: { kind: string; count: number }[];
}) {
  if (data.length === 0) {
    return (
      <Card className="overflow-hidden">
        <CardContent className="flex flex-col items-center justify-center py-10 text-center">
          <BarChart3 className="size-8 text-muted-foreground/20 mb-2" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">
            No reports delivered in the last 30 days.
          </p>
        </CardContent>
      </Card>
    );
  }

  const maxCount = Math.max(...data.map((d) => d.count));

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-heading font-semibold">
          Volume by Test Type
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 pb-5">
        {data.map((d, i) => {
          const pct = maxCount > 0 ? (d.count / maxCount) * 100 : 0;
          const color = BAR_COLORS[i % BAR_COLORS.length];

          return (
            <div key={d.kind} className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground w-28 sm:w-36 lg:w-44 shrink-0 truncate">
                {KIND_LABELS[d.kind] ?? d.kind.replace(/_/g, " ")}
              </span>
              <div className="flex-1 h-7 bg-muted/60 rounded-md overflow-hidden">
                <div
                  className={`h-full ${color} rounded-md transition-all duration-500 ease-out`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="text-sm font-mono font-semibold w-8 text-right shrink-0 tabular-nums">
                {d.count}
              </span>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

// ─── Stats Card (existing) ───────────────────────────────────────────────────

function StatsCard({
  title,
  value,
  icon: Icon,
  href,
  accent,
  iconColor,
}: {
  title: string;
  value: number | undefined;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  accent: string;
  iconColor: string;
}) {
  return (
    <Link to={href}>
      <Card className="relative overflow-hidden hover:shadow-md transition-shadow duration-150 group">
        {/* Gradient accent — sits behind everything, fills full card */}
        <div
          className={`absolute inset-0 bg-gradient-to-br ${accent} opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none`}
        />
        <CardContent className="relative py-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground font-medium">
                {title}
              </p>
              {value !== undefined ? (
                <p className="font-heading text-3xl font-bold tracking-tight mt-1">
                  {value}
                </p>
              ) : (
                <Skeleton className="h-9 w-12 mt-1" />
              )}
            </div>
            <div className="size-11 rounded-xl bg-muted flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
              <Icon className={`size-5 ${iconColor}`} />
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
