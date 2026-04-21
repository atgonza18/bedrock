import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { api } from "../../../convex/_generated/api";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, ArrowUpDown, UserPlus } from "lucide-react";
import { useCurrentMember } from "@/features/auth/useCurrentMember";
import { useSetBreadcrumbs } from "@/components/layout/breadcrumb-context";
import { permits } from "@/lib/permissions";

export const Route = createFileRoute("/app/allocation")({
  component: AllocationPage,
});

type OrgRoleFilter = "all" | "tech" | "pm" | "admin";
type SortKey = "name" | "load";
type LoadFilter = "all" | "unassigned" | "heavy";

function AllocationPage() {
  const me = useCurrentMember();
  useSetBreadcrumbs([{ label: "Allocation" }]);

  if (me === undefined) {
    return (
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6">
        <Skeleton className="h-10 w-48" />
      </div>
    );
  }
  if (me.state !== "ok" || !permits(me, "canViewAllocation")) {
    return <Navigate to="/app" replace />;
  }

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6 space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight">
          Team allocation
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          See where each tech and PM is assigned across active projects.
        </p>
      </div>
      <AllocationTable canManageTeam={permits(me, "canManageTeam")} />
    </div>
  );
}

function AllocationTable({ canManageTeam }: { canManageTeam: boolean }) {
  const rows = useQuery(api.projects.listAllocations, {});
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<OrgRoleFilter>("all");
  const [loadFilter, setLoadFilter] = useState<LoadFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const filtered = useMemo(() => {
    if (!rows) return undefined;
    const q = search.trim().toLowerCase();
    let out = rows.filter((r) => {
      if (roleFilter !== "all" && r.orgRole !== roleFilter) return false;
      if (loadFilter === "unassigned" && r.assignments.length !== 0) return false;
      if (loadFilter === "heavy" && r.assignments.length < 3) return false;
      if (!q) return true;
      return (
        r.fullName.toLowerCase().includes(q) ||
        (r.email ?? "").toLowerCase().includes(q) ||
        r.assignments.some(
          (a) =>
            a.projectName.toLowerCase().includes(q) ||
            a.jobNumber.toLowerCase().includes(q),
        )
      );
    });
    out = [...out].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "name") {
        cmp = a.fullName.localeCompare(b.fullName);
      } else {
        cmp = a.assignments.length - b.assignments.length;
        if (cmp === 0) cmp = a.fullName.localeCompare(b.fullName);
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return out;
  }, [rows, search, roleFilter, loadFilter, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "load" ? "desc" : "asc");
    }
  };

  const totals = useMemo(() => {
    if (!rows) return null;
    const techs = rows.filter((r) => r.orgRole === "tech").length;
    const unassigned = rows.filter(
      (r) => r.assignments.length === 0 && r.orgRole !== "admin",
    ).length;
    const totalAssignments = rows.reduce(
      (sum, r) => sum + r.assignments.length,
      0,
    );
    return { techs, unassigned, totalAssignments };
  }, [rows]);

  const chipSearch = canManageTeam ? { tab: "team" as const, manage: 1 } : { tab: "team" as const };
  const chipTitleSuffix = canManageTeam ? " Click to reassign." : "";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Roster</CardTitle>
        <CardDescription>
          {canManageTeam
            ? "Click a project chip to open its team dialog and move someone."
            : "Click a project chip to open the project."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {totals && (
          <div className="flex flex-wrap gap-2">
            <StatChip label="Techs" value={totals.techs} />
            <StatChip
              label="Unassigned"
              value={totals.unassigned}
              tone={totals.unassigned > 0 ? "warn" : "neutral"}
            />
            <StatChip label="Active assignments" value={totals.totalAssignments} />
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, or project…"
              className="pl-9"
            />
          </div>
          <Select
            value={roleFilter}
            onValueChange={(v) => setRoleFilter(v as OrgRoleFilter)}
          >
            <SelectTrigger className="w-full sm:w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All roles</SelectItem>
              <SelectItem value="tech">Techs only</SelectItem>
              <SelectItem value="pm">PMs only</SelectItem>
              <SelectItem value="admin">Admins only</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={loadFilter}
            onValueChange={(v) => setLoadFilter(v as LoadFilter)}
          >
            <SelectTrigger className="w-full sm:w-[170px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All load levels</SelectItem>
              <SelectItem value="unassigned">Unassigned (0 projects)</SelectItem>
              <SelectItem value="heavy">Heavy load (3+)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {filtered === undefined ? (
          <Skeleton className="h-48 w-full" />
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">
            {rows && rows.length > 0
              ? "No one matches those filters."
              : "No team members yet. Invite someone from Admin → Users."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 hover:text-foreground"
                      onClick={() => toggleSort("name")}
                    >
                      Name
                      {sortKey === "name" && <ArrowUpDown className="size-3" />}
                    </button>
                  </TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="w-24">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 hover:text-foreground"
                      onClick={() => toggleSort("load")}
                    >
                      Load
                      {sortKey === "load" && <ArrowUpDown className="size-3" />}
                    </button>
                  </TableHead>
                  <TableHead>Assigned projects</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow key={r.userId}>
                    <TableCell className="align-top">
                      <div className="font-medium">{r.fullName}</div>
                      {r.email && (
                        <div className="text-xs text-muted-foreground">
                          {r.email}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="align-top">
                      <Badge variant="outline" className="capitalize">
                        {r.orgRole}
                      </Badge>
                    </TableCell>
                    <TableCell className="align-top">
                      <LoadBadge count={r.assignments.length} />
                    </TableCell>
                    <TableCell className="align-top">
                      {r.assignments.length === 0 ? (
                        <span className="text-sm text-muted-foreground italic">
                          Available — no active assignments
                        </span>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {r.assignments.map((a) => (
                            <Link
                              key={a.assignmentId}
                              to="/app/projects/$projectId"
                              params={{ projectId: a.projectId }}
                              search={chipSearch}
                              className="inline-flex items-center gap-1.5 rounded-md border bg-muted/40 px-2 py-1 text-xs hover:border-amber-brand hover:bg-muted transition-colors"
                              title={`${a.projectName} (${a.jobNumber}) — ${a.role}.${chipTitleSuffix}`}
                            >
                              <span className="font-medium">{a.projectName}</span>
                              <span className="text-muted-foreground">
                                · {a.role}
                              </span>
                            </Link>
                          ))}
                          {canManageTeam && (
                            <Link
                              to="/app/projects"
                              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                              title="Pick a project to assign this person to"
                            >
                              <UserPlus className="size-3" />
                              Reassign…
                            </Link>
                          )}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StatChip({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: number;
  tone?: "neutral" | "warn";
}) {
  return (
    <div
      className={
        tone === "warn"
          ? "inline-flex items-baseline gap-1.5 rounded-md border border-amber-brand/40 bg-amber-brand/10 px-2.5 py-1"
          : "inline-flex items-baseline gap-1.5 rounded-md border bg-muted/40 px-2.5 py-1"
      }
    >
      <span className="text-sm font-semibold tabular-nums">{value}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

function LoadBadge({ count }: { count: number }) {
  if (count === 0) {
    return (
      <Badge variant="outline" className="text-muted-foreground">
        0
      </Badge>
    );
  }
  if (count >= 3) {
    return (
      <Badge variant="default" title="Heavy load">
        {count}
      </Badge>
    );
  }
  return <Badge variant="secondary">{count}</Badge>;
}
