import { useEffect, useState } from "react";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { z } from "zod";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogEyebrow,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ReportStatusBadge } from "@/features/reports/ReportStatusBadge";
import { useSetBreadcrumbs } from "@/components/layout/breadcrumb-context";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Plus,
  FileText,
  Users,
  Mail,
  MapPin,
  Building2,
  Settings,
  Layers,
  Pencil,
  Trash2,
} from "lucide-react";
import { PageTransition } from "@/components/layout/PageTransition";
import { reportKindLabel } from "@/lib/constants";
import { useCurrentMember } from "@/features/auth/useCurrentMember";
import { canCreateReport, canReview, permits } from "@/lib/permissions";
import { TestKindIcon } from "@/components/test-icons";
import { ClipboardList } from "lucide-react";

const REPORT_KINDS = [
  { kind: "concrete_field", label: "Concrete Field Test" },
  { kind: "nuclear_density", label: "Nuclear Density" },
  { kind: "proof_roll", label: "Proof Roll" },
  { kind: "dcp", label: "DCP" },
  { kind: "pile_load", label: "Pile Load Test" },
] as const;

const searchSchema = z.object({
  tab: z
    .enum(["reports", "team", "recipients", "specs", "pile-types"])
    .optional(),
  manage: z.coerce.number().optional(),
});

export const Route = createFileRoute("/app/projects/$projectId")({
  validateSearch: searchSchema,
  component: ProjectDetailPage,
});

function ProjectDetailPage() {
  const { projectId } = Route.useParams();
  const search = Route.useSearch();
  const router = useRouter();
  const me = useCurrentMember();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<string>(search.tab ?? "reports");
  useEffect(() => {
    if (search.tab) setActiveTab(search.tab);
  }, [search.tab]);
  const showNewReport = me?.state === "ok" && canCreateReport(me);
  const data = useQuery(api.projects.getById, {
    projectId: projectId as Id<"projects">,
  });
  const reports = useQuery(api.reports.queries.listByProject, {
    projectId: projectId as Id<"projects">,
  });

  useSetBreadcrumbs(
    data
      ? [
          { label: "Projects", href: "/app/projects" },
          { label: data.project.name },
        ]
      : [{ label: "Projects", href: "/app/projects" }, { label: "Loading..." }],
  );

  if (data === undefined) {
    return (
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6 space-y-4">
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  const { project, client, assignments, defaultRecipients } = data;
  const canManageTeam = me?.state === "ok" && permits(me, "canManageTeam");

  return (
    <PageTransition>
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="mt-0.5 shrink-0"
          onClick={() => {
            if (window.history.length > 1) {
              router.history.back();
            } else {
              void router.navigate({ to: "/app/projects" });
            }
          }}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="font-heading text-2xl font-bold tracking-tight">{project.name}</h1>
            <Badge variant="outline">{project.status}</Badge>
          </div>
          <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1 flex-wrap">
            <span className="font-mono">{project.jobNumber}</span>
            {client && (
              <span className="inline-flex items-center gap-1">
                <Building2 className="h-3 w-3" />
                {client.name}
              </span>
            )}
            {project.city && project.state && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {project.city}, {project.state}
              </span>
            )}
          </div>
        </div>
        {showNewReport && (
          <NewReportMenu projectId={project._id} />
        )}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList variant="line">
          <TabsTrigger value="reports" className="gap-1.5 px-3">
            <FileText className="h-3.5 w-3.5" />
            Reports
            {reports && reports.length > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs h-5 min-w-5 px-1">
                {reports.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="team" className="gap-1.5 px-3">
            <Users className="h-3.5 w-3.5" />
            Team
          </TabsTrigger>
          <TabsTrigger value="recipients" className="gap-1.5 px-3">
            <Mail className="h-3.5 w-3.5" />
            Recipients
          </TabsTrigger>
          <TabsTrigger value="specs" className="gap-1.5 px-3">
            <Settings className="h-3.5 w-3.5" />
            Specs
          </TabsTrigger>
          <TabsTrigger value="pile-types" className="gap-1.5 px-3">
            <Layers className="h-3.5 w-3.5" />
            Pile Types
          </TabsTrigger>
        </TabsList>

        <TabsContent value="reports" className="mt-4">
          {/* Summary + filters */}
          {reports && reports.length > 0 && (
            <div className="mb-4 space-y-3">
              {/* Status summary chips */}
              <div className="flex flex-wrap gap-2">
                {(() => {
                  const counts: Record<string, number> = {};
                  for (const r of reports) {
                    counts[r.status] = (counts[r.status] ?? 0) + 1;
                  }
                  const allStatuses = ["draft", "submitted", "in_review", "rejected", "approved", "delivered"];
                  const statusLabels: Record<string, string> = {
                    draft: "Draft",
                    submitted: "Submitted",
                    in_review: "In Review",
                    rejected: "Rejected",
                    approved: "Approved",
                    delivered: "Delivered",
                  };
                  return (
                    <>
                      <button
                        type="button"
                        onClick={() => setStatusFilter("all")}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
                          statusFilter === "all"
                            ? "border-foreground/20 bg-foreground/5 text-foreground"
                            : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted"
                        )}
                      >
                        All
                        <span className="text-muted-foreground">{reports.length}</span>
                      </button>
                      {allStatuses.map((s) => {
                        const count = counts[s];
                        if (!count) return null;
                        return (
                          <button
                            key={s}
                            type="button"
                            onClick={() => setStatusFilter(s)}
                            className={cn(
                              "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
                              statusFilter === s
                                ? "border-foreground/20 bg-foreground/5 text-foreground"
                                : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted"
                            )}
                          >
                            {statusLabels[s] ?? s}
                            <span className="text-muted-foreground">{count}</span>
                          </button>
                        );
                      })}
                    </>
                  );
                })()}
              </div>
            </div>
          )}
          {reports === undefined ? (
            <div className="space-y-3">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : reports.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <div className="size-10 rounded-full bg-muted flex items-center justify-center mb-3">
                  <FileText className="size-5 text-muted-foreground" />
                </div>
                <h3 className="font-semibold text-sm mb-1">No reports yet</h3>
                <p className="text-sm text-muted-foreground">
                  Click &ldquo;New report&rdquo; to create one.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="flex flex-col gap-4">
              {(statusFilter === "all" ? reports : reports.filter(r => r.status === statusFilter)).length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No reports match this filter.
                </p>
              ) : (
                (statusFilter === "all" ? reports : reports.filter(r => r.status === statusFilter)).map((r) => (
                  <Link
                    key={r._id}
                    to="/app/reports/$reportId"
                    params={{ reportId: r._id }}
                  >
                    <Card className="hover:shadow-md transition-shadow duration-150 group">
                      <CardContent className="py-2.5">
                        <div className="flex items-center gap-3">
                          <div className="size-8 rounded-md bg-muted flex items-center justify-center shrink-0">
                            <FileText className="size-3.5 text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-sm font-medium">
                                {r.number}
                              </span>
                              <Badge variant="outline" className="text-xs capitalize">
                                {reportKindLabel(r.kind, r.templateName)}
                              </Badge>
                            </div>
                            {(() => {
                              const myName =
                                me?.state === "ok"
                                  ? me.profile.fullName
                                  : undefined;
                              if (r.creatorName && r.creatorName !== myName) {
                                return (
                                  <p className="text-xs text-muted-foreground mt-0.5">
                                    by {r.creatorName}
                                  </p>
                                );
                              }
                              return null;
                            })()}
                          </div>
                          <ReportStatusBadge status={r.status} />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="team" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-start justify-between">
              <div>
                <CardTitle className="text-base">Assigned team</CardTitle>
                <CardDescription>
                  B&amp;E staff assigned to this project.
                </CardDescription>
              </div>
              {canManageTeam && (
                <ManageTeamDialog
                  projectId={project._id}
                  assignments={assignments}
                  autoOpen={search.manage === 1}
                />
              )}
            </CardHeader>
            <CardContent>
              {assignments.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No team assigned yet.
                  {canManageTeam && " Use “Manage team” above to add people."}
                </p>
              ) : (
                <div className="space-y-2">
                  {assignments.map((a) => (
                    <div
                      key={a._id}
                      className="flex items-center gap-3 rounded-md border px-3 py-2.5"
                    >
                      <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-xs font-semibold text-primary">
                          {(a.profile?.fullName ?? "?")
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">
                          {a.profile?.fullName ?? "Unknown"}
                        </p>
                      </div>
                      <Badge variant="outline" className="capitalize">
                        {a.role}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recipients" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-start justify-between">
              <div>
                <CardTitle className="text-base">Default recipients</CardTitle>
                <CardDescription>
                  Client contacts who receive delivered reports.
                </CardDescription>
              </div>
              {canManageTeam && client && (
                <ManageRecipientsDialog
                  projectId={project._id}
                  clientId={client._id}
                  selectedIds={defaultRecipients.map((r) => r._id)}
                />
              )}
            </CardHeader>
            <CardContent>
              {defaultRecipients.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No default recipients configured.
                  {canManageTeam && " Use “Manage recipients” above to pick who gets the approved PDF + portal link."}
                </p>
              ) : (
                <div className="space-y-2">
                  {defaultRecipients.map((r) => (
                    <div
                      key={r._id}
                      className="flex items-center gap-3 rounded-md border px-3 py-2.5"
                    >
                      <div className="size-8 rounded-full bg-muted flex items-center justify-center">
                        <Mail className="size-3.5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{r.fullName}</p>
                        <p className="text-xs text-muted-foreground">
                          {r.email}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="specs" className="mt-4">
          <SpecZonesPanel
            projectId={project._id}
            canEdit={me?.state === "ok" && canReview(me)}
          />
        </TabsContent>

        <TabsContent value="pile-types" className="mt-4">
          <PileTypesPanel
            projectId={project._id}
            canEdit={me?.state === "ok" && canReview(me)}
          />
        </TabsContent>
      </Tabs>
    </div>
    </PageTransition>
  );
}

// ─── Spec Zones Panel ────────────────────────────────────────────────────────

type SpecZone = {
  _id: Id<"projectSpecZones">;
  name: string;
  description?: string;
  coordinates?: string;
  specMinCompactionPct?: number;
  specProctorType?: "standard" | "modified";
  referencedProctorId?: Id<"proctorCurves">;
  specMinConcreteStrengthPsi?: number;
  specPileType?: string;
  specPileDesignLoadKips?: number;
  specPileFailureCriterion?: string;
  specNotes?: string;
  proctorLabel: string | null;
};

function SpecZonesPanel({
  projectId,
  canEdit,
}: {
  projectId: Id<"projects">;
  canEdit: boolean;
}) {
  const zones = useQuery(api.specZones.listByProject, { projectId });
  const removeZone = useMutation(api.specZones.remove);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingZone, setEditingZone] = useState<SpecZone | null>(null);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-heading text-base font-semibold">Test Zones</h3>
          <p className="text-sm text-muted-foreground">
            Define areas with different testing requirements. Each zone has its own acceptance criteria.
          </p>
        </div>
        {canEdit && (
          <Button
            size="sm"
            onClick={() => {
              setEditingZone(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Add zone
          </Button>
        )}
      </div>

      {/* Zone cards */}
      {zones === undefined ? (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : zones.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="size-10 rounded-full bg-muted flex items-center justify-center mb-3">
              <MapPin className="size-5 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-sm mb-1">No test zones defined</h3>
            <p className="text-sm text-muted-foreground">
              Add zones to set per-area acceptance criteria.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {zones.map((z) => (
            <Card key={z._id}>
              <CardContent className="py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-heading font-semibold">{z.name}</h4>
                    {(z.description || z.coordinates) && (
                      <div className="mt-0.5 space-y-0.5">
                        {z.description && (
                          <p className="text-sm text-muted-foreground">{z.description}</p>
                        )}
                        {z.coordinates && (
                          <p className="text-xs text-muted-foreground font-mono">{z.coordinates}</p>
                        )}
                      </div>
                    )}
                    {/* Spec values grid */}
                    <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {z.specMinCompactionPct !== undefined && (
                        <div>
                          <p className="text-xs text-muted-foreground">Min Compaction</p>
                          <p className="text-sm font-medium">{z.specMinCompactionPct}%</p>
                        </div>
                      )}
                      {z.specProctorType && (
                        <div>
                          <p className="text-xs text-muted-foreground">Proctor Type</p>
                          <p className="text-sm font-medium capitalize">{z.specProctorType}</p>
                        </div>
                      )}
                      {z.proctorLabel && (
                        <div>
                          <p className="text-xs text-muted-foreground">Proctor Reference</p>
                          <p className="text-sm font-medium">{z.proctorLabel}</p>
                        </div>
                      )}
                      {z.specMinConcreteStrengthPsi !== undefined && (
                        <div>
                          <p className="text-xs text-muted-foreground">Min Concrete Strength</p>
                          <p className="text-sm font-medium">{z.specMinConcreteStrengthPsi} psi</p>
                        </div>
                      )}
                      {z.specPileType && (
                        <div>
                          <p className="text-xs text-muted-foreground">Pile Type</p>
                          <p className="text-sm font-medium">{z.specPileType}</p>
                        </div>
                      )}
                      {z.specPileDesignLoadKips !== undefined && (
                        <div>
                          <p className="text-xs text-muted-foreground">Design Load</p>
                          <p className="text-sm font-medium">{z.specPileDesignLoadKips} kips</p>
                        </div>
                      )}
                      {z.specPileFailureCriterion && (
                        <div>
                          <p className="text-xs text-muted-foreground">Failure Criterion</p>
                          <p className="text-sm font-medium">{z.specPileFailureCriterion}</p>
                        </div>
                      )}
                    </div>
                    {z.specNotes && (
                      <p className="mt-2 text-xs text-muted-foreground italic">{z.specNotes}</p>
                    )}
                  </div>
                  {canEdit && (
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => {
                          setEditingZone(z);
                          setDialogOpen(true);
                        }}
                      >
                        <Pencil className="size-3.5" />
                        <span className="sr-only">Edit</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => {
                          void removeZone({ zoneId: z._id })
                            .then(() => toast.success("Zone deleted"))
                            .catch(() => toast.error("Failed to delete zone"));
                        }}
                      >
                        <Trash2 className="size-3.5" />
                        <span className="sr-only">Delete</span>
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <ZoneFormDialog
          projectId={projectId}
          zone={editingZone}
          onSuccess={() => {
            setDialogOpen(false);
            setEditingZone(null);
          }}
        />
      </Dialog>
    </div>
  );
}

// ─── Zone Form Dialog ────────────────────────────────────────────────────────

function ZoneFormDialog({
  projectId,
  zone,
  onSuccess,
}: {
  projectId: Id<"projects">;
  zone: SpecZone | null;
  onSuccess: () => void;
}) {
  const createZone = useMutation(api.specZones.create);
  const updateZone = useMutation(api.specZones.update);
  const proctors = useQuery(api.proctors.list);

  const isEditing = zone !== null;

  const [name, setName] = useState(zone?.name ?? "");
  const [description, setDescription] = useState(zone?.description ?? "");
  const [coordinates, setCoordinates] = useState(zone?.coordinates ?? "");
  const [minCompaction, setMinCompaction] = useState(
    zone?.specMinCompactionPct?.toString() ?? "",
  );
  const [proctorType, setProctorType] = useState<string>(zone?.specProctorType ?? "");
  const [proctorId, setProctorId] = useState<string>(zone?.referencedProctorId ?? "");
  const [minStrength, setMinStrength] = useState(
    zone?.specMinConcreteStrengthPsi?.toString() ?? "",
  );
  const [specNotes, setSpecNotes] = useState(zone?.specNotes ?? "");
  const [pileType, setPileType] = useState(zone?.specPileType ?? "");
  const [pileDesignLoad, setPileDesignLoad] = useState(
    zone?.specPileDesignLoadKips?.toString() ?? "",
  );
  const [pileFailureCriterion, setPileFailureCriterion] = useState(
    zone?.specPileFailureCriterion ?? "",
  );
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);

    const payload = {
      name: name.trim(),
      description: description.trim() || undefined,
      coordinates: coordinates.trim() || undefined,
      specMinCompactionPct: minCompaction ? Number(minCompaction) : undefined,
      specProctorType:
        proctorType === "standard" || proctorType === "modified"
          ? proctorType as "standard" | "modified"
          : undefined,
      referencedProctorId: proctorId
        ? (proctorId as Id<"proctorCurves">)
        : undefined,
      specMinConcreteStrengthPsi: minStrength ? Number(minStrength) : undefined,
      specPileType: pileType.trim() || undefined,
      specPileDesignLoadKips: pileDesignLoad ? Number(pileDesignLoad) : undefined,
      specPileFailureCriterion: pileFailureCriterion.trim() || undefined,
      specNotes: specNotes.trim() || undefined,
    };

    const promise = isEditing
      ? updateZone({ zoneId: zone._id, ...payload })
      : createZone({ projectId, ...payload });

    void promise
      .then(() => {
        toast.success(isEditing ? "Zone updated" : "Zone created");
        onSuccess();
      })
      .catch(() => toast.error(isEditing ? "Failed to update zone" : "Failed to create zone"))
      .finally(() => setSubmitting(false));
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogEyebrow>{isEditing ? "Edit zone" : "New zone"}</DialogEyebrow>
        <DialogTitle>
          {isEditing ? "Edit zone" : "Add a test zone"}
        </DialogTitle>
        <DialogDescription>
          Define acceptance criteria for a specific area of the project.
        </DialogDescription>
      </DialogHeader>

      <form
        id="zone-form"
        onSubmit={handleSubmit}
      >
        <DialogBody className="space-y-4 max-h-[60vh] overflow-y-auto">
          <div className="space-y-2">
            <Label>Name *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Zone A — Substation Pad"
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Main transformer pad and switchgear area"
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label>Coordinates</Label>
            <Input
              value={coordinates}
              onChange={(e) => setCoordinates(e.target.value)}
              placeholder="e.g. STA 10+00 to STA 15+00"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Min compaction (%)</Label>
              <Input
                type="number"
                step="any"
                value={minCompaction}
                onChange={(e) => setMinCompaction(e.target.value)}
                placeholder="95"
              />
            </div>
            <div className="space-y-2">
              <Label>Min concrete strength (psi)</Label>
              <Input
                type="number"
                step="any"
                value={minStrength}
                onChange={(e) => setMinStrength(e.target.value)}
                placeholder="4000"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Pile type</Label>
            <Input
              value={pileType}
              onChange={(e) => setPileType(e.target.value)}
              placeholder='e.g. HP14x73 steel, 18" precast'
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Design load (kips)</Label>
              <Input
                type="number"
                step="any"
                value={pileDesignLoad}
                onChange={(e) => setPileDesignLoad(e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label>Failure criterion</Label>
              <Input
                value={pileFailureCriterion}
                onChange={(e) => setPileFailureCriterion(e.target.value)}
                placeholder="e.g. Davisson method, 10% of pile diameter"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Proctor type</Label>
            <Select value={proctorType} onValueChange={setProctorType}>
              <SelectTrigger>
                <SelectValue placeholder="Select proctor type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="standard">Standard</SelectItem>
                <SelectItem value="modified">Modified</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Reference Proctor</Label>
            <Select value={proctorId} onValueChange={setProctorId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a Proctor curve..." />
              </SelectTrigger>
              <SelectContent>
                {proctors?.map((p) => (
                  <SelectItem key={p._id} value={p._id}>
                    {p.label} — {p.maxDryDensityPcf} pcf / {p.optimumMoisturePct}%
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Spec notes</Label>
            <Textarea
              value={specNotes}
              onChange={(e) => setSpecNotes(e.target.value)}
              placeholder="Additional specifications or notes..."
              rows={2}
            />
          </div>
        </DialogBody>

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="ghost">Cancel</Button>
          </DialogClose>
          <Button
            type="submit"
            disabled={submitting || !name.trim()}
            className="min-w-[130px]"
          >
            <MapPin className="size-4 mr-1.5" />
            {submitting
              ? isEditing
                ? "Saving..."
                : "Adding..."
              : isEditing
                ? "Save zone"
                : "Add zone"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

// ─── Pile Types Panel ─────────────────────────────────────────────────────────

type PileType = {
  _id: Id<"projectPileTypes">;
  name: string;
  color: string;
  description?: string;
  designLoadKips?: number;
  installedLengthFt?: number;
  failureCriterion?: string;
  notes?: string;
};

function PileTypesPanel({
  projectId,
  canEdit,
}: {
  projectId: Id<"projects">;
  canEdit: boolean;
}) {
  const pileTypes = useQuery(api.pileTypes.listByProject, { projectId });
  const removePileType = useMutation(api.pileTypes.remove);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPileType, setEditingPileType] = useState<PileType | null>(null);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-heading text-base font-semibold">Pile Types</h3>
          <p className="text-sm text-muted-foreground">
            Define pile types for this project. Each type has a color for visual identification.
          </p>
        </div>
        {canEdit && (
          <Button
            size="sm"
            onClick={() => {
              setEditingPileType(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Add pile type
          </Button>
        )}
      </div>

      {/* Pile type cards */}
      {pileTypes === undefined ? (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : pileTypes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="size-10 rounded-full bg-muted flex items-center justify-center mb-3">
              <Layers className="size-5 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-sm mb-1">No pile types defined</h3>
            <p className="text-sm text-muted-foreground">
              Add pile types to standardize testing across the project.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {pileTypes.map((pt) => (
            <Card key={pt._id}>
              <CardContent className="py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div
                        className="size-4 rounded-full shrink-0"
                        style={{ backgroundColor: pt.color }}
                      />
                      <h4 className="font-heading font-semibold">{pt.name}</h4>
                    </div>
                    {pt.description && (
                      <p className="text-sm text-muted-foreground mt-0.5 ml-6">
                        {pt.description}
                      </p>
                    )}
                    {/* Spec badges */}
                    <div className="flex flex-wrap gap-1.5 mt-2 ml-6">
                      {pt.designLoadKips !== undefined && (
                        <Badge variant="secondary" className="text-xs">
                          {pt.designLoadKips} kips
                        </Badge>
                      )}
                      {pt.installedLengthFt !== undefined && (
                        <Badge variant="secondary" className="text-xs">
                          {pt.installedLengthFt} ft
                        </Badge>
                      )}
                      {pt.failureCriterion && (
                        <Badge variant="secondary" className="text-xs">
                          {pt.failureCriterion}
                        </Badge>
                      )}
                    </div>
                  </div>
                  {canEdit && (
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => {
                          setEditingPileType(pt);
                          setDialogOpen(true);
                        }}
                      >
                        <Pencil className="size-3.5" />
                        <span className="sr-only">Edit</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => {
                          void removePileType({ pileTypeId: pt._id })
                            .then(() => toast.success("Pile type deleted"))
                            .catch(() => toast.error("Failed to delete pile type"));
                        }}
                      >
                        <Trash2 className="size-3.5" />
                        <span className="sr-only">Delete</span>
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <PileTypeFormDialog
          projectId={projectId}
          pileType={editingPileType}
          onSuccess={() => {
            setDialogOpen(false);
            setEditingPileType(null);
          }}
        />
      </Dialog>
    </div>
  );
}

// ─── Pile Type Form Dialog ────────────────────────────────────────────────────

function PileTypeFormDialog({
  projectId,
  pileType,
  onSuccess,
}: {
  projectId: Id<"projects">;
  pileType: PileType | null;
  onSuccess: () => void;
}) {
  const createPileType = useMutation(api.pileTypes.create);
  const updatePileType = useMutation(api.pileTypes.update);

  const isEditing = pileType !== null;

  const [name, setName] = useState(pileType?.name ?? "");
  const [color, setColor] = useState(pileType?.color ?? "#3b82f6");
  const [description, setDescription] = useState(pileType?.description ?? "");
  const [designLoadKips, setDesignLoadKips] = useState(
    pileType?.designLoadKips?.toString() ?? "",
  );
  const [installedLengthFt, setInstalledLengthFt] = useState(
    pileType?.installedLengthFt?.toString() ?? "",
  );
  const [failureCriterion, setFailureCriterion] = useState(
    pileType?.failureCriterion ?? "",
  );
  const [notes, setNotes] = useState(pileType?.notes ?? "");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);

    const payload = {
      name: name.trim(),
      color,
      description: description.trim() || undefined,
      designLoadKips: designLoadKips ? Number(designLoadKips) : undefined,
      installedLengthFt: installedLengthFt ? Number(installedLengthFt) : undefined,
      failureCriterion: failureCriterion.trim() || undefined,
      notes: notes.trim() || undefined,
    };

    const promise = isEditing
      ? updatePileType({ pileTypeId: pileType._id, ...payload })
      : createPileType({ projectId, ...payload });

    void promise
      .then(() => {
        toast.success(isEditing ? "Pile type updated" : "Pile type created");
        onSuccess();
      })
      .catch(() =>
        toast.error(isEditing ? "Failed to update pile type" : "Failed to create pile type"),
      )
      .finally(() => setSubmitting(false));
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogEyebrow>{isEditing ? "Edit pile" : "New pile"}</DialogEyebrow>
        <DialogTitle>
          {isEditing ? "Edit pile type" : "Add a pile type"}
        </DialogTitle>
        <DialogDescription>
          Define a pile type with specs for visual identification.
        </DialogDescription>
      </DialogHeader>

      <form
        id="pile-type-form"
        onSubmit={handleSubmit}
      >
        <DialogBody className="space-y-4 max-h-[60vh] overflow-y-auto">
          <div className="space-y-2">
            <Label>Name *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="HP14x73 Steel H-Pile"
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Color *</Label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-9 w-14 cursor-pointer rounded border border-input bg-background p-0.5"
              />
              <span className="text-sm text-muted-foreground font-mono">{color}</span>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description of this pile type..."
              rows={2}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Design load (kips)</Label>
              <Input
                type="number"
                step="any"
                value={designLoadKips}
                onChange={(e) => setDesignLoadKips(e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label>Installed length (ft)</Label>
              <Input
                type="number"
                step="any"
                value={installedLengthFt}
                onChange={(e) => setInstalledLengthFt(e.target.value)}
                placeholder="0"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Failure criterion</Label>
            <Input
              value={failureCriterion}
              onChange={(e) => setFailureCriterion(e.target.value)}
              placeholder="Davisson method"
            />
          </div>
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes..."
              rows={2}
            />
          </div>
        </DialogBody>

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="ghost">Cancel</Button>
          </DialogClose>
          <Button
            type="submit"
            disabled={submitting || !name.trim()}
            className="min-w-[130px]"
          >
            <Layers className="size-4 mr-1.5" />
            {submitting
              ? isEditing
                ? "Saving..."
                : "Adding..."
              : isEditing
                ? "Save pile type"
                : "Add pile type"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

// ─── Manage team dialog ────────────────────────────────────────────────────

function ManageTeamDialog({
  projectId,
  assignments,
  autoOpen,
}: {
  projectId: Id<"projects">;
  assignments: {
    _id: Id<"projectAssignments">;
    userId: Id<"users">;
    role: string;
    profile: { fullName: string } | null;
  }[];
  autoOpen?: boolean;
}) {
  const [open, setOpen] = useState(!!autoOpen);
  const router = useRouter();
  useEffect(() => {
    if (autoOpen) setOpen(true);
  }, [autoOpen]);
  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next && autoOpen) {
      void router.navigate({
        to: "/app/projects/$projectId",
        params: { projectId },
        search: { tab: "team" },
        replace: true,
      });
    }
  };
  const members = useQuery(api.users.listOrgMembers, open ? {} : "skip");
  const assignMut = useMutation(api.projects.assign);
  const unassignMut = useMutation(api.projects.unassign);
  const [addingUserId, setAddingUserId] = useState<string>("");
  const [addingRole, setAddingRole] = useState<"pm" | "tech" | "observer">(
    "tech",
  );
  const [busy, setBusy] = useState(false);

  const assignedUserIds = new Set(assignments.map((a) => a.userId));
  const availableMembers = (members ?? []).filter(
    (m) =>
      m.membership.status === "active" &&
      m.membership.role !== "client" &&
      !assignedUserIds.has(m.membership.userId),
  );

  const handleAdd = async () => {
    if (!addingUserId) return;
    setBusy(true);
    try {
      await assignMut({
        projectId,
        userId: addingUserId as Id<"users">,
        role: addingRole,
      });
      toast.success("Team member assigned");
      setAddingUserId("");
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async (assignmentId: Id<"projectAssignments">) => {
    await unassignMut({ assignmentId });
    toast.success("Assignment removed");
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Users className="size-3.5" />
        Manage team
      </Button>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogEyebrow>Project team</DialogEyebrow>
          <DialogTitle>Manage team</DialogTitle>
          <DialogDescription>
            Assign techs, PMs, and observers. Non-assigned techs won&rsquo;t see this project.
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-5">
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
              Currently assigned
            </Label>
            {assignments.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">
                Nobody assigned yet.
              </p>
            ) : (
              <div className="space-y-1.5">
                {assignments.map((a) => (
                  <div
                    key={a._id}
                    className="flex items-center gap-3 rounded-md border px-3 py-2"
                  >
                    <span className="flex-1 text-sm">
                      {a.profile?.fullName ?? "Unknown"}
                    </span>
                    <Badge variant="outline" className="capitalize text-xs">
                      {a.role}
                    </Badge>
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      onClick={() => void handleRemove(a._id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2 border-t pt-4">
            <Label className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
              Add someone
            </Label>
            <div className="grid grid-cols-[1fr_auto_auto] gap-2">
              <Select value={addingUserId} onValueChange={setAddingUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Pick a member…" />
                </SelectTrigger>
                <SelectContent>
                  {availableMembers.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-muted-foreground">
                      No unassigned members
                    </div>
                  ) : (
                    availableMembers.map((m) => (
                      <SelectItem
                        key={m.membership._id}
                        value={m.membership.userId}
                      >
                        {m.profile?.fullName ?? m.email ?? "Unknown"}
                        <span className="ml-2 text-xs text-muted-foreground capitalize">
                          {m.membership.role}
                        </span>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <Select
                value={addingRole}
                onValueChange={(v) =>
                  setAddingRole(v as "pm" | "tech" | "observer")
                }
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tech">Tech</SelectItem>
                  <SelectItem value="pm">PM</SelectItem>
                  <SelectItem value="observer">Observer</SelectItem>
                </SelectContent>
              </Select>
              <Button
                onClick={() => void handleAdd()}
                disabled={!addingUserId || busy}
              >
                <Plus className="size-3.5" />
                Add
              </Button>
            </div>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="ghost" onClick={() => handleOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Manage recipients dialog ──────────────────────────────────────────────

function ManageRecipientsDialog({
  projectId,
  clientId,
  selectedIds,
}: {
  projectId: Id<"projects">;
  clientId: Id<"clients">;
  selectedIds: Id<"clientContacts">[];
}) {
  const [open, setOpen] = useState(false);
  const contacts = useQuery(
    api.clients.listContacts,
    open ? { clientId } : "skip",
  );
  const updateProject = useMutation(api.projects.update);
  const [selection, setSelection] = useState<Set<string>>(
    () => new Set(selectedIds),
  );
  const [saving, setSaving] = useState(false);

  // Re-sync selection when selectedIds changes (e.g. parent reloads).
  useEffect(() => {
    setSelection(new Set(selectedIds));
  }, [selectedIds.join(","), open]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = (id: string) => {
    setSelection((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProject({
        projectId,
        defaultRecipientContactIds: [...selection] as Id<"clientContacts">[],
      });
      toast.success("Recipients updated");
      setOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const active = (contacts ?? []).filter((c) => c.isActive !== false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Mail className="size-3.5" />
        Manage recipients
      </Button>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogEyebrow>Delivery</DialogEyebrow>
          <DialogTitle>Default recipients</DialogTitle>
          <DialogDescription>
            Pick the client contacts who should receive the PDF + portal link
            when a report is approved.
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          {contacts === undefined ? (
            <Skeleton className="h-32 w-full" />
          ) : active.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">
              This client has no active contacts yet. Add them in{" "}
              <Link
                to="/app/admin/clients"
                className="underline underline-offset-2"
              >
                Admin → Clients
              </Link>
              .
            </p>
          ) : (
            <div className="space-y-1.5">
              {active.map((c) => {
                const checked = selection.has(c._id);
                return (
                  <label
                    key={c._id}
                    className={cn(
                      "flex items-center gap-3 rounded-md border px-3 py-2.5 cursor-pointer transition-colors",
                      checked
                        ? "border-foreground/40 bg-accent/40"
                        : "hover:bg-accent/20",
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(c._id)}
                      className="size-4 rounded border-border"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {c.fullName}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {c.email}
                        {c.title ? ` · ${c.title}` : ""}
                      </p>
                    </div>
                  </label>
                );
              })}
            </div>
          )}
        </DialogBody>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => void handleSave()}
            disabled={saving}
            className="min-w-[130px]"
          >
            Save recipients
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── New-report menu (built-in kinds + custom templates) ─────────────────

function NewReportMenu({ projectId }: { projectId: Id<"projects"> }) {
  const templates = useQuery(api.testTemplates.list, {});
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-1.5" />
          New report
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[220px]">
        {REPORT_KINDS.map((rk) => (
          <DropdownMenuItem key={rk.kind} asChild>
            <Link
              to="/app/reports/new/$kind"
              params={{ kind: rk.kind }}
              search={{ projectId }}
              className="flex items-center gap-2.5"
            >
              <TestKindIcon
                kind={rk.kind}
                width={16}
                height={16}
                className="text-muted-foreground"
              />
              {rk.label}
            </Link>
          </DropdownMenuItem>
        ))}
        {templates && templates.length > 0 && (
          <>
            <div className="border-t my-1" />
            <div className="px-2 pt-1 pb-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
              Custom
            </div>
            {templates
              .filter((t) => t.status === "active")
              .map((t) => (
                <DropdownMenuItem key={t._id} asChild>
                  <Link
                    to="/app/reports/new/$kind"
                    params={{ kind: "custom" }}
                    search={{ projectId, templateId: t._id }}
                    className="flex items-center gap-2.5"
                  >
                    <ClipboardList
                      className="text-muted-foreground"
                      style={{ width: 16, height: 16 }}
                    />
                    {t.name}
                  </Link>
                </DropdownMenuItem>
              ))}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
