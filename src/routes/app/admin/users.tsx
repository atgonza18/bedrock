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
import { Plus, X, Mail, ShieldCheck, RotateCcw } from "lucide-react";
import type { Id } from "../../../../convex/_generated/dataModel";
import { cn } from "@/lib/utils";

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
                <TableHead>Permissions</TableHead>
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
                          <SelectTrigger
                            className={cn(
                              "h-8 w-[116px] rounded-sm border-transparent bg-transparent px-2.5 text-xs font-medium capitalize shadow-none",
                              "hover:bg-muted/60 hover:border-border/60",
                              "dark:bg-transparent dark:hover:bg-muted/40 dark:hover:border-border/50",
                              "focus-visible:border-ring focus-visible:bg-background",
                              "data-[state=open]:bg-muted/70 data-[state=open]:border-border dark:data-[state=open]:bg-muted/50",
                              "[&_svg]:text-muted-foreground/60",
                            )}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="min-w-[var(--radix-select-trigger-width)] rounded-sm">
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="pm">PM</SelectItem>
                            <SelectItem value="tech">Tech</SelectItem>
                            <SelectItem value="client">Client</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </TableCell>
                    <TableCell>
                      <PermissionsCell
                        membership={m.membership}
                        isSelf={isSelf}
                      />
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
  const clients = useQuery(api.clients.list);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>("tech");
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  return (
    <DialogContent>
      <DialogHeader>
        <DialogEyebrow>Invitation</DialogEyebrow>
        <DialogTitle>Invite a team member</DialogTitle>
        <DialogDescription>
          They'll be able to join by signing up with this email.
        </DialogDescription>
      </DialogHeader>

      <form
        id="invite-member-form"
        onSubmit={(e) => {
          e.preventDefault();
          setSubmitting(true);
          void create({
            fullName,
            email,
            role: selectedRole as "admin" | "pm" | "tech" | "client",
            clientId: selectedRole === "client" && selectedClientId ? selectedClientId as any : undefined,
          })
            .then(() => onSuccess())
            .finally(() => setSubmitting(false));
        }}
      >
        <DialogBody className="space-y-4">
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
            <Select value={selectedRole} onValueChange={(v) => { setSelectedRole(v); if (v !== "client") setSelectedClientId(""); }}>
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
          {selectedRole === "client" && (
            <div className="space-y-2">
              <Label>Client company</Label>
              <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select company..." />
                </SelectTrigger>
                <SelectContent>
                  {clients?.map((c) => (
                    <SelectItem key={c._id} value={c._id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                This links the user to the right projects and reports.
              </p>
            </div>
          )}
        </DialogBody>

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="ghost">Cancel</Button>
          </DialogClose>
          <Button
            type="submit"
            disabled={submitting}
            className="min-w-[140px]"
          >
            <Mail className="size-4 mr-1.5" />
            {submitting ? "Sending..." : "Send invitation"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

// ─── Per-user permission overrides ─────────────────────────────────────────

type PermissionKey =
  | "canViewAllProjects"
  | "canManageTeam"
  | "canViewAllocation"
  | "canApproveReports";

const PERMISSION_META: {
  key: PermissionKey;
  label: string;
  hint: string;
}[] = [
  {
    key: "canViewAllProjects",
    label: "See all projects",
    hint: "View every project in the org, not just ones they're assigned to.",
  },
  {
    key: "canManageTeam",
    label: "Manage project team",
    hint: "Add and remove techs / PMs from any project they can see.",
  },
  {
    key: "canViewAllocation",
    label: "View allocation page",
    hint: "Access the org-wide Allocation roster and reassign people.",
  },
  {
    key: "canApproveReports",
    label: "Approve / reject reports",
    hint: "Access the Review Queue and approve or reject submitted reports.",
  },
];

type MembershipDoc = {
  _id: Id<"orgMemberships">;
  role: "admin" | "pm" | "tech" | "client";
  canViewAllProjects?: boolean;
  canManageTeam?: boolean;
  canViewAllocation?: boolean;
  canApproveReports?: boolean;
};

/** Mirror of permits() in convex/lib/auth.ts, for admin UI previews. */
function effectivePermit(m: MembershipDoc, key: PermissionKey): boolean {
  if (m.role === "admin") return true;
  if (m.role === "client") return false;
  const explicit = m[key];
  if (explicit === true) return true;
  if (explicit === false) return false;
  if (key === "canApproveReports" && m.role === "pm") return true;
  return false;
}

function PermissionsCell({
  membership,
  isSelf,
}: {
  membership: MembershipDoc;
  isSelf: boolean;
}) {
  const [open, setOpen] = useState(false);

  if (membership.role === "admin") {
    return (
      <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
        <ShieldCheck className="size-3.5" />
        Full access
      </span>
    );
  }
  if (membership.role === "client") {
    return <span className="text-xs text-muted-foreground">—</span>;
  }
  if (isSelf) {
    return <span className="text-xs text-muted-foreground italic">(cannot edit own)</span>;
  }

  const explicitCount = PERMISSION_META.filter(
    (p) => membership[p.key] !== undefined,
  ).length;
  const grantedCount = PERMISSION_META.filter((p) =>
    effectivePermit(membership, p.key),
  ).length;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        variant="outline"
        size="sm"
        className="h-7 text-xs"
        onClick={() => setOpen(true)}
      >
        {grantedCount === 0
          ? "Default"
          : `${grantedCount} granted${explicitCount > 0 ? " · custom" : ""}`}
      </Button>
      {open && (
        <EditPermissionsDialogContent
          membership={membership}
          onClose={() => setOpen(false)}
        />
      )}
    </Dialog>
  );
}

function EditPermissionsDialogContent({
  membership,
  onClose,
}: {
  membership: MembershipDoc;
  onClose: () => void;
}) {
  const updatePerms = useMutation(api.users.updateMemberPermissions);
  const [local, setLocal] = useState<
    Partial<Record<PermissionKey, boolean | null>>
  >(() => ({
    canViewAllProjects: membership.canViewAllProjects,
    canManageTeam: membership.canManageTeam,
    canViewAllocation: membership.canViewAllocation,
    canApproveReports: membership.canApproveReports,
  }));
  const [saving, setSaving] = useState(false);

  // The effective value — what permits() will actually return after save.
  const previewMembership: MembershipDoc = {
    ...membership,
    canViewAllProjects:
      local.canViewAllProjects === null
        ? undefined
        : local.canViewAllProjects ?? membership.canViewAllProjects,
    canManageTeam:
      local.canManageTeam === null
        ? undefined
        : local.canManageTeam ?? membership.canManageTeam,
    canViewAllocation:
      local.canViewAllocation === null
        ? undefined
        : local.canViewAllocation ?? membership.canViewAllocation,
    canApproveReports:
      local.canApproveReports === null
        ? undefined
        : local.canApproveReports ?? membership.canApproveReports,
  };

  const toggle = (key: PermissionKey) => {
    const currentEffective = effectivePermit(previewMembership, key);
    // Setting explicit opposite of effective.
    setLocal((s) => ({ ...s, [key]: !currentEffective }));
  };

  const reset = (key: PermissionKey) => {
    setLocal((s) => ({ ...s, [key]: null }));
  };

  const resetAll = () => {
    setLocal({
      canViewAllProjects: null,
      canManageTeam: null,
      canViewAllocation: null,
      canApproveReports: null,
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      await updatePerms({
        membershipId: membership._id,
        canViewAllProjects: local.canViewAllProjects,
        canManageTeam: local.canManageTeam,
        canViewAllocation: local.canViewAllocation,
        canApproveReports: local.canApproveReports,
      });
      toast.success("Permissions updated.");
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <DialogContent className="sm:max-w-lg">
      <DialogHeader>
        <DialogEyebrow>Per-user permissions</DialogEyebrow>
        <DialogTitle>Edit permissions</DialogTitle>
        <DialogDescription>
          Toggle individual permissions for this{" "}
          <span className="font-medium">
            {membership.role === "pm" ? "PM" : membership.role}
          </span>
          . Changes take effect immediately.
        </DialogDescription>
      </DialogHeader>
      <DialogBody className="space-y-3">
        {PERMISSION_META.map((p) => {
          const explicit = local[p.key];
          const isExplicit = explicit !== undefined && explicit !== null;
          const effective = effectivePermit(previewMembership, p.key);
          return (
            <div
              key={p.key}
              className="flex items-start justify-between gap-4 rounded-md border p-3"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">{p.label}</p>
                  {isExplicit && (
                    <Badge
                      variant="outline"
                      className="text-[10px] uppercase tracking-wide"
                    >
                      Custom
                    </Badge>
                  )}
                  {!isExplicit && (
                    <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      Role default
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">{p.hint}</p>
                {isExplicit && (
                  <button
                    type="button"
                    className="mt-1 inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
                    onClick={() => reset(p.key)}
                  >
                    <RotateCcw className="size-3" />
                    Reset to role default
                  </button>
                )}
              </div>
              <SwitchToggle
                checked={effective}
                onClick={() => toggle(p.key)}
                label={p.label}
              />
            </div>
          );
        })}
      </DialogBody>
      <DialogFooter>
        <Button type="button" variant="ghost" onClick={resetAll}>
          <RotateCcw className="size-3.5 mr-1" />
          Reset all
        </Button>
        <DialogClose asChild>
          <Button type="button" variant="ghost">
            Cancel
          </Button>
        </DialogClose>
        <Button
          type="button"
          onClick={() => void save()}
          disabled={saving}
          className="min-w-[100px]"
        >
          {saving ? "Saving…" : "Save"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

function SwitchToggle({
  checked,
  onClick,
  label,
}: {
  checked: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onClick}
      className={cn(
        "peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border border-transparent px-0.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "bg-amber-brand" : "bg-input",
      )}
    >
      <span
        className={cn(
          "pointer-events-none block size-4 rounded-full bg-background shadow-sm ring-0 transition-transform",
          checked ? "translate-x-5" : "translate-x-0",
        )}
      />
    </button>
  );
}
