import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { createFileRoute } from "@tanstack/react-router";
import { api } from "../../../../convex/_generated/api";
import { Badge } from "@/components/ui/badge";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Wrench, XIcon } from "lucide-react";

export const Route = createFileRoute("/app/admin/equipment")({
  component: AdminEquipmentPage,
});

const EQUIPMENT_TYPE_LABELS: Record<string, string> = {
  nuclear_gauge: "Nuclear Gauge",
  air_meter: "Air Meter",
  compression_machine: "Compression Machine",
  dcp: "DCP",
  other: "Other",
};

const STATUS_LABELS: Record<string, string> = {
  active: "Active",
  out_of_service: "Out of Service",
  retired: "Retired",
};

function formatDate(ts: number | undefined): string {
  if (!ts) return "—";
  return new Date(ts).toLocaleDateString();
}

function isOverdue(ts: number | undefined): boolean {
  if (!ts) return false;
  return ts < Date.now();
}

function AdminEquipmentPage() {
  const equipment = useQuery(api.equipment.list);
  const removeEquipment = useMutation(api.equipment.remove);
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle>Equipment Register</CardTitle>
          <CardDescription>
            Track gauges, meters, and testing equipment.
          </CardDescription>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Add Equipment
            </Button>
          </DialogTrigger>
          <CreateEquipmentDialog onSuccess={() => setCreateOpen(false)} />
        </Dialog>
      </CardHeader>
      <CardContent>
        {equipment === undefined ? (
          <Skeleton className="h-24 w-full" />
        ) : equipment.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No equipment yet. Add your first piece of testing equipment.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Serial #</TableHead>
                <TableHead>Calibration Due</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {equipment.map((eq) => (
                <TableRow key={eq._id}>
                  <TableCell className="font-medium">{eq.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {EQUIPMENT_TYPE_LABELS[eq.type] ?? eq.type}
                  </TableCell>
                  <TableCell className="text-muted-foreground font-mono text-sm">
                    {eq.serialNumber ?? "—"}
                  </TableCell>
                  <TableCell>
                    <span
                      className={
                        isOverdue(eq.calibrationDueDate)
                          ? "text-red-600 dark:text-red-400 font-medium"
                          : "text-muted-foreground"
                      }
                    >
                      {formatDate(eq.calibrationDueDate)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        eq.status === "active"
                          ? "default"
                          : eq.status === "out_of_service"
                            ? "destructive"
                            : "secondary"
                      }
                    >
                      {STATUS_LABELS[eq.status] ?? eq.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        void removeEquipment({ equipmentId: eq._id })
                      }
                      title="Remove equipment"
                    >
                      <XIcon className="h-4 w-4" />
                      <span className="sr-only">Remove</span>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function CreateEquipmentDialog({ onSuccess }: { onSuccess: () => void }) {
  const create = useMutation(api.equipment.create);
  const [name, setName] = useState("");
  const [type, setType] = useState<string>("other");
  const [model, setModel] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [manufacturer, setManufacturer] = useState("");
  const [calibrationDueDate, setCalibrationDueDate] = useState("");
  const [nrcLicenseNumber, setNrcLicenseNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  return (
    <DialogContent
      className="sm:max-w-md gap-0 p-0 overflow-hidden"
      showCloseButton={false}
    >
      {/* Accent header */}
      <div className="bg-gradient-to-b from-sky-50 to-transparent dark:from-sky-950/40 dark:to-transparent px-5 pt-5 pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="size-9 rounded-lg bg-sky-100 dark:bg-sky-900/50 flex items-center justify-center shrink-0 mt-0.5">
              <Wrench className="size-4 text-sky-600 dark:text-sky-400" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold">
                Add equipment
              </DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Register a gauge, meter, or other testing equipment.
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
      <form
        id="create-equipment-form"
        className="px-5 py-4 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          setSubmitting(true);
          void create({
            name,
            type: type as
              | "nuclear_gauge"
              | "air_meter"
              | "compression_machine"
              | "dcp"
              | "other",
            model: model || undefined,
            serialNumber: serialNumber || undefined,
            manufacturer: manufacturer || undefined,
            calibrationDueDate: calibrationDueDate
              ? new Date(calibrationDueDate).getTime()
              : undefined,
            nrcLicenseNumber:
              type === "nuclear_gauge" && nrcLicenseNumber
                ? nrcLicenseNumber
                : undefined,
            notes: notes || undefined,
          })
            .then(() => {
              setName("");
              setType("other");
              setModel("");
              setSerialNumber("");
              setManufacturer("");
              setCalibrationDueDate("");
              setNrcLicenseNumber("");
              setNotes("");
              onSuccess();
            })
            .finally(() => setSubmitting(false));
        }}
      >
        <div className="space-y-2">
          <Label>Name</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Troxler 3440"
            required
          />
        </div>
        <div className="space-y-2">
          <Label>Type</Label>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="nuclear_gauge">Nuclear Gauge</SelectItem>
              <SelectItem value="air_meter">Air Meter</SelectItem>
              <SelectItem value="compression_machine">
                Compression Machine
              </SelectItem>
              <SelectItem value="dcp">DCP</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>
              Model
              <span className="text-muted-foreground font-normal ml-1.5">
                Optional
              </span>
            </Label>
            <Input
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="e.g. 3440 Plus"
            />
          </div>
          <div className="space-y-2">
            <Label>
              Serial #
              <span className="text-muted-foreground font-normal ml-1.5">
                Optional
              </span>
            </Label>
            <Input
              value={serialNumber}
              onChange={(e) => setSerialNumber(e.target.value)}
              placeholder="e.g. SN-12345"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label>
            Manufacturer
            <span className="text-muted-foreground font-normal ml-1.5">
              Optional
            </span>
          </Label>
          <Input
            value={manufacturer}
            onChange={(e) => setManufacturer(e.target.value)}
            placeholder="e.g. Troxler Electronic Labs"
          />
        </div>
        <div className="space-y-2">
          <Label>
            Calibration due date
            <span className="text-muted-foreground font-normal ml-1.5">
              Optional
            </span>
          </Label>
          <Input
            type="date"
            value={calibrationDueDate}
            onChange={(e) => setCalibrationDueDate(e.target.value)}
          />
        </div>
        {type === "nuclear_gauge" && (
          <div className="space-y-2">
            <Label>
              NRC License #
              <span className="text-muted-foreground font-normal ml-1.5">
                Optional
              </span>
            </Label>
            <Input
              value={nrcLicenseNumber}
              onChange={(e) => setNrcLicenseNumber(e.target.value)}
              placeholder="e.g. 37-XXXXX-XX"
            />
          </div>
        )}
        <div className="space-y-2">
          <Label>
            Notes
            <span className="text-muted-foreground font-normal ml-1.5">
              Optional
            </span>
          </Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Internal notes about this equipment..."
            rows={2}
            className="resize-none"
          />
        </div>
      </form>

      {/* Footer */}
      <div className="border-t bg-muted/40 px-5 py-3.5 flex items-center justify-end gap-2.5">
        <DialogClose asChild>
          <Button variant="outline">Cancel</Button>
        </DialogClose>
        <Button
          type="submit"
          form="create-equipment-form"
          disabled={submitting}
          className="min-w-[140px]"
        >
          <Wrench className="size-4 mr-1.5" />
          {submitting ? "Adding..." : "Add equipment"}
        </Button>
      </div>
    </DialogContent>
  );
}
