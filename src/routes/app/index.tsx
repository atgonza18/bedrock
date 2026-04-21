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
} from "lucide-react";
import { PageTransition } from "@/components/layout/PageTransition";
import { KIND_LABELS, reportKindLabel } from "@/lib/constants";
import { TestKindIcon } from "@/components/test-icons";
import { kindColor } from "@/lib/test-kind-colors";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

export const Route = createFileRoute("/app/")({
  component: DashboardPage,
});

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
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6 space-y-8" data-stagger>
      {/* Greeting */}
      <div>
        <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight">
          {greeting}
        </h1>
        <p className="text-muted-foreground mt-1">
          Here&rsquo;s what&rsquo;s happening with your field testing.
        </p>
      </div>

      {/* Resume draft — field techs most recent in-progress report. Surfaces
          above everything else on mobile so the most likely next action is
          one tap away. */}
      {(() => {
        if (!myReports) return null;
        if (isPmOrAdmin) return null;
        const draft = myReports.find(
          (r) => r.status === "draft" || r.status === "rejected",
        );
        if (!draft) return null;
        return (
          <Link
            to="/app/reports/$reportId"
            params={{ reportId: draft._id }}
            className="block rounded-lg border bg-card hover:shadow-md transition-shadow"
          >
            <div className="p-4 flex items-center gap-3">
              <div className="size-10 rounded-md bg-amber-brand/10 flex items-center justify-center shrink-0">
                <FileText className="size-5 text-amber-brand" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Resume draft
                </p>
                <p className="text-sm font-medium font-mono truncate">
                  {draft.number}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {draft.projectName} ·{" "}
                  {reportKindLabel(draft.kind, draft.templateName)}
                </p>
              </div>
              <ArrowRight className="size-4 text-muted-foreground" />
            </div>
          </Link>
        );
      })()}

      {/* Needs Attention */}
      {(() => {
        const rejectedCount = myReports?.filter(r => r.status === "rejected").length ?? 0;
        const submittedCount = queue?.filter(r => r.status === "submitted").length ?? 0;
        const hasAlerts = rejectedCount > 0 || (isPmOrAdmin && queue && queue.length > 0);
        if (!hasAlerts) return null;
        return (
          <div className="space-y-2">
            {rejectedCount > 0 && (
              <AlertRow
                tone="destructive"
                title={`${rejectedCount} report${rejectedCount !== 1 ? "s" : ""} need${rejectedCount === 1 ? "s" : ""} corrections`}
                body="A reviewer requested changes. Fix and resubmit to continue the approval process."
                action={{ label: "Review", href: "/app/reports" }}
              />
            )}
            {isPmOrAdmin && queue && queue.length > 0 && (
              <AlertRow
                tone="attention"
                title={`${submittedCount} report${submittedCount !== 1 ? "s" : ""} awaiting review`}
                body="Field reports are waiting for your review and approval."
                action={{ label: "Review queue", href: "/app/queue" }}
              />
            )}
          </div>
        );
      })()}

      {/* Executive Ops Metrics — admin only */}
      {isAdmin && (
        <section className="space-y-5">
          <div className="flex items-baseline gap-3">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Operations
            </h2>
            <span className="text-[11px] tracking-[0.12em] uppercase text-muted-foreground/60">
              Last 30 days
            </span>
            <div className="flex-1 h-px bg-border/70" />
          </div>

          {adminStats === undefined ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 border rounded-lg overflow-hidden divide-x divide-y sm:divide-y-0 lg:divide-y-0 divide-border">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="p-5 space-y-2">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-9 w-20" />
                  <Skeleton className="h-3 w-28" />
                </div>
              ))}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 border rounded-lg overflow-hidden divide-x divide-y lg:divide-y-0 divide-border bg-card">
                <ExecMetric
                  label="Reports delivered"
                  value={adminStats.deliveredCount}
                  hint="Last 30 days"
                  dimZero
                  delta={pctDelta(
                    adminStats.deliveredCount,
                    adminStats.prevDeliveredCount,
                  )}
                  trendPositive="up"
                />
                <ExecMetric
                  label="Avg turnaround"
                  value={formatTurnaround(adminStats.avgTurnaroundHours)}
                  hint="Field to delivery"
                  delta={pctDelta(
                    adminStats.avgTurnaroundHours,
                    adminStats.prevAvgTurnaroundHours,
                  )}
                  trendPositive="down"
                />
                <ExecMetric
                  label="Review queue"
                  value={adminStats.queueDepth}
                  hint={`${adminStats.submittedCount} submitted · ${adminStats.inReviewCount} in review`}
                  dimZero
                />
                <ExecMetric
                  label="Rejection rate"
                  value={adminStats.rejectionRate !== null ? `${adminStats.rejectionRate}%` : "--"}
                  hint={
                    adminStats.rejectionRate !== null
                      ? `${adminStats.rejectedCount} of ${adminStats.rejectedCount + adminStats.approvedCount} decisions`
                      : "No decisions yet"
                  }
                  delta={pctDelta(
                    adminStats.rejectionRate,
                    adminStats.prevRejectionRate,
                  )}
                  trendPositive="down"
                />
              </div>

              {/* Two-column: kind breakdown + activity heatmap */}
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                <div className="lg:col-span-2">
                  <KindBreakdown data={adminStats.deliveredByKind} />
                </div>
                <div className="lg:col-span-3">
                  <ActivityHeatmap
                    cells={adminStats.heatmap.cells}
                    max={adminStats.heatmap.max}
                  />
                </div>
              </div>
            </>
          )}
        </section>
      )}

      {/* Stats cards */}
      {!isAdmin && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <StatsCard
            title="Active projects"
            value={projects?.length}
            icon={FolderKanban}
            href="/app/projects"
          />
          <StatsCard
            title="My reports"
            value={myReports?.length}
            icon={FileText}
            href="/app/reports"
          />
          {isPmOrAdmin && (
            <StatsCard
              title="Review queue"
              value={Array.isArray(queue) ? queue.length : undefined}
              icon={ClipboardCheck}
              href="/app/queue"
            />
          )}
        </div>
      )}

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
                            {reportKindLabel(r.kind, r.templateName)}
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

// ─── Alert row (attention / destructive) ────────────────────────────────────

function AlertRow({
  tone,
  title,
  body,
  action,
}: {
  tone: "attention" | "destructive";
  title: string;
  body: string;
  action: { label: string; href: string };
}) {
  const borderColor =
    tone === "destructive" ? "border-l-destructive" : "border-l-amber-brand";
  return (
    <Card className={`border-l-4 ${borderColor}`}>
      <CardContent className="py-4">
        <div className="flex items-center gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">{title}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{body}</p>
          </div>
          <Button asChild size="sm" variant="outline" className="shrink-0">
            <Link to={action.href}>
              {action.label}
              <ArrowRight className="size-3.5" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Trend delta computation ───────────────────────────────────────────────
// Returns null if either value is null OR prior is zero (no baseline).

function pctDelta(
  current: number | null | undefined,
  prior: number | null | undefined,
): number | null {
  if (current == null || prior == null) return null;
  if (prior === 0) return null;
  return Math.round(((current - prior) / prior) * 1000) / 10;
}

// ─── Executive metric cell (inside grouped panel) ──────────────────────────

function ExecMetric({
  label,
  value,
  hint,
  dimZero,
  delta,
  trendPositive = "up",
}: {
  label: string;
  value: string | number;
  hint?: string;
  dimZero?: boolean;
  /** Signed percentage (+12.5 means 12.5% higher than prior window). */
  delta?: number | null;
  /** Which direction of change is "good"; controls the delta color. */
  trendPositive?: "up" | "down";
}) {
  const isZero = value === 0 || value === "0";
  const isDim = value === "--" || (dimZero && isZero);

  const deltaTone =
    delta == null || delta === 0
      ? "neutral"
      : (trendPositive === "up" ? delta > 0 : delta < 0)
        ? "good"
        : "bad";

  return (
    <div className="p-5 space-y-1.5">
      <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </p>
      <div className="flex items-baseline gap-2.5">
        <p
          className={cn(
            "font-heading text-3xl font-semibold tracking-tight tabular-nums",
            isDim && "text-muted-foreground/50",
          )}
        >
          {value}
        </p>
        {delta != null && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 text-xs font-medium tabular-nums",
              deltaTone === "good" && "text-emerald-600 dark:text-emerald-500",
              deltaTone === "bad" && "text-destructive",
              deltaTone === "neutral" && "text-muted-foreground",
            )}
            title={`${delta > 0 ? "+" : ""}${delta}% vs prior 30 days`}
          >
            {delta === 0 ? (
              <Minus className="size-3" strokeWidth={2.5} />
            ) : delta > 0 ? (
              <TrendingUp className="size-3" strokeWidth={2.5} />
            ) : (
              <TrendingDown className="size-3" strokeWidth={2.5} />
            )}
            {delta > 0 ? "+" : ""}
            {delta}%
          </span>
        )}
      </div>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

// ─── Activity heatmap (7×24 hour-of-week delivery grid) ─────────────────────

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function ActivityHeatmap({
  cells,
  max,
}: {
  cells: number[][];
  max: number;
}) {
  // Reorder rows to Mon–Sun (more natural for a work-centric view).
  const reordered = [1, 2, 3, 4, 5, 6, 0].map((d) => ({
    label: DAY_LABELS[d],
    row: cells[d],
  }));

  const ticks = [0, 6, 12, 18, 23];

  return (
    <div className="rounded-lg border bg-card h-full flex flex-col">
      <div className="px-5 py-3 border-b flex items-baseline justify-between">
        <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
          Delivery activity
        </p>
        <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground/70">
          Hour of week · last 30 days
        </p>
      </div>
      <div className="p-5 flex-1 flex flex-col justify-center">
        {max === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            No deliveries in the last 30 days.
          </p>
        ) : (
          <div className="space-y-1.5">
            {reordered.map(({ label, row }) => (
              <div key={label} className="flex items-center gap-2">
                <span className="w-7 text-[10px] uppercase tracking-[0.1em] text-muted-foreground tabular-nums">
                  {label}
                </span>
                <div className="flex-1 grid grid-cols-[repeat(24,minmax(0,1fr))] gap-0.5">
                  {row.map((v, h) => {
                    const intensity = v === 0 ? 0 : 0.12 + (v / max) * 0.88;
                    return (
                      <div
                        key={h}
                        className="aspect-square rounded-[2px]"
                        style={{
                          backgroundColor:
                            v === 0
                              ? "var(--muted)"
                              : `color-mix(in oklch, var(--amber-brand) ${intensity * 100}%, transparent)`,
                        }}
                        title={`${label} ${String(h).padStart(2, "0")}:00 — ${v} deliver${v === 1 ? "y" : "ies"}`}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
            <div className="flex items-center gap-2 pt-1">
              <span className="w-7" />
              <div className="flex-1 grid grid-cols-[repeat(24,minmax(0,1fr))] gap-0.5 text-[9px] text-muted-foreground tabular-nums">
                {Array.from({ length: 24 }).map((_, h) => (
                  <div key={h} className="text-center">
                    {ticks.includes(h) ? String(h).padStart(2, "0") : ""}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Volume by test type ────────────────────────────────────────────────────

function KindBreakdown({
  data,
}: {
  data: { kind: string; count: number }[];
}) {
  if (data.length === 0) {
    return (
      <div className="rounded-lg border py-8 px-5 text-center text-sm text-muted-foreground bg-card">
        No reports delivered in the last 30 days.
      </div>
    );
  }

  const maxCount = Math.max(...data.map((d) => d.count));

  return (
    <div className="rounded-lg border bg-card h-full flex flex-col">
      <div className="px-5 py-3 border-b">
        <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
          Volume by test type
        </p>
      </div>
      <div className="px-5 py-4 space-y-3 flex-1">
        {data.map((d) => {
          const pct = maxCount > 0 ? (d.count / maxCount) * 100 : 0;
          const c = kindColor(d.kind);
          return (
            <div key={d.kind} className="flex items-center gap-3">
              <div className="flex items-center gap-2 w-32 shrink-0 min-w-0">
                <TestKindIcon
                  kind={d.kind}
                  width={14}
                  height={14}
                  className="shrink-0"
                  style={{ color: c.oklch }}
                />
                <span className="text-sm truncate">
                  {KIND_LABELS[d.kind] ?? d.kind.replace(/_/g, " ")}
                </span>
              </div>
              <div className="flex-1 h-2 bg-muted/60 rounded-sm overflow-hidden">
                <div
                  className="h-full rounded-sm transition-all duration-500 ease-out"
                  style={{ width: `${pct}%`, backgroundColor: c.oklch }}
                />
              </div>
              <span className="text-sm font-mono font-medium w-6 text-right shrink-0 tabular-nums text-muted-foreground">
                {d.count}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Stats card (non-admin quick nav) ──────────────────────────────────────

function StatsCard({
  title,
  value,
  icon: Icon,
  href,
}: {
  title: string;
  value: number | undefined;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
}) {
  return (
    <Link to={href}>
      <Card className="hover:border-foreground/20 transition-colors">
        <CardContent className="py-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                {title}
              </p>
              {value !== undefined ? (
                <p className="font-heading text-3xl font-semibold tracking-tight mt-1 tabular-nums">
                  {value}
                </p>
              ) : (
                <Skeleton className="h-9 w-12 mt-1" />
              )}
            </div>
            <Icon className="size-5 text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
