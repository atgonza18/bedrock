import { ReactNode, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useCurrentMember } from "./useCurrentMember";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock } from "lucide-react";

/**
 * Wraps the authenticated app shell. If the user's `me` state is
 * `no_profile` or `no_org`, we show onboarding UI instead of children.
 */
export function OnboardingGate({ children }: { children: ReactNode }) {
  const me = useCurrentMember();

  if (me === undefined) {
    return <Loading />;
  }

  if (me.state === "ok") {
    return <>{children}</>;
  }

  // Both no_profile and no_org land here — the user needs onboarding.
  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center px-4 bg-topo">
      <OnboardingCard />
    </div>
  );
}

function OnboardingCard() {
  const hasAnyOrg = useQuery(api.onboarding.hasAnyOrg);
  const pendingInvite = useQuery(api.onboarding.getPendingInvitation);

  if (hasAnyOrg === undefined || pendingInvite === undefined) {
    return <Loading />;
  }

  // Case 1: no orgs exist → bootstrap
  if (!hasAnyOrg) {
    return <BootstrapForm />;
  }

  // Case 2: pending invitation → claim it
  if (pendingInvite.kind === "pending") {
    return <ClaimInviteCard invitation={pendingInvite} />;
  }

  // Case 3: org exists but no invite → waiting room
  return (
    <Card className="w-full max-w-md shadow-sm">
      <CardHeader className="text-center space-y-3">
        <div className="size-12 rounded-full bg-amber-brand/10 flex items-center justify-center mx-auto">
          <Clock className="size-6 text-amber-brand" />
        </div>
        <CardTitle className="font-heading">Waiting for an invitation</CardTitle>
        <CardDescription>
          An admin needs to send you an invitation before you can access
          Bedrock. Ask your team lead to add your email in the admin panel.
        </CardDescription>
      </CardHeader>
    </Card>
  );
}

function BootstrapForm() {
  const createFirstOrg = useMutation(api.onboarding.createFirstOrg);
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  return (
    <Card className="w-full max-w-md shadow-sm">
      <CardHeader className="text-center">
        <CardTitle className="font-heading">Set up your organization</CardTitle>
        <CardDescription>
          You&rsquo;re the first user. Create your organization to get started.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            setSubmitting(true);
            const slug = name
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "-")
              .replace(/^-|-$/g, "");
            void createFirstOrg({
              orgName: name,
              orgSlug: slug || "my-org",
              orgDisplayName: name,
              adminFullName: name, // placeholder — profile edit comes later
            }).finally(() => setSubmitting(false));
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="org-name">Organization name</Label>
            <Input
              id="org-name"
              placeholder="Building & Earth Sciences"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={submitting || !name.trim()}>
            {submitting ? "Creating..." : "Create organization"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function ClaimInviteCard({
  invitation,
}: {
  invitation: Extract<
    Awaited<ReturnType<typeof api.onboarding.getPendingInvitation._returnType>>,
    { kind: "pending" }
  >;
}) {
  const claimInvitation = useMutation(api.onboarding.claimInvitation);
  const [submitting, setSubmitting] = useState(false);

  return (
    <Card className="w-full max-w-md shadow-sm">
      <CardHeader className="text-center">
        <CardTitle className="font-heading">You&rsquo;ve been invited!</CardTitle>
        <CardDescription>
          {invitation.org?.displayName ?? "An organization"} has invited you as{" "}
          <span className="font-medium">{invitation.invitation.role}</span>.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          className="w-full"
          disabled={submitting}
          onClick={() => {
            setSubmitting(true);
            void claimInvitation({}).finally(() => setSubmitting(false));
          }}
        >
          {submitting ? "Joining..." : "Accept invitation"}
        </Button>
      </CardContent>
    </Card>
  );
}

function Loading() {
  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center bg-topo">
      <div className="space-y-3 w-80">
        <Skeleton className="h-8 w-48 mx-auto" />
        <Skeleton className="h-32 w-full" />
      </div>
    </div>
  );
}
