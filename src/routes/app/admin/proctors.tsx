import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { createFileRoute } from "@tanstack/react-router";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Layers, XIcon } from "lucide-react";

export const Route = createFileRoute("/app/admin/proctors")({
  component: AdminProctorsPage,
});

function AdminProctorsPage() {
  const proctors = useQuery(api.proctors.list);
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle>Proctor Curves</CardTitle>
          <CardDescription>
            Lab-determined maximum dry density and optimum moisture for soil types.
          </CardDescription>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Add Proctor
            </Button>
          </DialogTrigger>
          <CreateProctorDialog onSuccess={() => setCreateOpen(false)} />
        </Dialog>
      </CardHeader>
      <CardContent>
        {proctors === undefined ? (
          <Skeleton className="h-24 w-full" />
        ) : proctors.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No proctor curves yet. Add your first lab-determined curve.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Label</TableHead>
                <TableHead>Material</TableHead>
                <TableHead className="text-right">Max Dry Density (pcf)</TableHead>
                <TableHead className="text-right">Optimum Moisture (%)</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {proctors.map((p) => (
                <ProctorRow key={p._id} proctor={p} />
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function ProctorRow({
  proctor,
}: {
  proctor: {
    _id: Id<"proctorCurves">;
    label: string;
    materialDescription: string;
    maxDryDensityPcf: number;
    optimumMoisturePct: number;
  };
}) {
  const remove = useMutation(api.proctors.remove);

  return (
    <TableRow>
      <TableCell className="font-medium">{proctor.label}</TableCell>
      <TableCell className="text-muted-foreground">{proctor.materialDescription}</TableCell>
      <TableCell className="text-right font-mono text-sm">
        {proctor.maxDryDensityPcf.toFixed(1)}
      </TableCell>
      <TableCell className="text-right font-mono text-sm">
        {proctor.optimumMoisturePct.toFixed(1)}
      </TableCell>
      <TableCell>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => void remove({ proctorId: proctor._id })}
          title="Remove proctor curve"
        >
          <XIcon className="h-4 w-4" />
          <span className="sr-only">Remove</span>
        </Button>
      </TableCell>
    </TableRow>
  );
}

function CreateProctorDialog({ onSuccess }: { onSuccess: () => void }) {
  const create = useMutation(api.proctors.create);
  const [label, setLabel] = useState("");
  const [materialDescription, setMaterialDescription] = useState("");
  const [maxDryDensityPcf, setMaxDryDensityPcf] = useState("");
  const [optimumMoisturePct, setOptimumMoisturePct] = useState("");
  const [submitting, setSubmitting] = useState(false);

  return (
    <DialogContent className="sm:max-w-md gap-0 p-0 overflow-hidden" showCloseButton={false}>
      {/* Accent header */}
      <div className="bg-gradient-to-b from-violet-50 to-transparent dark:from-violet-950/40 dark:to-transparent px-5 pt-5 pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="size-9 rounded-lg bg-violet-100 dark:bg-violet-900/50 flex items-center justify-center shrink-0 mt-0.5">
              <Layers className="size-4 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold">Add a proctor curve</DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Lab-determined density and moisture for a soil type.
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

      {/* Form */}
      <form
        id="create-proctor-form"
        className="px-5 py-4 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          setSubmitting(true);
          void create({
            label,
            materialDescription,
            maxDryDensityPcf: parseFloat(maxDryDensityPcf),
            optimumMoisturePct: parseFloat(optimumMoisturePct),
          })
            .then(() => {
              setLabel("");
              setMaterialDescription("");
              setMaxDryDensityPcf("");
              setOptimumMoisturePct("");
              onSuccess();
            })
            .finally(() => setSubmitting(false));
        }}
      >
        <div className="space-y-2">
          <Label>Label</Label>
          <Input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. Modified Proctor - CL Soil"
            required
          />
        </div>
        <div className="space-y-2">
          <Label>Material description</Label>
          <Input
            value={materialDescription}
            onChange={(e) => setMaterialDescription(e.target.value)}
            placeholder="e.g. Brown sandy clay (CL)"
            required
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Max dry density (pcf)</Label>
            <Input
              type="number"
              step="any"
              value={maxDryDensityPcf}
              onChange={(e) => setMaxDryDensityPcf(e.target.value)}
              placeholder="e.g. 112.5"
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Optimum moisture (%)</Label>
            <Input
              type="number"
              step="any"
              value={optimumMoisturePct}
              onChange={(e) => setOptimumMoisturePct(e.target.value)}
              placeholder="e.g. 14.2"
              required
            />
          </div>
        </div>
      </form>

      {/* Footer */}
      <div className="border-t bg-muted/40 px-5 py-3.5 flex items-center justify-end gap-2.5">
        <DialogClose asChild>
          <Button variant="outline">Cancel</Button>
        </DialogClose>
        <Button
          type="submit"
          form="create-proctor-form"
          disabled={submitting}
          className="min-w-[130px]"
        >
          <Layers className="size-4 mr-1.5" />
          {submitting ? "Adding..." : "Add proctor"}
        </Button>
      </div>
    </DialogContent>
  );
}
