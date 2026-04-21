import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Link, createFileRoute, Navigate } from "@tanstack/react-router";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { useCurrentMember } from "@/features/auth/useCurrentMember";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogEyebrow,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ReportStatusBadge } from "@/features/reports/ReportStatusBadge";
import { SignaturePad } from "@/features/queue/SignaturePad";
import { useSetBreadcrumbs } from "@/components/layout/breadcrumb-context";
import { toast } from "sonner";
import {
  CheckCircle,
  XCircle,
  ExternalLink,
  ClipboardCheck,
  User,
  FolderKanban,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { PageTransition } from "@/components/layout/PageTransition";
import { reportKindLabel } from "@/lib/constants";
import { TestKindIcon } from "@/components/test-icons";
import { kindColor } from "@/lib/test-kind-colors";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/queue/")({
  component: QueuePage,
});

/** Bucket age into tiers for visual urgency. */
type UrgencyTier = "fresh" | "aging" | "stale" | "overdue";
function urgencyFor(since: number | undefined): UrgencyTier {
  if (!since) return "fresh";
  const hours = (Date.now() - since) / 3_600_000;
  if (hours < 1) return "fresh";
  if (hours < 6) return "aging";
  if (hours < 24) return "stale";
  return "overdue";
}
function formatTimeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

function QueuePage() {
  const me = useCurrentMember();
  const queue = useQuery(api.reports.queries.listReviewQueue);
  const claim = useMutation(api.reports.mutations.claimForReview);

  const [approvingId, setApprovingId] = useState<Id<"reports"> | null>(null);
  const [rejectingId, setRejectingId] = useState<Id<"reports"> | null>(null);
  const [claimingId, setClaimingId] = useState<Id<"reports"> | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkApproveOpen, setBulkApproveOpen] = useState(false);

  const handleClaim = (reportId: Id<"reports">) => {
    setClaimingId(reportId);
    void claim({ reportId }).finally(() => setClaimingId(null));
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  useSetBreadcrumbs([{ label: "Review Queue" }]);

  // Keyboard shortcuts: C claim first pending, J/K to scroll through
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement) {
        const tag = e.target.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || e.target.isContentEditable)
          return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (!queue) return;
      if (e.key === "c" || e.key === "C") {
        const first = queue.find((r) => r.status === "submitted");
        if (first) {
          e.preventDefault();
          handleClaim(first._id);
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [queue, claim]); // eslint-disable-line react-hooks/exhaustive-deps

  if (me === undefined) return <QueueSkeleton />;
  if (
    me.state !== "ok" ||
    (me.membership.role !== "pm" && me.membership.role !== "admin")
  ) {
    return <Navigate to="/app" replace />;
  }

  const submitted = (queue ?? []).filter((r) => r.status === "submitted");
  const inReview = (queue ?? []).filter((r) => r.status === "in_review");

  // Sort submitted by oldest first so overdue surfaces to the top
  submitted.sort(
    (a, b) => (a.submittedAt ?? a._creationTime) - (b.submittedAt ?? b._creationTime),
  );

  return (
    <PageTransition>
      <div className="mx-auto max-w-5xl px-4 sm:px-6 py-6 space-y-8" data-stagger>
        {/* Page header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-heading text-2xl font-bold tracking-tight">
              Review Queue
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Reports submitted by field techs awaiting your review.
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-5 text-sm tabular-nums shrink-0 pt-1">
            <QueueStat count={submitted.length} label="Pending" />
            <div className="h-8 w-px bg-border" />
            <QueueStat count={inReview.length} label="In review" muted />
          </div>
        </div>

        {queue === undefined ? (
          <QueueSkeleton />
        ) : queue.length === 0 ? (
          <EmptyQueue />
        ) : (
          <div className="space-y-10">
            {submitted.length > 0 && (
              <section className="space-y-3">
                <SectionHeader>Awaiting review</SectionHeader>
                <div className="grid gap-2">
                  {submitted.map((r) => (
                    <QueueCard
                      key={r._id}
                      report={r}
                      onClaim={() => handleClaim(r._id)}
                      claimLoading={claimingId === r._id}
                    />
                  ))}
                </div>
              </section>
            )}

            {inReview.length > 0 && (
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <SectionHeader>In review</SectionHeader>
                  {selectedIds.size > 0 && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground tabular-nums">
                        {selectedIds.size} selected
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setSelectedIds(new Set())}
                      >
                        Clear
                      </Button>
                      <Button size="sm" onClick={() => setBulkApproveOpen(true)}>
                        <CheckCircle className="size-3.5" />
                        Approve {selectedIds.size}
                      </Button>
                    </div>
                  )}
                </div>
                <div className="grid gap-2">
                  {inReview.map((r) => (
                    <QueueCard
                      key={r._id}
                      selectable
                      selected={selectedIds.has(r._id)}
                      onToggleSelect={() => toggleSelect(r._id)}
                      report={r}
                      onApprove={() => setApprovingId(r._id)}
                      onReject={() => setRejectingId(r._id)}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}

        {/* Shortcut hint — desktop only */}
        <div className="hidden sm:flex items-center gap-2 pt-2 text-[11px] uppercase tracking-[0.14em] text-muted-foreground/70">
          <span>Tip</span>
          <span className="text-border">·</span>
          <span>
            Press{" "}
            <kbd className="font-mono text-[10px] border rounded px-1.5 py-px bg-muted/50">
              C
            </kbd>{" "}
            to claim the next report
          </span>
        </div>

        <ApproveDialog
          reportId={approvingId}
          onClose={() => setApprovingId(null)}
        />
        <RejectDialog
          reportId={rejectingId}
          onClose={() => setRejectingId(null)}
        />
        <BulkApproveDialog
          open={bulkApproveOpen}
          onClose={() => setBulkApproveOpen(false)}
          reportIds={[...selectedIds] as Id<"reports">[]}
          onApproved={() => {
            setSelectedIds(new Set());
            setBulkApproveOpen(false);
          }}
        />
      </div>
    </PageTransition>
  );
}

/* ── Sub-components ───────────────────────────────────────────── */

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {children}
      </h2>
      <div className="flex-1 h-px bg-border/70" />
    </div>
  );
}

function QueueStat({
  count,
  label,
  muted,
}: {
  count: number;
  label: string;
  muted?: boolean;
}) {
  return (
    <div className="flex items-baseline gap-2">
      <span
        className={cn(
          "font-heading text-2xl font-semibold tabular-nums",
          muted && "text-muted-foreground",
        )}
      >
        {count}
      </span>
      <span className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </span>
    </div>
  );
}

type QueueReport = {
  _id: Id<"reports">;
  number: string;
  kind: string;
  status: string;
  projectName: string;
  creatorName: string;
  reviewerName: string | null;
  templateName: string | null;
  _creationTime: number;
  submittedAt?: number;
  reviewingSince?: number;
};

function QueueCard({
  report,
  onClaim,
  onApprove,
  onReject,
  claimLoading,
  selectable,
  selected,
  onToggleSelect,
}: {
  report: QueueReport;
  onClaim?: () => void;
  onApprove?: () => void;
  onReject?: () => void;
  claimLoading?: boolean;
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
}) {
  const sinceTs =
    report.status === "submitted"
      ? (report.submittedAt ?? report._creationTime)
      : (report.reviewingSince ?? report.submittedAt ?? report._creationTime);
  const tier = urgencyFor(sinceTs);

  // Monochrome urgency ramp — hairline left-border only
  const urgencyBorder = {
    fresh: "border-l-border",
    aging: "border-l-foreground/30",
    stale: "border-l-foreground/60",
    overdue: "border-l-destructive",
  }[tier];

  return (
    <Card
      className={cn(
        "border-l-4 transition-colors",
        urgencyBorder,
      )}
    >
      <CardContent className="py-4">
        <div className="flex items-start gap-4">
          {selectable && (
            <input
              type="checkbox"
              checked={!!selected}
              onChange={onToggleSelect}
              className="size-4 mt-2.5 shrink-0"
              aria-label={`Select ${report.number}`}
            />
          )}
          {/* Kind icon */}
          <div
            className="hidden sm:flex size-10 shrink-0 items-center justify-center rounded-sm"
            style={{
              backgroundColor: `color-mix(in oklch, ${kindColor(report.kind).oklch} 12%, transparent)`,
              color: kindColor(report.kind).oklch,
            }}
          >
            <TestKindIcon kind={report.kind} width={18} height={18} />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0 space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <Link
                to="/app/reports/$reportId"
                params={{ reportId: report._id }}
                className="font-mono text-sm font-semibold hover:underline"
              >
                {report.number}
              </Link>
              <span className="text-xs text-muted-foreground">
                {reportKindLabel(report.kind, report.templateName)}
              </span>
              <ReportStatusBadge status={report.status} />
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
              <span className="inline-flex items-center gap-1">
                <FolderKanban className="size-3" />
                {report.projectName}
              </span>
              <span className="inline-flex items-center gap-1">
                <User className="size-3" />
                {report.creatorName}
              </span>
              {report.reviewerName && (
                <span className="inline-flex items-center gap-1">
                  <ClipboardCheck className="size-3" />
                  {report.reviewerName}
                </span>
              )}
            </div>
          </div>

          {/* Time + actions */}
          <div className="flex items-center gap-3 shrink-0">
            <TimeAgo tier={tier} since={sinceTs} />
            <div className="flex items-center gap-1.5">
              <Button asChild variant="ghost" size="sm">
                <Link
                  to="/app/reports/$reportId"
                  params={{ reportId: report._id }}
                >
                  <ExternalLink className="size-3.5" />
                  <span className="hidden md:inline">View</span>
                </Link>
              </Button>
              {report.status === "submitted" && onClaim && (
                <Button size="sm" onClick={onClaim} disabled={claimLoading}>
                  {claimLoading ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : null}
                  Claim
                  {!claimLoading && <ChevronRight className="size-3.5" />}
                </Button>
              )}
              {report.status === "in_review" && (
                <>
                  {onReject && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={onReject}
                      className="text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
                    >
                      <XCircle className="size-3.5" />
                      <span className="hidden md:inline">Reject</span>
                    </Button>
                  )}
                  {onApprove && (
                    <Button size="sm" onClick={onApprove}>
                      <CheckCircle className="size-3.5" />
                      Approve
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function TimeAgo({ tier, since }: { tier: UrgencyTier; since: number }) {
  const color = {
    fresh: "text-muted-foreground",
    aging: "text-foreground/70",
    stale: "text-foreground",
    overdue: "text-destructive",
  }[tier];
  return (
    <div className={cn("text-right hidden sm:block tabular-nums", color)}>
      <div className="font-mono text-sm font-medium leading-none">
        {formatTimeAgo(since)}
      </div>
      <div className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground mt-1">
        {tier === "overdue" ? "Overdue" : "In queue"}
      </div>
    </div>
  );
}

function EmptyQueue() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-16 text-center">
        <div className="size-10 rounded-full border border-border flex items-center justify-center mb-4">
          <ClipboardCheck className="size-4 text-muted-foreground" />
        </div>
        <h3 className="font-heading font-semibold mb-1">All caught up</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          No reports waiting for review. New submissions will appear here
          automatically.
        </p>
      </CardContent>
    </Card>
  );
}

function QueueSkeleton() {
  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-6 space-y-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-72" />
      <div className="space-y-2 mt-6">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    </div>
  );
}

/* ── Approve / Reject dialogs (refined, no gradient accents) ── */

function ApproveDialog({
  reportId,
  onClose,
}: {
  reportId: Id<"reports"> | null;
  onClose: () => void;
}) {
  const approveMut = useMutation(api.reports.mutations.approve);
  const generateUrl = useMutation(api.reports.attachments.generateUploadUrl);
  const profileAssets = useQuery(
    api.users.getMyProfileAssets,
    reportId !== null ? {} : "skip",
  );
  const [comments, setComments] = useState("");
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [mode, setMode] = useState<"on_file" | "draw">("on_file");
  const [submitting, setSubmitting] = useState(false);

  // When the dialog opens, reset mode based on whether there's a signature on file.
  useEffect(() => {
    if (reportId === null) return;
    if (profileAssets?.signatureUrl) {
      setMode("on_file");
    } else {
      setMode("draw");
    }
  }, [reportId, profileAssets?.signatureUrl]);

  const handleApprove = async () => {
    if (!reportId) return;
    setSubmitting(true);
    try {
      let signatureStorageId: Id<"_storage"> | undefined;
      if (mode === "draw") {
        if (!signatureDataUrl) return;
        const res = await fetch(signatureDataUrl);
        const blob = await res.blob();
        const uploadUrl = await generateUrl({});
        const uploadRes = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": "image/png" },
          body: blob,
        });
        const { storageId } = (await uploadRes.json()) as {
          storageId: Id<"_storage">;
        };
        signatureStorageId = storageId;
      }
      // If mode === "on_file", omit signatureStorageId; backend uses profile's.
      await approveMut({
        reportId,
        signatureStorageId,
        comments: comments || undefined,
      });
      toast.success("Report approved");
      setComments("");
      setSignatureDataUrl(null);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const canApprove =
    mode === "on_file" ? !!profileAssets?.signatureUrl : !!signatureDataUrl;

  return (
    <Dialog open={reportId !== null} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogEyebrow>Certification</DialogEyebrow>
          <DialogTitle>Approve report</DialogTitle>
          <DialogDescription>
            Your signature appears on the delivered PDF and the client portal.
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
                Signature
              </Label>
              {profileAssets?.signatureUrl && (
                <button
                  type="button"
                  className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
                  onClick={() =>
                    setMode((m) => (m === "on_file" ? "draw" : "on_file"))
                  }
                >
                  {mode === "on_file"
                    ? "Draw a different one"
                    : "Use signature on file"}
                </button>
              )}
            </div>
            {mode === "on_file" && profileAssets?.signatureUrl ? (
              <div className="border border-border/70 rounded-sm bg-background p-3 flex items-center justify-between gap-3">
                <img
                  src={profileAssets.signatureUrl}
                  alt="Your signature on file"
                  className="h-12 w-auto"
                />
                <span className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                  On file
                </span>
              </div>
            ) : (
              <SignaturePad onCapture={setSignatureDataUrl} />
            )}
          </div>
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
              Comments
              <span className="normal-case tracking-normal text-muted-foreground/70 ml-2">
                optional
              </span>
            </Label>
            <Textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              rows={2}
              placeholder="Any notes for the record…"
              className="resize-none"
            />
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            className="min-w-[160px]"
            disabled={!canApprove || submitting}
            onClick={() => void handleApprove()}
          >
            {submitting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <CheckCircle className="size-4" />
            )}
            {submitting ? "Approving…" : "Approve & sign"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RejectDialog({
  reportId,
  onClose,
}: {
  reportId: Id<"reports"> | null;
  onClose: () => void;
}) {
  const rejectMut = useMutation(api.reports.mutations.rejectWithComments);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  return (
    <Dialog open={reportId !== null} onOpenChange={() => onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogEyebrow>Return for changes</DialogEyebrow>
          <DialogTitle>Request changes</DialogTitle>
          <DialogDescription>
            The tech will see your feedback and can resubmit.
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-2">
          <Label className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
            What needs to be fixed?
          </Label>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
            placeholder="e.g. Mix design number doesn't match the ticket…"
            required
            className="resize-none"
          />
          <p className="text-xs text-muted-foreground">
            Be specific so the tech knows exactly what to correct.
          </p>
        </DialogBody>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            className="min-w-[160px]"
            disabled={!reason.trim() || submitting}
            onClick={() => {
              if (!reportId) return;
              setSubmitting(true);
              void rejectMut({ reportId, reason })
                .then(() => {
                  toast.success("Report returned to tech");
                  setReason("");
                  onClose();
                })
                .finally(() => setSubmitting(false));
            }}
          >
            {submitting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <XCircle className="size-4" />
            )}
            {submitting ? "Sending…" : "Request changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ── Bulk approve dialog ─────────────────────────────────────── */

function BulkApproveDialog({
  open,
  onClose,
  reportIds,
  onApproved,
}: {
  open: boolean;
  onClose: () => void;
  reportIds: Id<"reports">[];
  onApproved: () => void;
}) {
  const approveMut = useMutation(api.reports.mutations.approve);
  const generateUrl = useMutation(api.reports.attachments.generateUploadUrl);
  const profileAssets = useQuery(
    api.users.getMyProfileAssets,
    open ? {} : "skip",
  );
  const [comments, setComments] = useState("");
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [mode, setMode] = useState<"on_file" | "draw">("on_file");
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!open) return;
    setMode(profileAssets?.signatureUrl ? "on_file" : "draw");
    setProgress(0);
  }, [open, profileAssets?.signatureUrl]);

  const handleApprove = async () => {
    setSubmitting(true);
    try {
      let signatureStorageId: Id<"_storage"> | undefined;
      if (mode === "draw") {
        if (!signatureDataUrl) return;
        const res = await fetch(signatureDataUrl);
        const blob = await res.blob();
        const uploadUrl = await generateUrl({});
        const uploadRes = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": "image/png" },
          body: blob,
        });
        const { storageId } = (await uploadRes.json()) as {
          storageId: Id<"_storage">;
        };
        signatureStorageId = storageId;
      }
      // Approve each report sequentially so the audit log is deterministic.
      for (let i = 0; i < reportIds.length; i++) {
        await approveMut({
          reportId: reportIds[i],
          signatureStorageId,
          comments: comments || undefined,
        });
        setProgress(i + 1);
      }
      toast.success(
        `${reportIds.length} report${reportIds.length === 1 ? "" : "s"} approved`,
      );
      setComments("");
      setSignatureDataUrl(null);
      onApproved();
    } finally {
      setSubmitting(false);
    }
  };

  const canApprove =
    mode === "on_file" ? !!profileAssets?.signatureUrl : !!signatureDataUrl;

  return (
    <Dialog open={open} onOpenChange={() => (!submitting ? onClose() : null)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogEyebrow>Batch approval</DialogEyebrow>
          <DialogTitle>Approve {reportIds.length} reports</DialogTitle>
          <DialogDescription>
            The same signature and comments are applied to every selected
            report. Each gets its own audit-log entry.
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
                Signature
              </Label>
              {profileAssets?.signatureUrl && (
                <button
                  type="button"
                  className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
                  onClick={() =>
                    setMode((m) => (m === "on_file" ? "draw" : "on_file"))
                  }
                >
                  {mode === "on_file"
                    ? "Draw a different one"
                    : "Use signature on file"}
                </button>
              )}
            </div>
            {mode === "on_file" && profileAssets?.signatureUrl ? (
              <div className="border border-border/70 rounded-sm bg-background p-3 flex items-center justify-between gap-3">
                <img
                  src={profileAssets.signatureUrl}
                  alt="Your signature on file"
                  className="h-12 w-auto"
                />
                <span className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                  On file
                </span>
              </div>
            ) : (
              <SignaturePad onCapture={setSignatureDataUrl} />
            )}
          </div>
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
              Comments (applied to all)
              <span className="normal-case tracking-normal text-muted-foreground/70 ml-2">
                optional
              </span>
            </Label>
            <Textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              rows={2}
              placeholder="Any notes for the record…"
              className="resize-none"
            />
          </div>
          {submitting && (
            <div className="text-xs text-muted-foreground tabular-nums">
              Approving {progress} of {reportIds.length}…
            </div>
          )}
        </DialogBody>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            className="min-w-[180px]"
            disabled={!canApprove || submitting || reportIds.length === 0}
            onClick={() => void handleApprove()}
          >
            {submitting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <CheckCircle className="size-4" />
            )}
            {submitting
              ? `Approving ${progress}/${reportIds.length}`
              : `Approve all ${reportIds.length}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
