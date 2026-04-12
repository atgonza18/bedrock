import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { useSetBreadcrumbs } from "@/components/layout/breadcrumb-context";
import { PageTransition } from "@/components/layout/PageTransition";
import { toast } from "sonner";
import {
  FlaskConical,
  AlertTriangle,
  Clock,
  CheckCircle2,
  CalendarDays,
  XIcon,
  Hammer,
} from "lucide-react";

export const Route = createFileRoute("/app/lab/")({
  component: LabQueuePage,
});

const FRACTURE_TYPES: { value: string; label: string }[] = [
  { value: "1", label: "Type 1 — Cones on both ends" },
  { value: "2", label: "Type 2 — Cone on one end, vertical crack" },
  { value: "3", label: "Type 3 — Columnar vertical cracking" },
  { value: "4", label: "Type 4 — Diagonal fracture, no cracks through cap" },
  { value: "5", label: "Type 5 — Side fractures at top or bottom" },
  { value: "6", label: "Type 6 — Similar to Type 5 but pointed end" },
];

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function formatDateFull(ts: number): string {
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function daysFromNow(ts: number): number {
  const now = new Date().setHours(0, 0, 0, 0);
  return Math.round((ts - now) / (24 * 60 * 60 * 1000));
}

type QueueItem = {
  cylinder: {
    _id: Id<"concreteCylinders">;
    cylinderNumber: string;
    breakAgeDays: number;
  };
  set: { setLabel: string; castDate: number };
  targetBreakDate: number;
  reportNumber: string;
  projectName: string;
};

function LabQueuePage() {
  const queue = useQuery(api.lab.queries.listBreakQueue);
  const recentBreaks = useQuery(api.lab.queries.listRecentBreaks);
  const [breakingCylinder, setBreakingCylinder] = useState<QueueItem | null>(null);

  useSetBreadcrumbs([{ label: "Lab" }]);

  return (
    <PageTransition>
      <div className="mx-auto max-w-5xl px-4 sm:px-6 py-6 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-heading text-2xl font-bold tracking-tight">
              Lab Queue
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Concrete cylinder break schedule and results.
            </p>
          </div>
          {queue && (
            <div className="hidden sm:flex items-center gap-2">
              {queue.overdue.length > 0 && (
                <Badge variant="destructive" className="text-xs gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {queue.overdue.length} overdue
                </Badge>
              )}
              <Badge variant="outline" className="text-xs gap-1">
                <Clock className="h-3 w-3" />
                {queue.total} pending
              </Badge>
            </div>
          )}
        </div>

        {queue === undefined ? (
          <div className="space-y-4">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : queue.total === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="size-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-4">
                <CheckCircle2 className="size-6 text-emerald-600" />
              </div>
              <h3 className="font-heading font-semibold mb-1">All caught up</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                No cylinders pending breaks. New cylinders will appear here when
                concrete reports are submitted.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Overdue */}
            {queue.overdue.length > 0 && (
              <QueueSection
                label="Overdue"
                icon={<AlertTriangle className="h-3.5 w-3.5 text-red-500" />}
                items={queue.overdue}
                onBreak={setBreakingCylinder}
                urgency="overdue"
              />
            )}
            {/* Today */}
            {queue.today.length > 0 && (
              <QueueSection
                label="Due today"
                icon={<Clock className="h-3.5 w-3.5 text-amber-500" />}
                items={queue.today}
                onBreak={setBreakingCylinder}
                urgency="today"
              />
            )}
            {/* This week */}
            {queue.thisWeek.length > 0 && (
              <QueueSection
                label="This week"
                icon={<CalendarDays className="h-3.5 w-3.5" />}
                items={queue.thisWeek}
                onBreak={setBreakingCylinder}
                urgency="normal"
              />
            )}
            {/* Upcoming */}
            {queue.upcoming.length > 0 && (
              <QueueSection
                label="Upcoming"
                icon={<CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />}
                items={queue.upcoming}
                onBreak={setBreakingCylinder}
                urgency="normal"
              />
            )}
          </div>
        )}

        {/* Recent break results */}
        {recentBreaks && recentBreaks.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-sm font-heading font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Recent Results
            </h2>
            <Card>
              <CardContent className="py-3">
                <div className="space-y-0.5">
                  {recentBreaks.slice(0, 10).map((r) => (
                    <div
                      key={r.cylinder._id}
                      className="flex items-center justify-between rounded-lg px-3 py-2.5 text-sm"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="size-8 rounded-md bg-muted flex items-center justify-center shrink-0">
                          <FlaskConical className="size-3.5 text-muted-foreground" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium truncate">
                            {r.reportNumber} — {r.setLabel} / {r.cylinder.cylinderNumber}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {r.projectName} · {r.cylinder.breakAgeDays}-day break ·{" "}
                            {r.cylinder.breakDate ? formatDateFull(r.cylinder.breakDate) : "—"}
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0 ml-4">
                        <p className="font-mono font-semibold">
                          {r.cylinder.strengthPsi?.toLocaleString() ?? "—"} psi
                        </p>
                        {r.cylinder.fractureType && (
                          <p className="text-xs text-muted-foreground">
                            Type {r.cylinder.fractureType}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </section>
        )}

        {/* Break recording dialog */}
        <BreakDialog
          item={breakingCylinder}
          onClose={() => setBreakingCylinder(null)}
        />
      </div>
    </PageTransition>
  );
}

// ─── Queue Section ──────────────────────────────────────────────────────────

function QueueSection({
  label,
  icon,
  items,
  onBreak,
  urgency,
}: {
  label: string;
  icon: React.ReactNode;
  items: QueueItem[];
  onBreak: (item: QueueItem) => void;
  urgency: "overdue" | "today" | "normal";
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-heading font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
        {icon}
        {label} ({items.length})
      </h2>
      <div className="grid gap-2">
        {items.map((item) => (
          <Card
            key={item.cylinder._id}
            className={
              urgency === "overdue"
                ? "border-red-200 dark:border-red-900/50"
                : urgency === "today"
                  ? "border-amber-200 dark:border-amber-900/50"
                  : ""
            }
          >
            <CardContent className="py-3.5">
              <div className="flex items-center gap-3">
                <div className="size-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <FlaskConical className="size-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-sm font-medium">
                      {item.reportNumber}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {item.set.setLabel} / {item.cylinder.cylinderNumber}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      {item.cylinder.breakAgeDays}-day
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {item.projectName} · Cast {formatDate(item.set.castDate)} · Due{" "}
                    {formatDate(item.targetBreakDate)}
                    {urgency === "overdue" && (
                      <span className="text-red-500 font-medium">
                        {" "}
                        ({Math.abs(daysFromNow(item.targetBreakDate))}d overdue)
                      </span>
                    )}
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => onBreak(item)}
                >
                  <Hammer className="h-3.5 w-3.5 mr-1" />
                  Record break
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}

// ─── Break Recording Dialog ─────────────────────────────────────────────────

function BreakDialog({
  item,
  onClose,
}: {
  item: QueueItem | null;
  onClose: () => void;
}) {
  const recordBreak = useMutation(api.lab.mutations.recordCylinderBreak);
  const [loadLbs, setLoadLbs] = useState("");
  const [areaSqIn, setAreaSqIn] = useState("12.57"); // Default 4" cylinder: π * 2² ≈ 12.57
  const [fractureType, setFractureType] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Calculate strength from load and area
  const load = parseFloat(loadLbs);
  const area = parseFloat(areaSqIn);
  const strengthPsi = !isNaN(load) && !isNaN(area) && area > 0 ? Math.round(load / area) : null;

  const handleSubmit = () => {
    if (!item || strengthPsi === null || !fractureType) return;
    setSubmitting(true);
    void recordBreak({
      cylinderId: item.cylinder._id,
      loadLbs: load,
      areaSqIn: area,
      strengthPsi,
      fractureType: fractureType as "1" | "2" | "3" | "4" | "5" | "6",
      notes: notes || undefined,
    })
      .then(() => {
        toast.success(
          `Break recorded: ${strengthPsi.toLocaleString()} psi (${item.cylinder.cylinderNumber})`,
        );
        setLoadLbs("");
        setAreaSqIn("12.57");
        setFractureType("");
        setNotes("");
        onClose();
      })
      .finally(() => setSubmitting(false));
  };

  return (
    <Dialog open={item !== null} onOpenChange={() => onClose()}>
      <DialogContent
        className="sm:max-w-md gap-0 p-0 overflow-hidden"
        showCloseButton={false}
      >
        {/* Header */}
        <div className="bg-gradient-to-b from-blue-50 to-transparent dark:from-blue-950/40 dark:to-transparent px-5 pt-5 pb-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className="size-9 rounded-lg bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center shrink-0 mt-0.5">
                <Hammer className="size-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <DialogTitle className="text-base font-semibold">
                  Record cylinder break
                </DialogTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {item
                    ? `${item.reportNumber} — ${item.set.setLabel} / ${item.cylinder.cylinderNumber} (${item.cylinder.breakAgeDays}-day)`
                    : ""}
                </p>
              </div>
            </div>
            <DialogClose asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                className="shrink-0 -mr-1 -mt-1 text-muted-foreground hover:text-foreground"
              >
                <XIcon className="size-4" />
                <span className="sr-only">Close</span>
              </Button>
            </DialogClose>
          </div>
        </div>

        {/* Form */}
        <div className="px-5 py-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Max load (lbs)</Label>
              <Input
                type="number"
                inputMode="decimal"
                value={loadLbs}
                onChange={(e) => setLoadLbs(e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Area (in²)
              </Label>
              <Input
                type="number"
                inputMode="decimal"
                value={areaSqIn}
                onChange={(e) => setAreaSqIn(e.target.value)}
                placeholder="12.57"
              />
            </div>
          </div>

          {/* Calculated strength */}
          <div className="rounded-lg bg-muted/50 border px-4 py-3">
            <p className="text-xs text-muted-foreground">Compressive strength</p>
            <p className="font-heading text-2xl font-bold tracking-tight mt-0.5">
              {strengthPsi !== null ? `${strengthPsi.toLocaleString()} psi` : "—"}
            </p>
            {strengthPsi !== null && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {load.toLocaleString()} lbs ÷ {area} in² = {strengthPsi.toLocaleString()} psi
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Fracture type (ASTM C39)
            </Label>
            <Select value={fractureType} onValueChange={setFractureType}>
              <SelectTrigger>
                <SelectValue placeholder="Select fracture type..." />
              </SelectTrigger>
              <SelectContent>
                {FRACTURE_TYPES.map((ft) => (
                  <SelectItem key={ft.value} value={ft.value}>
                    {ft.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Notes
              <span className="text-muted-foreground font-normal ml-1.5">
                Optional
              </span>
            </Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Any observations about the specimen or break..."
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
            disabled={strengthPsi === null || !fractureType || submitting}
            onClick={handleSubmit}
            className="min-w-[130px]"
          >
            <CheckCircle2 className="size-4 mr-1.5" />
            {submitting ? "Recording..." : "Record break"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
