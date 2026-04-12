import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Link, createFileRoute, Navigate } from "@tanstack/react-router";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { useCurrentMember } from "@/features/auth/useCurrentMember";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ReportStatusBadge } from "@/features/reports/ReportStatusBadge";
import { SignaturePad } from "@/features/queue/SignaturePad";
import { useSetBreadcrumbs } from "@/components/layout/breadcrumb-context";
import { toast } from "sonner";
import {
  CheckCircle,
  XCircle,
  Eye,
  FileText,
  User,
  FolderKanban,
  Clock,
  ClipboardCheck,
  ExternalLink,
  XIcon,
  PenLine,
  ShieldCheck,
} from "lucide-react";
import { PageTransition } from "@/components/layout/PageTransition";
import { KIND_LABELS } from "@/lib/constants";

export const Route = createFileRoute("/app/queue/")({
  component: QueuePage,
});

function formatTimeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function QueuePage() {
  const me = useCurrentMember();
  const queue = useQuery(api.reports.queries.listReviewQueue);
  const claim = useMutation(api.reports.mutations.claimForReview);

  const [approvingId, setApprovingId] = useState<Id<"reports"> | null>(null);
  const [rejectingId, setRejectingId] = useState<Id<"reports"> | null>(null);

  useSetBreadcrumbs([{ label: "Review Queue" }]);

  if (me === undefined) return <QueueSkeleton />;
  if (
    me.state !== "ok" ||
    (me.membership.role !== "pm" && me.membership.role !== "admin")
  ) {
    return <Navigate to="/app" replace />;
  }

  const submitted = queue?.filter((r) => r.status === "submitted") ?? [];
  const inReview = queue?.filter((r) => r.status === "in_review") ?? [];

  return (
    <PageTransition>
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-6 space-y-8">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight">Review Queue</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Reports submitted by field techs awaiting your review.
          </p>
        </div>
        {queue && (
          <div className="hidden sm:flex items-center gap-2">
            <Badge variant="outline" className="text-xs gap-1">
              <Clock className="h-3 w-3" />
              {submitted.length} pending
            </Badge>
            <Badge variant="secondary" className="text-xs gap-1">
              <Eye className="h-3 w-3" />
              {inReview.length} in review
            </Badge>
          </div>
        )}
      </div>

      {queue === undefined ? (
        <QueueSkeleton />
      ) : queue.length === 0 ? (
        <EmptyQueue />
      ) : (
        <div className="space-y-6">
          {/* Awaiting claim */}
          {submitted.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                Awaiting review ({submitted.length})
              </h2>
              <div className="grid gap-3">
                {submitted.map((r) => (
                  <QueueCard
                    key={r._id}
                    report={r}
                    onClaim={() => void claim({ reportId: r._id })}
                  />
                ))}
              </div>
            </section>
          )}

          {/* In review */}
          {inReview.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Eye className="h-3.5 w-3.5" />
                In review ({inReview.length})
              </h2>
              <div className="grid gap-3">
                {inReview.map((r) => (
                  <QueueCard
                    key={r._id}
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

      <ApproveDialog
        reportId={approvingId}
        onClose={() => setApprovingId(null)}
      />
      <RejectDialog
        reportId={rejectingId}
        onClose={() => setRejectingId(null)}
      />
    </div>
    </PageTransition>
  );
}

// ─── Queue Card ─────────────────────────────────────────────────────────────

type QueueReport = {
  _id: Id<"reports">;
  number: string;
  kind: string;
  status: string;
  projectName: string;
  creatorName: string;
  reviewerName: string | null;
  _creationTime: number;
  submittedAt?: number;
  reviewingSince?: number;
};

function QueueCard({
  report,
  onClaim,
  onApprove,
  onReject,
}: {
  report: QueueReport;
  onClaim?: () => void;
  onApprove?: () => void;
  onReject?: () => void;
}) {
  return (
    <Card className="hover:shadow-md transition-shadow duration-150 group">
      <CardContent className="py-4">
        <div className="flex items-start gap-4">
          {/* Left: icon */}
          <div className="hidden sm:flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted group-hover:bg-blue-50 dark:group-hover:bg-blue-950/30 transition-colors duration-150">
            <FileText className="size-5 text-muted-foreground group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-150" />
          </div>

          {/* Middle: info */}
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Link
                to="/app/reports/$reportId"
                params={{ reportId: report._id }}
                className="font-mono text-sm font-semibold hover:underline"
              >
                {report.number}
              </Link>
              <ReportStatusBadge status={report.status} />
              <Badge variant="outline" className="text-xs">
                {KIND_LABELS[report.kind] ?? report.kind}
              </Badge>
            </div>
            <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
              <span className="inline-flex items-center gap-1">
                <FolderKanban className="h-3 w-3" />
                {report.projectName}
              </span>
              <span className="inline-flex items-center gap-1">
                <User className="h-3 w-3" />
                {report.creatorName}
              </span>
              {report.reviewerName && (
                <span className="inline-flex items-center gap-1">
                  <ClipboardCheck className="h-3 w-3" />
                  {report.reviewerName}
                </span>
              )}
              {/* Timing info */}
              {report.submittedAt && (
                <span className="inline-flex items-center gap-1 text-xs">
                  <Clock className="h-3 w-3" />
                  {formatTimeAgo(report.status === "submitted" ? report.submittedAt : (report.reviewingSince ?? report.submittedAt))}
                </span>
              )}
            </div>
          </div>

          {/* Right: actions */}
          <div className="flex items-center gap-2 shrink-0">
            <Button asChild variant="ghost" size="sm">
              <Link
                to="/app/reports/$reportId"
                params={{ reportId: report._id }}
              >
                <ExternalLink className="h-3.5 w-3.5 mr-1" />
                View
              </Link>
            </Button>
            {report.status === "submitted" && onClaim && (
              <Button size="sm" variant="outline" onClick={onClaim}>
                <Eye className="h-3.5 w-3.5 mr-1" />
                Claim
              </Button>
            )}
            {report.status === "in_review" && (
              <>
                {onApprove && (
                  <Button size="sm" onClick={onApprove}>
                    <CheckCircle className="h-3.5 w-3.5 mr-1" />
                    Approve
                  </Button>
                )}
                {onReject && (
                  <Button size="sm" variant="destructive" onClick={onReject}>
                    <XCircle className="h-3.5 w-3.5 mr-1" />
                    Reject
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Empty state ────────────────────────────────────────────────────────────

function EmptyQueue() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-16 text-center">
        <div className="size-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-4">
          <ClipboardCheck className="size-6 text-emerald-600" />
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
      <div className="space-y-3 mt-6">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    </div>
  );
}

// ─── Approve dialog ─────────────────────────────────────────────────────────

function ApproveDialog({
  reportId,
  onClose,
}: {
  reportId: Id<"reports"> | null;
  onClose: () => void;
}) {
  const approveMut = useMutation(api.reports.mutations.approve);
  const generateUrl = useMutation(api.reports.attachments.generateUploadUrl);
  const [comments, setComments] = useState("");
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleApprove = async () => {
    if (!reportId || !signatureDataUrl) return;
    setSubmitting(true);
    try {
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

      await approveMut({
        reportId,
        signatureStorageId: storageId,
        comments: comments || undefined,
      });
      toast.success("Report approved.");
      setComments("");
      setSignatureDataUrl(null);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={reportId !== null} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-lg gap-0 p-0 overflow-hidden" showCloseButton={false}>
        {/* Accent header */}
        <div className="bg-gradient-to-b from-emerald-50 to-transparent dark:from-emerald-950/40 dark:to-transparent px-5 pt-5 pb-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className="size-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center shrink-0 mt-0.5">
                <ShieldCheck className="size-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <DialogTitle className="text-base font-semibold">Approve report</DialogTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Sign below to approve. Your signature will appear on the delivered PDF.
                </p>
              </div>
            </div>
            <DialogClose asChild>
              <Button variant="ghost" size="icon-sm" className="shrink-0 -mr-1 -mt-1 text-muted-foreground hover:text-foreground">
                <XIcon className="size-4" />
                <span className="sr-only">Close</span>
              </Button>
            </DialogClose>
          </div>
        </div>

        {/* Content */}
        <div className="px-5 py-4 space-y-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Signature</Label>
            <SignaturePad onCapture={setSignatureDataUrl} />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Comments
              <span className="text-muted-foreground font-normal ml-1.5">Optional</span>
            </Label>
            <Textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              rows={2}
              placeholder="Any notes for the record..."
              className="resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="border-t bg-muted/40 px-5 py-3.5 flex items-center justify-end gap-2.5">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            className="min-w-[140px]"
            disabled={!signatureDataUrl || submitting}
            onClick={() => void handleApprove()}
          >
            <CheckCircle className="size-4 mr-1.5" />
            {submitting ? "Approving..." : "Approve & sign"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Reject dialog ──────────────────────────────────────────────────────────

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
      <DialogContent className="sm:max-w-md gap-0 p-0 overflow-hidden" showCloseButton={false}>
        {/* Accent header */}
        <div className="bg-gradient-to-b from-red-50 to-transparent dark:from-red-950/40 dark:to-transparent px-5 pt-5 pb-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className="size-9 rounded-lg bg-red-100 dark:bg-red-900/50 flex items-center justify-center shrink-0 mt-0.5">
                <PenLine className="size-4 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <DialogTitle className="text-base font-semibold">Request changes</DialogTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  The tech will see your feedback and can resubmit.
                </p>
              </div>
            </div>
            <DialogClose asChild>
              <Button variant="ghost" size="icon-sm" className="shrink-0 -mr-1 -mt-1 text-muted-foreground hover:text-foreground">
                <XIcon className="size-4" />
                <span className="sr-only">Close</span>
              </Button>
            </DialogClose>
          </div>
        </div>

        {/* Content */}
        <div className="px-5 py-4 space-y-2">
          <Label className="text-sm font-medium">What needs to be fixed?</Label>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
            placeholder="e.g. Mix design number doesn't match the ticket, missing placement location..."
            required
            className="resize-none"
          />
          <p className="text-xs text-muted-foreground">
            Be specific so the tech knows exactly what to correct.
          </p>
        </div>

        {/* Footer */}
        <div className="border-t bg-muted/40 px-5 py-3.5 flex items-center justify-end gap-2.5">
          <Button variant="outline" onClick={onClose}>
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
                  toast.success("Report returned to tech.");
                  setReason("");
                  onClose();
                })
                .finally(() => setSubmitting(false));
            }}
          >
            <XCircle className="size-4 mr-1.5" />
            {submitting ? "Sending..." : "Request changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
