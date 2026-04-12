import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  FilePlus,
  Send,
  Eye,
  CheckCircle2,
  XCircle,
  FileOutput,
  Mail,
  MailCheck,
  Globe,
  Clock,
  Timer,
} from "lucide-react";
import { cn } from "@/lib/utils";

type AuditEntry = {
  _id: string;
  event: string;
  at: number;
  actorName: string;
  metadata?: string;
};

type TimelineProps = {
  report: {
    _creationTime: number;
    status: string;
    submittedAt?: number;
    reviewingSince?: number;
    approvedAt?: number;
    rejectedAt?: number;
    deliveredAt?: number;
  };
  creatorName: string;
  reviewerName: string | null;
  rejectedByName: string | null;
  projectName: string;
  approval: {
    approverName: string;
    approvedAt: number;
  } | null;
  auditLog: AuditEntry[];
};

const EVENT_CONFIG: Record<
  string,
  {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    color: string;
    dotColor: string;
  }
> = {
  created: {
    icon: FilePlus,
    label: "Created",
    color: "text-muted-foreground",
    dotColor: "bg-muted-foreground",
  },
  edited: {
    icon: Clock,
    label: "Edited",
    color: "text-muted-foreground",
    dotColor: "bg-muted-foreground",
  },
  submitted: {
    icon: Send,
    label: "Submitted",
    color: "text-blue-600 dark:text-blue-400",
    dotColor: "bg-blue-500",
  },
  claimed_for_review: {
    icon: Eye,
    label: "Claimed for review",
    color: "text-amber-600 dark:text-amber-400",
    dotColor: "bg-amber-500",
  },
  approved: {
    icon: CheckCircle2,
    label: "Approved",
    color: "text-emerald-600 dark:text-emerald-400",
    dotColor: "bg-emerald-500",
  },
  rejected: {
    icon: XCircle,
    label: "Rejected",
    color: "text-red-600 dark:text-red-400",
    dotColor: "bg-red-500",
  },
  pdf_generated: {
    icon: FileOutput,
    label: "PDF generated",
    color: "text-purple-600 dark:text-purple-400",
    dotColor: "bg-purple-500",
  },
  email_queued: {
    icon: Mail,
    label: "Email queued",
    color: "text-muted-foreground",
    dotColor: "bg-muted-foreground",
  },
  email_sent: {
    icon: MailCheck,
    label: "Email sent",
    color: "text-emerald-600 dark:text-emerald-400",
    dotColor: "bg-emerald-500",
  },
  email_failed: {
    icon: Mail,
    label: "Email failed",
    color: "text-red-600 dark:text-red-400",
    dotColor: "bg-red-500",
  },
  portal_viewed: {
    icon: Globe,
    label: "Portal viewed",
    color: "text-muted-foreground",
    dotColor: "bg-muted-foreground",
  },
};

function formatDateTime(ts: number): string {
  return new Date(ts).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDateTimeFull(ts: number): string {
  return new Date(ts).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDuration(ms: number): string {
  const totalMinutes = Math.floor(ms / 60_000);
  if (totalMinutes < 1) return "< 1 min";
  if (totalMinutes < 60) return `${totalMinutes}m`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours < 24) {
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
}

export function ReportTimeline({
  report,
  creatorName,
  reviewerName,
  rejectedByName,
  projectName,
  approval,
  auditLog,
}: TimelineProps) {
  const chronological = [...auditLog].reverse();
  const filtered = chronological.filter((e) => e.event !== "edited");

  // Calculate durations
  const draftToSubmit =
    report.submittedAt ? report.submittedAt - report._creationTime : null;
  const submitToReview =
    report.reviewingSince && report.submittedAt
      ? report.reviewingSince - report.submittedAt
      : null;
  const reviewDuration = (() => {
    if (report.reviewingSince) {
      if (report.approvedAt) return report.approvedAt - report.reviewingSince;
      if (report.rejectedAt) return report.rejectedAt - report.reviewingSince;
      return Date.now() - report.reviewingSince;
    }
    return null;
  })();
  const isReviewLive =
    report.reviewingSince && !report.approvedAt && !report.rejectedAt;

  return (
    <Card>
      <CardHeader className="pb-2 px-4">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-sm">Activity</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        {/* Duration chips */}
        {(draftToSubmit !== null || submitToReview !== null || reviewDuration !== null) && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {draftToSubmit !== null && (
              <DurationChip label="Draft" value={formatDuration(draftToSubmit)} />
            )}
            {submitToReview !== null && (
              <DurationChip label="Wait" value={formatDuration(submitToReview)} />
            )}
            {reviewDuration !== null && (
              <DurationChip
                label="Review"
                value={formatDuration(reviewDuration)}
                live={!!isReviewLive}
              />
            )}
          </div>
        )}

        {/* Timeline events */}
        <div className="relative">
          <div className="absolute left-[5px] top-2 bottom-2 w-px bg-border" />

          <div className="space-y-0">
            {filtered.map((entry) => {
              const config = EVENT_CONFIG[entry.event] ?? {
                icon: Clock,
                label: entry.event,
                color: "text-muted-foreground",
                dotColor: "bg-muted-foreground",
              };
              const parsedMeta = entry.metadata
                ? tryParseJson(entry.metadata)
                : null;

              return (
                <div key={entry._id} className="relative flex gap-2.5 pb-3.5 last:pb-0">
                  {/* Dot */}
                  <div
                    className={cn(
                      "relative z-10 mt-1 size-[11px] shrink-0 rounded-full border-2 border-background",
                      config.dotColor,
                    )}
                  />

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-xs font-medium leading-tight", config.color)}>
                      {config.label}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {entry.actorName} &middot; {formatDateTime(entry.at)}
                    </p>
                    {parsedMeta?.reason && (
                      <p className="text-[11px] text-muted-foreground mt-0.5 italic line-clamp-2">
                        &ldquo;{parsedMeta.reason}&rdquo;
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Key details */}
        <div className="border-t mt-3 pt-3 space-y-2">
          <DetailRow label="Created by" value={creatorName} />
          <DetailRow
            label="Created"
            value={formatDateTimeFull(report._creationTime)}
          />
          {report.submittedAt && (
            <DetailRow
              label="Submitted"
              value={formatDateTimeFull(report.submittedAt)}
            />
          )}
          {reviewerName && (
            <DetailRow label="Reviewer" value={reviewerName} />
          )}
          {report.reviewingSince && (
            <DetailRow
              label="Review started"
              value={formatDateTimeFull(report.reviewingSince)}
            />
          )}
          {report.approvedAt && approval && (
            <>
              <DetailRow
                label="Approved by"
                value={approval.approverName}
              />
              <DetailRow
                label="Approved"
                value={formatDateTimeFull(report.approvedAt)}
              />
            </>
          )}
          {report.rejectedAt && (
            <>
              <DetailRow
                label="Rejected by"
                value={rejectedByName ?? "Unknown"}
              />
              <DetailRow
                label="Rejected"
                value={formatDateTimeFull(report.rejectedAt)}
              />
            </>
          )}
          <DetailRow label="Project" value={projectName} />
        </div>
      </CardContent>
    </Card>
  );
}

function DurationChip({
  label,
  value,
  live,
}: {
  label: string;
  value: string;
  live?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px]",
        live && "border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950",
      )}
    >
      <Timer className="h-2.5 w-2.5 text-muted-foreground" />
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold">{value}</span>
      {live && (
        <span className="relative flex h-1.5 w-1.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500" />
        </span>
      )}
    </span>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2 text-xs">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="font-medium text-right truncate">{value}</span>
    </div>
  );
}

function tryParseJson(s: string): Record<string, any> | null {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}
