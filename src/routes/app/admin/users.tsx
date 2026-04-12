import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { createFileRoute } from "@tanstack/react-router";
import { api } from "../../../../convex/_generated/api";
import { useCurrentMember } from "@/features/auth/useCurrentMember";
import { toast } from "sonner";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, X, Mail, XIcon } from "lucide-react";

export const Route = createFileRoute("/app/admin/users")({
  component: AdminUsersPage,
});

function AdminUsersPage() {
  return (
    <div className="space-y-6">
      <MembersSection />
      <InvitationsSection />
    </div>
  );
}

function MembersSection() {
  const me = useCurrentMember();
  const members = useQuery(api.users.listOrgMembers);
  const updateRole = useMutation(api.users.updateMemberRole);

  const currentUserId = me?.state === "ok" ? me.membership.userId : null;

  const handleRoleChange = (membershipId: any, newRole: string) => {
    void updateRole({
      membershipId: membershipId as any,
      role: newRole as "admin" | "pm" | "tech" | "client",
    }).then(() => {
      toast.success("Role updated.");
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Members</CardTitle>
        <CardDescription>Active org members and their roles.</CardDescription>
      </CardHeader>
      <CardContent>
        {members === undefined ? (
          <Skeleton className="h-24 w-full" />
        ) : members.length === 0 ? (
          <p className="text-sm text-muted-foreground">No members yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((m) => {
                const isSelf = m.membership.userId === currentUserId;
                return (
                  <TableRow key={m.membership._id}>
                    <TableCell>
                      {m.profile?.fullName ?? "—"}
                      {isSelf && (
                        <span className="text-xs text-muted-foreground ml-1.5">(you)</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {m.email ?? "—"}
                    </TableCell>
                    <TableCell>
                      {isSelf ? (
                        <Badge variant="outline">{m.membership.role}</Badge>
                      ) : (
                        <Select
                          value={m.membership.role}
                          onValueChange={(v) => handleRoleChange(m.membership._id, v)}
                        >
                          <SelectTrigger className="h-7 w-[110px] text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="pm">PM</SelectItem>
                            <SelectItem value="tech">Tech</SelectItem>
                            <SelectItem value="client">Client</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          m.membership.status === "active"
                            ? "default"
                            : "secondary"
                        }
                      >
                        {m.membership.status}
                      </Badge>
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

function InvitationsSection() {
  const invitations = useQuery(api.invitations.list);
  const revoke = useMutation(api.invitations.revoke);
  const [open, setOpen] = useState(false);

  const pending =
    invitations?.filter((i) => i.status === "pending") ?? [];
  const past =
    invitations?.filter((i) => i.status !== "pending") ?? [];

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle>Invitations</CardTitle>
          <CardDescription>
            Invite people to join your organization.
          </CardDescription>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Invite
            </Button>
          </DialogTrigger>
          <InviteDialogContent onSuccess={() => setOpen(false)} />
        </Dialog>
      </CardHeader>
      <CardContent>
        {invitations === undefined ? (
          <Skeleton className="h-24 w-full" />
        ) : pending.length === 0 && past.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No invitations yet. Click &ldquo;Invite&rdquo; to add someone.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...pending, ...past].map((inv) => (
                <TableRow key={inv._id}>
                  <TableCell>{inv.fullName}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {inv.email}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{inv.role}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        inv.status === "pending"
                          ? "default"
                          : inv.status === "accepted"
                            ? "secondary"
                            : "destructive"
                      }
                    >
                      {inv.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {inv.status === "pending" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Revoke invitation"
                        onClick={() => void revoke({ invitationId: inv._id })}
                      >
                        <X className="h-4 w-4" />
                        <span className="sr-only">Revoke invitation</span>
                      </Button>
                    )}
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

function InviteDialogContent({ onSuccess }: { onSuccess: () => void }) {
  const create = useMutation(api.invitations.create);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>("tech");
  const [submitting, setSubmitting] = useState(false);

  return (
    <DialogContent className="sm:max-w-md gap-0 p-0 overflow-hidden" showCloseButton={false}>
      {/* Accent header */}
      <div className="bg-gradient-to-b from-teal-50 to-transparent dark:from-teal-950/40 dark:to-transparent px-5 pt-5 pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="size-9 rounded-lg bg-teal-100 dark:bg-teal-900/50 flex items-center justify-center shrink-0 mt-0.5">
              <Mail className="size-4 text-teal-600 dark:text-teal-400" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold">Invite a team member</DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">
                They'll be able to join by signing up with this email.
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
        id="invite-member-form"
        className="px-5 py-4 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          setSubmitting(true);
          void create({
            fullName,
            email,
            role: selectedRole as "admin" | "pm" | "tech" | "client",
          })
            .then(() => onSuccess())
            .finally(() => setSubmitting(false));
        }}
      >
        <div className="space-y-2">
          <Label htmlFor="inv-name">Full name</Label>
          <Input
            id="inv-name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Jane Smith"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="inv-email">Email</Label>
          <Input
            id="inv-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="jane@company.com"
            required
          />
        </div>
        <div className="space-y-2">
          <Label>Role</Label>
          <Select value={selectedRole} onValueChange={setSelectedRole}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="tech">Tech</SelectItem>
              <SelectItem value="pm">PM</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="client">Client</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </form>

      {/* Footer */}
      <div className="border-t bg-muted/40 px-5 py-3.5 flex items-center justify-end gap-2.5">
        <DialogClose asChild>
          <Button variant="outline">Cancel</Button>
        </DialogClose>
        <Button
          type="submit"
          form="invite-member-form"
          disabled={submitting}
          className="min-w-[140px]"
        >
          <Mail className="size-4 mr-1.5" />
          {submitting ? "Sending..." : "Send invitation"}
        </Button>
      </div>
    </DialogContent>
  );
}
