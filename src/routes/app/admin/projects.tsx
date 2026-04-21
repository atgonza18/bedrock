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
import { Plus, FolderPlus } from "lucide-react";

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
    <DialogContent className="sm:max-w-lg">
      <DialogHeader>
        <DialogEyebrow>New project</DialogEyebrow>
        <DialogTitle>Create a project</DialogTitle>
        <DialogDescription>
          Link a new job to a client company.
        </DialogDescription>
      </DialogHeader>

      <form
        id="create-project-form"
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
        <DialogBody className="space-y-4">
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
        </DialogBody>

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="ghost">Cancel</Button>
          </DialogClose>
          <Button
            type="submit"
            disabled={submitting || !clientId}
            className="min-w-[130px]"
          >
            <FolderPlus className="size-4 mr-1.5" />
            {submitting ? "Creating..." : "Create project"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
