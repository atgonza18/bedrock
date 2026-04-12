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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Plus, FolderPlus, XIcon } from "lucide-react";

export const Route = createFileRoute("/app/admin/projects")({
  component: AdminProjectsPage,
});

function AdminProjectsPage() {
  const projects = useQuery(api.projects.list);
  const clients = useQuery(api.clients.list);
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle>Projects</CardTitle>
          <CardDescription>
            Jobs linked to client companies.
          </CardDescription>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button
              size="sm"
              disabled={!clients || clients.length === 0}
              title={
                clients && clients.length === 0
                  ? "Add a client first"
                  : undefined
              }
            >
              <Plus className="h-4 w-4 mr-1" />
              New project
            </Button>
          </DialogTrigger>
          {clients && clients.length > 0 && (
            <CreateProjectDialog
              clients={clients}
              onSuccess={() => setCreateOpen(false)}
            />
          )}
        </Dialog>
      </CardHeader>
      <CardContent>
        {projects === undefined ? (
          <Skeleton className="h-24 w-full" />
        ) : projects.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No projects yet. Add a client first, then create a project.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Job #</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projects.map((p) => (
                <TableRow key={p._id}>
                  <TableCell className="font-mono text-sm">
                    {p.jobNumber}
                  </TableCell>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {[p.city, p.state].filter(Boolean).join(", ") || "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{p.status}</Badge>
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

function CreateProjectDialog({
  clients,
  onSuccess,
}: {
  clients: NonNullable<ReturnType<typeof useQuery<typeof api.clients.list>>>;
  onSuccess: () => void;
}) {
  const create = useMutation(api.projects.create);
  const [clientId, setClientId] = useState<string>("");
  const [name, setName] = useState("");
  const [jobNumber, setJobNumber] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [submitting, setSubmitting] = useState(false);

  return (
    <DialogContent className="sm:max-w-lg gap-0 p-0 overflow-hidden" showCloseButton={false}>
      {/* Accent header */}
      <div className="bg-gradient-to-b from-violet-50 to-transparent dark:from-violet-950/40 dark:to-transparent px-5 pt-5 pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="size-9 rounded-lg bg-violet-100 dark:bg-violet-900/50 flex items-center justify-center shrink-0 mt-0.5">
              <FolderPlus className="size-4 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold">Create a project</DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Link a new job to a client company.
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
        id="create-project-form"
        className="px-5 py-4 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          setSubmitting(true);
          void create({
            clientId: clientId as Id<"clients">,
            name,
            jobNumber,
            address: address || undefined,
            city: city || undefined,
            state: state || undefined,
          })
            .then(() => onSuccess())
            .finally(() => setSubmitting(false));
        }}
      >
        <div className="space-y-2">
          <Label>Client</Label>
          <Select value={clientId} onValueChange={setClientId}>
            <SelectTrigger>
              <SelectValue placeholder="Select a client..." />
            </SelectTrigger>
            <SelectContent>
              {clients.map((c) => (
                <SelectItem key={c._id} value={c._id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Project name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label>Job number</Label>
            <Input
              value={jobNumber}
              onChange={(e) => setJobNumber(e.target.value)}
              placeholder="B&E-2026-0042"
              required
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label>
            Address
            <span className="text-muted-foreground font-normal ml-1.5">Optional</span>
          </Label>
          <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="123 Main St" />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2 space-y-2">
            <Label>City</Label>
            <Input value={city} onChange={(e) => setCity(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>State</Label>
            <Input
              value={state}
              onChange={(e) => setState(e.target.value)}
              placeholder="AL"
              maxLength={2}
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
          form="create-project-form"
          disabled={submitting || !clientId}
          className="min-w-[130px]"
        >
          <FolderPlus className="size-4 mr-1.5" />
          {submitting ? "Creating..." : "Create project"}
        </Button>
      </div>
    </DialogContent>
  );
}
