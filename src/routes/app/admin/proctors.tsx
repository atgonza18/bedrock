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
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogEyebrow,
  DialogFooter,
  DialogHeader,
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
    <DialogContent>
      <DialogHeader>
        <DialogEyebrow>New proctor</DialogEyebrow>
        <DialogTitle>Add a proctor curve</DialogTitle>
        <DialogDescription>
          Lab-determined density and moisture for a soil type.
        </DialogDescription>
      </DialogHeader>

      <form
        id="create-proctor-form"
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
        <DialogBody className="space-y-4">
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
        </DialogBody>

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="ghost">Cancel</Button>
          </DialogClose>
          <Button
            type="submit"
            disabled={submitting}
            className="min-w-[130px]"
          >
            <Layers className="size-4 mr-1.5" />
            {submitting ? "Adding..." : "Add proctor"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
