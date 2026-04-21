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
import { Plus, ChevronRight, Building2, UserPlus, XIcon } from "lucide-react";

export const Route = createFileRoute("/app/admin/clients")({
  component: AdminClientsPage,
});

function AdminClientsPage() {
  const clients = useQuery(api.clients.list);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] =
    useState<Id<"clients"> | null>(null);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between">
          <div>
            <CardTitle>Clients</CardTitle>
            <CardDescription>
              EPC / GC companies you work with.
            </CardDescription>
          </div>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Add client
              </Button>
            </DialogTrigger>
            <CreateClientDialog onSuccess={() => setCreateOpen(false)} />
          </Dialog>
        </CardHeader>
        <CardContent>
          {clients === undefined ? (
            <Skeleton className="h-24 w-full" />
          ) : clients.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No clients yet. Add your first EPC or GC.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.map((c) => (
                  <TableRow
                    key={c._id}
                    className="cursor-pointer group"
                    onClick={() => setSelectedClientId(c._id)}
                  >
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell className="text-muted-foreground truncate max-w-xs">
                      {c.notes ?? "—"}
                    </TableCell>
                    <TableCell>
                      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform duration-150" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {selectedClientId && (
        <ContactsCard
          clientId={selectedClientId}
          onClose={() => setSelectedClientId(null)}
        />
      )}
    </div>
  );
}

function CreateClientDialog({ onSuccess }: { onSuccess: () => void }) {
  const create = useMutation(api.clients.create);
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  return (
    <DialogContent>
      <DialogHeader>
        <DialogEyebrow>New client</DialogEyebrow>
        <DialogTitle>Add a client</DialogTitle>
        <DialogDescription>
          Add an EPC or GC company you work with.
        </DialogDescription>
      </DialogHeader>

      <form
        id="create-client-form"
        onSubmit={(e) => {
          e.preventDefault();
          setSubmitting(true);
          void create({ name, notes: notes || undefined })
            .then(() => {
              setName("");
              setNotes("");
              onSuccess();
            })
            .finally(() => setSubmitting(false));
        }}
      >
        <DialogBody className="space-y-4">
          <div className="space-y-2">
            <Label>Company name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Turner Construction"
              required
            />
          </div>
          <div className="space-y-2">
            <Label>
              Notes
              <span className="text-muted-foreground font-normal ml-1.5">Optional</span>
            </Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Internal notes about this client..."
              rows={2}
              className="resize-none"
            />
          </div>
        </DialogBody>

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="ghost">Cancel</Button>
          </DialogClose>
          <Button
            type="submit"
            disabled={submitting}
            className="min-w-[110px]"
          >
            <Building2 className="size-4 mr-1.5" />
            {submitting ? "Adding..." : "Add client"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

function ContactsCard({
  clientId,
  onClose,
}: {
  clientId: Id<"clients">;
  onClose: () => void;
}) {
  const client = useQuery(api.clients.getById, { clientId });
  const contacts = useQuery(api.clients.listContacts, { clientId });
  const createContact = useMutation(api.clients.createContact);
  const removeContact = useMutation(api.clients.removeContact);
  const [addOpen, setAddOpen] = useState(false);
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactTitle, setContactTitle] = useState("");
  const [contactSubmitting, setContactSubmitting] = useState(false);

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle>{client?.name ?? "..."} &mdash; Contacts</CardTitle>
          <CardDescription>
            People at this company who receive reports.
          </CardDescription>
        </div>
        <div className="flex gap-2">
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                <Plus className="h-4 w-4 mr-1" />
                Contact
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogEyebrow>New contact</DialogEyebrow>
                <DialogTitle>Add a contact</DialogTitle>
                <DialogDescription>
                  Someone at {client?.name ?? "this company"} who receives reports.
                </DialogDescription>
              </DialogHeader>

              <form
                id="add-contact-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  setContactSubmitting(true);
                  void createContact({
                    clientId,
                    fullName: contactName,
                    email: contactEmail,
                    phone: contactPhone || undefined,
                    title: contactTitle || undefined,
                  }).then(() => {
                    setContactName("");
                    setContactEmail("");
                    setContactPhone("");
                    setContactTitle("");
                    setAddOpen(false);
                  }).finally(() => setContactSubmitting(false));
                }}
              >
                <DialogBody className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2 space-y-2">
                      <Label>Full name</Label>
                      <Input value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="Jane Smith" required />
                    </div>
                    <div className="col-span-2 space-y-2">
                      <Label>Email</Label>
                      <Input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="jane@company.com" required />
                    </div>
                    <div className="space-y-2">
                      <Label>
                        Phone
                        <span className="text-muted-foreground font-normal ml-1.5">Optional</span>
                      </Label>
                      <Input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="(555) 123-4567" />
                    </div>
                    <div className="space-y-2">
                      <Label>
                        Title
                        <span className="text-muted-foreground font-normal ml-1.5">Optional</span>
                      </Label>
                      <Input value={contactTitle} onChange={(e) => setContactTitle(e.target.value)} placeholder="Project Manager" />
                    </div>
                  </div>
                </DialogBody>

                <DialogFooter>
                  <DialogClose asChild>
                    <Button type="button" variant="ghost">Cancel</Button>
                  </DialogClose>
                  <Button
                    type="submit"
                    disabled={contactSubmitting}
                    className="min-w-[120px]"
                  >
                    <UserPlus className="size-4 mr-1.5" />
                    {contactSubmitting ? "Adding..." : "Add contact"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
          <Button size="sm" variant="ghost" onClick={onClose} title="Close">
            <XIcon className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {contacts === undefined ? (
          <Skeleton className="h-16 w-full" />
        ) : contacts.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No contacts yet. Add the people who should receive reports.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Title</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {contacts.map((c) => (
                <TableRow key={c._id}>
                  <TableCell>{c.fullName}</TableCell>
                  <TableCell className="text-muted-foreground">{c.email}</TableCell>
                  <TableCell className="text-muted-foreground">{c.title ?? "—"}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => void removeContact({ contactId: c._id })}
                      title="Remove contact"
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
