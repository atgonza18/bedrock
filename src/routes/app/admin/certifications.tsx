import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { createFileRoute } from "@tanstack/react-router";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
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
import { Plus, Award, XIcon } from "lucide-react";

export const Route = createFileRoute("/app/admin/certifications")({
  component: AdminCertificationsPage,
});

const CERT_TYPE_LABELS: Record<string, string> = {
  aci_concrete_field_1: "ACI Concrete Field Grade I",
  aci_concrete_field_2: "ACI Concrete Field Grade II",
  aci_concrete_strength: "ACI Concrete Strength",
  nuclear_gauge_rso: "Nuclear Gauge RSO",
  nicet_level_1: "NICET Level I",
  nicet_level_2: "NICET Level II",
  nicet_level_3: "NICET Level III",
  nicet_level_4: "NICET Level IV",
  pe_license: "PE License",
  other: "Other",
};

function certLabel(type: string, customLabel?: string): string {
  if (type === "other" && customLabel) return customLabel;
  return CERT_TYPE_LABELS[type] ?? type;
}

function formatDate(ts: number | undefined): string {
  if (!ts) return "—";
  return new Date(ts).toLocaleDateString();
}

function isExpired(ts: number | undefined): boolean {
  if (!ts) return false;
  return ts < Date.now();
}

function AdminCertificationsPage() {
  const certs = useQuery(api.certifications.list, {});
  const removeCert = useMutation(api.certifications.remove);
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle>Technician Certifications</CardTitle>
          <CardDescription>
            Track ACI, NICET, nuclear gauge, and PE certifications.
          </CardDescription>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Add Certification
            </Button>
          </DialogTrigger>
          <CreateCertificationDialog onSuccess={() => setCreateOpen(false)} />
        </Dialog>
      </CardHeader>
      <CardContent>
        {certs === undefined ? (
          <Skeleton className="h-24 w-full" />
        ) : certs.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No certifications yet. Add your first technician certification.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Technician Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Cert #</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {certs.map((cert) => {
                const expired = isExpired(cert.expiresAt);
                return (
                  <TableRow key={cert._id}>
                    <TableCell className="font-medium">
                      {cert.techName}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {certLabel(cert.type, cert.customLabel)}
                    </TableCell>
                    <TableCell className="text-muted-foreground font-mono text-sm">
                      {cert.certificationNumber ?? "—"}
                    </TableCell>
                    <TableCell>
                      <span
                        className={
                          expired
                            ? "text-red-600 dark:text-red-400 font-medium"
                            : "text-muted-foreground"
                        }
                      >
                        {formatDate(cert.expiresAt)}
                      </span>
                    </TableCell>
                    <TableCell>
                      {expired ? (
                        <Badge variant="destructive">Expired</Badge>
                      ) : cert.expiresAt ? (
                        <Badge variant="default">Active</Badge>
                      ) : (
                        <Badge variant="secondary">No expiry</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          void removeCert({ certificationId: cert._id })
                        }
                        title="Remove certification"
                      >
                        <XIcon className="h-4 w-4" />
                        <span className="sr-only">Remove</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function CreateCertificationDialog({ onSuccess }: { onSuccess: () => void }) {
  const create = useMutation(api.certifications.create);
  const members = useQuery(api.users.listOrgMembers);
  const [userId, setUserId] = useState<string>("");
  const [type, setType] = useState<string>("aci_concrete_field_1");
  const [customLabel, setCustomLabel] = useState("");
  const [certificationNumber, setCertificationNumber] = useState("");
  const [issuedAt, setIssuedAt] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  return (
    <DialogContent
      className="sm:max-w-md gap-0 p-0 overflow-hidden"
      showCloseButton={false}
    >
      {/* Accent header */}
      <div className="bg-gradient-to-b from-teal-50 to-transparent dark:from-teal-950/40 dark:to-transparent px-5 pt-5 pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="size-9 rounded-lg bg-teal-100 dark:bg-teal-900/50 flex items-center justify-center shrink-0 mt-0.5">
              <Award className="size-4 text-teal-600 dark:text-teal-400" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold">
                Add a certification
              </DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Record a technician&rsquo;s professional certification.
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
        id="create-certification-form"
        className="px-5 py-4 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!userId) return;
          setSubmitting(true);
          void create({
            userId: userId as Id<"users">,
            type: type as
              | "aci_concrete_field_1"
              | "aci_concrete_field_2"
              | "aci_concrete_strength"
              | "nuclear_gauge_rso"
              | "nicet_level_1"
              | "nicet_level_2"
              | "nicet_level_3"
              | "nicet_level_4"
              | "pe_license"
              | "other",
            customLabel: type === "other" && customLabel ? customLabel : undefined,
            certificationNumber: certificationNumber || undefined,
            issuedAt: issuedAt ? new Date(issuedAt).getTime() : undefined,
            expiresAt: expiresAt ? new Date(expiresAt).getTime() : undefined,
            notes: notes || undefined,
          })
            .then(() => {
              setUserId("");
              setType("aci_concrete_field_1");
              setCustomLabel("");
              setCertificationNumber("");
              setIssuedAt("");
              setExpiresAt("");
              setNotes("");
              onSuccess();
            })
            .finally(() => setSubmitting(false));
        }}
      >
        <div className="space-y-2">
          <Label>Technician</Label>
          <Select value={userId} onValueChange={setUserId}>
            <SelectTrigger>
              <SelectValue placeholder="Select a team member" />
            </SelectTrigger>
            <SelectContent>
              {members?.map((m) => (
                <SelectItem
                  key={m.membership.userId}
                  value={m.membership.userId}
                >
                  {m.profile?.fullName ?? m.email ?? "Unknown"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Type</Label>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(CERT_TYPE_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {type === "other" && (
          <div className="space-y-2">
            <Label>Custom label</Label>
            <Input
              value={customLabel}
              onChange={(e) => setCustomLabel(e.target.value)}
              placeholder="e.g. OSHA 30-Hour"
              required
            />
          </div>
        )}
        <div className="space-y-2">
          <Label>
            Cert #
            <span className="text-muted-foreground font-normal ml-1.5">
              Optional
            </span>
          </Label>
          <Input
            value={certificationNumber}
            onChange={(e) => setCertificationNumber(e.target.value)}
            placeholder="e.g. 01-12345"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>
              Issued date
              <span className="text-muted-foreground font-normal ml-1.5">
                Optional
              </span>
            </Label>
            <Input
              type="date"
              value={issuedAt}
              onChange={(e) => setIssuedAt(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>
              Expiry date
              <span className="text-muted-foreground font-normal ml-1.5">
                Optional
              </span>
            </Label>
            <Input
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
            />
          </div>
        </div>
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
            placeholder="Additional notes..."
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
          form="create-certification-form"
          disabled={submitting || !userId}
          className="min-w-[150px]"
        >
          <Award className="size-4 mr-1.5" />
          {submitting ? "Adding..." : "Add certification"}
        </Button>
      </div>
    </DialogContent>
  );
}
