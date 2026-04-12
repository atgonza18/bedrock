import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft,
  Download,
  ExternalLink,
  Send,
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileText,
  Truck,
  XIcon,
  ShieldCheck,
  PenLine,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { ReportStatusBadge } from "@/features/reports/ReportStatusBadge";
import { ConcreteFieldForm } from "@/features/reports/forms/ConcreteFieldForm";
import { NuclearDensityForm } from "@/features/reports/forms/NuclearDensityForm";
import { ProofRollForm } from "@/features/reports/forms/ProofRollForm";
import { DcpForm } from "@/features/reports/forms/DcpForm";
import { PhotoCapture } from "@/features/reports/PhotoCapture";
import { CylinderSetEditor } from "@/features/reports/CylinderSetEditor";
import { DensityReadingsEditor } from "@/features/reports/DensityReadingsEditor";
import { DcpLayersEditor } from "@/features/reports/DcpLayersEditor";
import { PileLoadForm } from "@/features/reports/forms/PileLoadForm";
import { PileLoadIncrementEditor } from "@/features/reports/PileLoadIncrementEditor";
import { validateForSubmit } from "@/lib/schemas/concreteField";
import { ReportWizard, WizardStep } from "@/features/reports/ReportWizard";
import { ReportTimeline } from "@/features/reports/ReportTimeline";
import { useSetBreadcrumbs } from "@/components/layout/breadcrumb-context";
import { PageTransition } from "@/components/layout/PageTransition";
import { useCurrentMember } from "@/features/auth/useCurrentMember";
import { canEditReport } from "@/lib/permissions";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { SignaturePad } from "@/features/queue/SignaturePad";
import { useState } from "react";
import { KIND_LABELS } from "@/lib/constants";

export const Route = createFileRoute("/app/reports/$reportId")({
  component: ReportDetailPage,
});

const STATUS_STEPS = ["draft", "submitted", "in_review", "approved", "delivered"];

function getStatusProgress(status: string): number {
  const idx = STATUS_STEPS.indexOf(status);
  if (status === "rejected") return 20;
  if (idx < 0) return 0;
  return ((idx + 1) / STATUS_STEPS.length) * 100;
}

function ReportDetailPage() {
  const { reportId } = Route.useParams();
  const router = useRouter();
  const me = useCurrentMember();
  const data = useQuery(api.reports.queries.getById, {
    reportId: reportId as Id<"reports">,
  });
  const submitReport = useMutation(api.reports.mutations.submit);
  const approveMut = useMutation(api.reports.mutations.approve);
  const rejectMut = useMutation(api.reports.mutations.rejectWithComments);
  const generateUploadUrl = useMutation(api.reports.attachments.generateUploadUrl);
  const [showResubmitDialog, setShowResubmitDialog] = useState(false);
  const [resubmissionNote, setResubmissionNote] = useState("");
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [approveComments, setApproveComments] = useState("");
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [actionSubmitting, setActionSubmitting] = useState(false);
  const [proctorValues, setProctorValues] = useState<{ maxDryDensityPcf: number; optimumMoisturePct: number } | null>(null);

  useSetBreadcrumbs(
    data
      ? [
          { label: "Projects", href: "/app/projects" },
          {
            label: data.project?.name ?? "Project",
            href: `/app/projects/${data.report.projectId}`,
          },
          { label: data.report.number ?? "Report" },
        ]
      : [{ label: "Loading..." }],
  );

  if (data === undefined) {
    return (
      <div className="px-4 sm:px-6 py-8 space-y-4">
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-4 w-48" />
        <div className="flex gap-6">
          <Skeleton className="h-96 flex-1" />
          <Skeleton className="h-64 w-80 hidden xl:block" />
        </div>
      </div>
    );
  }

  const { report, project, creatorName, detail, cylinderSets, attachments } =
    data;
  const statusEditable = report.status === "draft" || report.status === "rejected";
  const userCanEdit = me?.state === "ok" && canEditReport(me, report);
  const isEditable = statusEditable && userCanEdit;
  const isResubmission = report.status === "rejected";
  const isPmOrAdmin = me?.state === "ok" && (me.membership.role === "pm" || me.membership.role === "admin");
  const canReview = isPmOrAdmin && report.status === "in_review";
  const hasTimeline = data.auditLog && data.auditLog.length > 0;

  const handleApprove = async () => {
    if (!signatureDataUrl) return;
    setActionSubmitting(true);
    try {
      const res = await fetch(signatureDataUrl);
      const blob = await res.blob();
      const uploadUrl = await generateUploadUrl({});
      const uploadRes = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": "image/png" },
        body: blob,
      });
      const { storageId } = (await uploadRes.json()) as { storageId: Id<"_storage"> };
      await approveMut({
        reportId: report._id,
        signatureStorageId: storageId,
        comments: approveComments || undefined,
      });
      toast.success("Report approved.");
      setApproveComments("");
      setSignatureDataUrl(null);
      setShowApproveDialog(false);
    } finally {
      setActionSubmitting(false);
    }
  };

  const handleReject = () => {
    if (!rejectReason.trim()) return;
    setActionSubmitting(true);
    void rejectMut({ reportId: report._id, reason: rejectReason })
      .then(() => {
        toast.success("Report returned to tech.");
        setRejectReason("");
        setShowRejectDialog(false);
      })
      .finally(() => setActionSubmitting(false));
  };

  const handleSubmit = () => {
    if (report.kind === "concrete_field" && detail) {
      const missing = validateForSubmit({
        mixDesignNumber: detail.mixDesignNumber ?? undefined,
        supplier: detail.supplier ?? undefined,
        ticketNumber: detail.ticketNumber ?? undefined,
        placementLocation: detail.placementLocation ?? undefined,
      });
      if (missing.length > 0) {
        toast.error(
          `Fill in required fields before submitting: ${missing.join(", ")}`,
        );
        return;
      }
    }
    // If resubmitting a rejected report, show dialog for optional note.
    if (isResubmission) {
      setShowResubmitDialog(true);
      return;
    }
    void submitReport({ reportId: report._id }).then(() => {
      toast.success("Report submitted for review.");
    });
  };

  const handleResubmit = () => {
    void submitReport({
      reportId: report._id,
      resubmissionNote: resubmissionNote.trim() || undefined,
    }).then(() => {
      setShowResubmitDialog(false);
      setResubmissionNote("");
      toast.success("Report resubmitted for review.");
    });
  };

  const handleBack = () => {
    if (window.history.length > 1) {
      router.history.back();
    } else {
      void router.navigate({
        to: "/app/projects/$projectId",
        params: { projectId: report.projectId },
      });
    }
  };

  const formElement = (() => {
    switch (report.kind) {
      case "concrete_field":
        return <ConcreteFieldForm key={report._id} reportId={report._id} report={report} detail={detail} readOnly={!isEditable} />;
      case "nuclear_density":
        return <NuclearDensityForm key={report._id} reportId={report._id} report={report} detail={detail} readOnly={!isEditable} onProctorChange={setProctorValues} />;
      case "proof_roll":
        return <ProofRollForm key={report._id} reportId={report._id} report={report} detail={detail} readOnly={!isEditable} />;
      case "dcp":
        return <DcpForm key={report._id} reportId={report._id} report={report} detail={detail} readOnly={!isEditable} />;
      case "pile_load":
        return <PileLoadForm key={report._id} reportId={report._id} report={report} detail={detail} readOnly={!isEditable} />;
      default:
        return null;
    }
  })();

  const childElement = (() => {
    switch (report.kind) {
      case "concrete_field":
        return <CylinderSetEditor reportId={report._id} cylinderSets={cylinderSets} readOnly={!isEditable} />;
      case "nuclear_density":
        return <DensityReadingsEditor reportId={report._id} readings={data.densityReadings} readOnly={!isEditable} defaultMdd={proctorValues?.maxDryDensityPcf} defaultOmc={proctorValues?.optimumMoisturePct} />;
      case "dcp":
        return <DcpLayersEditor reportId={report._id} layers={data.dcpLayers} readOnly={!isEditable} />;
      case "pile_load":
        return <PileLoadIncrementEditor reportId={report._id} increments={data.pileLoadIncrements} readOnly={!isEditable} />;
      default:
        return null;
    }
  })();

  const buildSteps = (): WizardStep[] => {
    const steps: WizardStep[] = [
      {
        label: "Test Data",
        content: <Card><CardContent className="pt-6">{formElement}</CardContent></Card>,
      },
      {
        label: "Photos",
        content: <PhotoCapture reportId={report._id} attachments={attachments} readOnly={!isEditable} />,
      },
    ];
    if (childElement) {
      const childLabel =
        report.kind === "concrete_field" ? "Cylinders" :
        report.kind === "nuclear_density" ? "Density Readings" :
        report.kind === "dcp" ? "DCP Layers" :
        report.kind === "pile_load" ? "Load Increments" : "Details";
      steps.push({ label: childLabel, content: childElement });
    }
    return steps;
  };

  const statusProgress = getStatusProgress(report.status);

  const timelineElement = hasTimeline ? (
    <ReportTimeline
      report={report}
      creatorName={creatorName}
      reviewerName={data.reviewerName}
      rejectedByName={data.rejectedByName}
      projectName={project?.name ?? "Unknown"}
      approval={data.approval ? {
        approverName: data.approval.approverName,
        approvedAt: data.approval.approvedAt,
      } : null}
      auditLog={data.auditLog}
    />
  ) : null;

  return (
    <PageTransition>
    <div className="px-4 sm:px-6 py-6 pb-28 sm:pb-8">
      {/* Header — full width */}
      <div className="max-w-7xl mx-auto space-y-4 mb-6">
        <div className="flex items-start gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="mt-0.5 shrink-0"
            onClick={handleBack}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-heading font-bold tracking-tight font-mono">
                {report.number}
              </h1>
              <ReportStatusBadge status={report.status} />
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              {KIND_LABELS[report.kind] ?? report.kind} &middot;{" "}
              {project?.name ?? "Unknown project"} &middot; {creatorName}
            </p>
          </div>
          {isEditable && (
            <Button
              onClick={handleSubmit}
              className="shrink-0 hidden sm:inline-flex"
            >
              <Send className="h-4 w-4 mr-1.5" />
              Submit for review
            </Button>
          )}
          {canReview && (
            <div className="flex items-center gap-2 shrink-0 hidden sm:flex">
              <Button size="sm" onClick={() => setShowApproveDialog(true)}>
                <CheckCircle className="h-3.5 w-3.5 mr-1" />
                Approve
              </Button>
              <Button size="sm" variant="destructive" onClick={() => setShowRejectDialog(true)}>
                <XCircle className="h-3.5 w-3.5 mr-1" />
                Reject
              </Button>
            </div>
          )}
        </div>

        {/* Status progress bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              {report.status === "rejected" ? (
                <AlertTriangle className="h-3 w-3 text-destructive" />
              ) : report.status === "approved" || report.status === "delivered" ? (
                <CheckCircle2 className="h-3 w-3 text-emerald-600" />
              ) : (
                <Clock className="h-3 w-3" />
              )}
              <span className="capitalize">{report.status.replace(/_/g, " ")}</span>
            </div>
            {report.fieldDate && (
              <span>
                Field date: {new Date(report.fieldDate).toLocaleDateString()}
              </span>
            )}
          </div>
          <Progress value={statusProgress} className="h-1.5" />
        </div>
      </div>

      {/* Sticky mobile action bar */}
      {(isEditable || canReview) && (
        <div
          className="fixed bottom-0 left-0 right-0 z-30 border-t bg-background/95 backdrop-blur p-3 sm:hidden"
          style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
        >
          {isEditable && (
            <Button onClick={handleSubmit} className="w-full" size="lg">
              <Send className="h-4 w-4 mr-1.5" />
              Submit for review
            </Button>
          )}
          {canReview && (
            <div className="flex gap-2">
              <Button className="flex-1" size="lg" onClick={() => setShowApproveDialog(true)}>
                <CheckCircle className="h-4 w-4 mr-1.5" />
                Approve
              </Button>
              <Button className="flex-1" size="lg" variant="destructive" onClick={() => setShowRejectDialog(true)}>
                <XCircle className="h-4 w-4 mr-1.5" />
                Reject
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Resubmission dialog */}
      <Dialog open={showResubmitDialog} onOpenChange={setShowResubmitDialog}>
        <DialogContent className="sm:max-w-md gap-0 p-0 overflow-hidden" showCloseButton={false}>
          {/* Accent header */}
          <div className="bg-gradient-to-b from-blue-50 to-transparent dark:from-blue-950/40 dark:to-transparent px-5 pt-5 pb-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="size-9 rounded-lg bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center shrink-0 mt-0.5">
                  <Send className="size-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <DialogTitle className="text-base font-semibold">Resubmit for review</DialogTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Your report will go back to the review queue.
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

          {/* Rejection context */}
          {report.rejectionReason && (
            <div className="mx-5 mt-1 rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/20 px-3.5 py-3">
              <p className="text-xs font-medium text-red-700 dark:text-red-400 uppercase tracking-wider mb-1">Rejection reason</p>
              <p className="text-sm text-red-900 dark:text-red-300 leading-relaxed">{report.rejectionReason}</p>
            </div>
          )}

          {/* Note input */}
          <div className="px-5 py-4 space-y-2">
            <label className="text-sm font-medium text-foreground">
              What did you fix?
              <span className="text-muted-foreground font-normal ml-1.5">Optional</span>
            </label>
            <Textarea
              value={resubmissionNote}
              onChange={(e) => setResubmissionNote(e.target.value)}
              placeholder="e.g. Corrected mix design number, added missing ticket..."
              rows={3}
              className="resize-none"
            />
          </div>

          {/* Footer */}
          <div className="border-t bg-muted/40 px-5 py-3.5 flex items-center justify-end gap-2.5">
            <Button variant="outline" onClick={() => setShowResubmitDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleResubmit} className="min-w-[120px]">
              <Send className="size-4 mr-1.5" />
              Resubmit
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Approve dialog */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent className="sm:max-w-lg gap-0 p-0 overflow-hidden" showCloseButton={false}>
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
                value={approveComments}
                onChange={(e) => setApproveComments(e.target.value)}
                rows={2}
                placeholder="Any notes for the record..."
                className="resize-none"
              />
            </div>
          </div>
          <div className="border-t bg-muted/40 px-5 py-3.5 flex items-center justify-end gap-2.5">
            <Button variant="outline" onClick={() => setShowApproveDialog(false)}>Cancel</Button>
            <Button
              className="min-w-[140px]"
              disabled={!signatureDataUrl || actionSubmitting}
              onClick={() => void handleApprove()}
            >
              <CheckCircle className="size-4 mr-1.5" />
              {actionSubmitting ? "Approving..." : "Approve & sign"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reject dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent className="sm:max-w-md gap-0 p-0 overflow-hidden" showCloseButton={false}>
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
          <div className="px-5 py-4 space-y-2">
            <Label className="text-sm font-medium">What needs to be fixed?</Label>
            <Textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={4}
              placeholder="e.g. Mix design number doesn't match the ticket, missing placement location..."
              required
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Be specific so the tech knows exactly what to correct.
            </p>
          </div>
          <div className="border-t bg-muted/40 px-5 py-3.5 flex items-center justify-end gap-2.5">
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>Cancel</Button>
            <Button
              variant="destructive"
              className="min-w-[160px]"
              disabled={!rejectReason.trim() || actionSubmitting}
              onClick={handleReject}
            >
              <XCircle className="size-4 mr-1.5" />
              {actionSubmitting ? "Sending..." : "Request changes"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Two-column layout: form left, timeline right */}
      <div className="max-w-7xl mx-auto flex gap-6 items-start">
        {/* Left column — form content */}
        <div className="flex-1 min-w-0 space-y-6">
          {/* Rejection alert */}
          {report.status === "rejected" && report.rejectionReason && (
            <div className="rounded-xl border border-red-200 dark:border-red-900/50 bg-gradient-to-r from-red-50 to-red-50/50 dark:from-red-950/30 dark:to-red-950/10 p-4">
              <div className="flex items-start gap-3">
                <div className="size-8 rounded-lg bg-red-100 dark:bg-red-900/50 flex items-center justify-center shrink-0 mt-0.5">
                  <AlertTriangle className="size-4 text-red-600 dark:text-red-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-red-800 dark:text-red-300">Changes requested</p>
                  <p className="text-sm text-red-700 dark:text-red-400 mt-1 leading-relaxed">
                    {report.rejectionReason}
                  </p>
                  {data.rejectedByName && (
                    <p className="text-xs text-red-500 dark:text-red-500 mt-2">
                      &mdash; {data.rejectedByName}
                      {report.rejectedAt && <>, {new Date(report.rejectedAt).toLocaleDateString()}</>}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Form wizard */}
          <ReportWizard steps={buildSteps()} />

          {/* Approval info */}
          {data.approval && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <CardTitle className="text-base">Approval</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium">
                    Approved by {data.approval.approverName}
                  </span>
                  <span className="text-muted-foreground">
                    {new Date(data.approval.approvedAt).toLocaleString()}
                  </span>
                </div>
                {data.approval.comments && (
                  <p className="text-sm text-muted-foreground">{data.approval.comments}</p>
                )}
                {data.approval.signatureUrl && (
                  <div className="border rounded-md bg-white p-2 inline-block">
                    <img src={data.approval.signatureUrl} alt="Approval signature" className="h-16" />
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Delivery info */}
          {report.status === "delivered" && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Truck className="h-4 w-4 text-blue-600" />
                  <CardTitle className="text-base">Delivery</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.pdfUrl && (
                  <Button asChild variant="outline" size="sm">
                    <a href={data.pdfUrl} target="_blank" rel="noopener noreferrer">
                      <Download className="h-4 w-4 mr-1.5" />
                      Download PDF
                    </a>
                  </Button>
                )}
                {data.portalTokens.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Portal Links</p>
                    {data.portalTokens.map((pt) => {
                      const portalUrl = `${window.location.origin}/r/${pt.token}`;
                      return (
                        <div key={pt.token} className="flex items-center gap-3 text-sm rounded-md border p-2.5">
                          <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                          <div className="flex-1 min-w-0">
                            <span className="font-medium">{pt.contactName}</span>{" "}
                            <span className="text-muted-foreground">({pt.contactEmail})</span>
                          </div>
                          <Button asChild variant="ghost" size="sm">
                            <a href={portalUrl} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-3.5 w-3.5 mr-1" />
                              Open
                            </a>
                          </Button>
                          {pt.accessCount > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              Viewed {pt.accessCount}x
                            </Badge>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No recipients configured on this project. Add client contacts in Admin and set them as default recipients.
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Mobile: timeline below form */}
          {timelineElement && (
            <div className="xl:hidden">
              {timelineElement}
            </div>
          )}
        </div>

        {/* Right column — sticky timeline (desktop only) */}
        {timelineElement && (
          <div className="hidden xl:block w-[340px] shrink-0 sticky top-16">
            {timelineElement}
          </div>
        )}
      </div>
    </div>
    </PageTransition>
  );
}
