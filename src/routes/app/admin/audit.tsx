import { useMemo, useState } from "react";
import { Link, Navigate, createFileRoute } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useCurrentMember } from "@/features/auth/useCurrentMember";
import { useSetBreadcrumbs } from "@/components/layout/breadcrumb-context";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageTransition } from "@/components/layout/PageTransition";
import { reportKindLabel } from "@/lib/constants";
import {
  FilePlus,
  Send,
  Eye,
  CheckCircle,
  XCircle,
  Archive,
  ArchiveRestore,
  Truck,
  Search,
  ActivitySquare,
} from "lucide-react";

export const Route = createFileRoute("/app/admin/audit")({
  component: AuditLogPage,
});

const EVENT_META: Record<
  string,
  { label: string; icon: typeof Send; tone: "neutral" | "good" | "bad" }
> = {
  created: { label: "Created", icon: FilePlus, tone: "neutral" },
  submitted: { label: "Submitted", icon: Send, tone: "neutral" },
  claimed: { label: "Claimed for review", icon: Eye, tone: "neutral" },
  approved: { label: "Approved", icon: CheckCircle, tone: "good" },
  rejected: { label: "Rejected", icon: XCircle, tone: "bad" },
  delivered: { label: "Delivered", icon: Truck, tone: "good" },
  archived: { label: "Archived", icon: Archive, tone: "neutral" },
  restored: { label: "Restored", icon: ArchiveRestore, tone: "neutral" },
};

const EVENT_FILTERS = [
  { value: "all", label: "All events" },
  { value: "created", label: "Created" },
  { value: "submitted", label: "Submitted" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "delivered", label: "Delivered" },
  { value: "archived", label: "Archived" },
] as const;

function formatDateTime(ts: number): string {
  return new Date(ts).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function AuditLogPage() {
  const me = useCurrentMember();
  const entries = useQuery(api.reports.queries.listOrgAuditLog);
  const [search, setSearch] = useState("");
  const [eventFilter, setEventFilter] = useState("all");

  useSetBreadcrumbs([{ label: "Audit log" }]);

  const filtered = useMemo(() => {
    if (!entries) return undefined;
    let out = entries;
    if (eventFilter !== "all") {
      out = out.filter((e) => e.event === eventFilter);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      out = out.filter(
        (e) =>
          e.reportNumber.toLowerCase().includes(q) ||
          e.actorName.toLowerCase().includes(q) ||
          e.event.toLowerCase().includes(q),
      );
    }
    return out;
  }, [entries, search, eventFilter]);

  if (me === undefined) return null;
  if (me.state !== "ok" || me.membership.role !== "admin") {
    return <Navigate to="/app" replace />;
  }

  return (
    <PageTransition>
      <div className="mx-auto max-w-4xl px-4 sm:px-6 py-6 space-y-6" data-stagger>
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight">
            Audit log
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Every state change across every report. Compliance-grade history.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by report number, user, or event…"
              className="pl-8"
            />
          </div>
          <Select value={eventFilter} onValueChange={setEventFilter}>
            <SelectTrigger className="sm:w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {EVENT_FILTERS.map((f) => (
                <SelectItem key={f.value} value={f.value}>
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {filtered === undefined ? (
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="size-10 rounded-full border border-border flex items-center justify-center mb-4">
                <ActivitySquare className="size-4 text-muted-foreground" />
              </div>
              <h3 className="font-heading font-semibold mb-1">No events yet</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                Audit events appear here when reports are created, submitted,
                approved, rejected, delivered, or archived.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="rounded-lg border bg-card overflow-hidden">
            <div className="divide-y">
              {filtered.map((e) => {
                const meta = EVENT_META[e.event] ?? {
                  label: e.event,
                  icon: ActivitySquare,
                  tone: "neutral" as const,
                };
                const Icon = meta.icon;
                const toneClass =
                  meta.tone === "good"
                    ? "text-emerald-700 dark:text-emerald-500"
                    : meta.tone === "bad"
                      ? "text-destructive"
                      : "text-muted-foreground";
                return (
                  <div key={e._id} className="flex items-center gap-3 px-5 py-3">
                    <Icon className={`size-4 shrink-0 ${toneClass}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span className="font-medium text-sm">{meta.label}</span>
                        <Link
                          to="/app/reports/$reportId"
                          params={{ reportId: e.reportId }}
                          className="font-mono text-sm hover:underline"
                        >
                          {e.reportNumber}
                        </Link>
                        {e.reportKind && (
                          <span className="text-xs text-muted-foreground">
                            ·{" "}
                            {reportKindLabel(
                              e.reportKind,
                              e.reportTemplateName,
                            )}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {e.actorName}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                      {formatDateTime(e.at)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </PageTransition>
  );
}
