import { Navigate, Outlet, createFileRoute } from "@tanstack/react-router";
import { Authenticated, AuthLoading, Unauthenticated } from "convex/react";
import { Skeleton } from "@/components/ui/skeleton";
import { AppShell } from "@/components/layout/AppShell";
import { OnboardingGate } from "@/features/auth/OnboardingGate";

export const Route = createFileRoute("/app")({
  component: AppLayout,
});

function AppLayout() {
  return (
    <>
      <AuthLoading>
        <FullPageSkeleton />
      </AuthLoading>
      <Unauthenticated>
        <Navigate to="/sign-in" replace />
      </Unauthenticated>
      <Authenticated>
        <AppShell>
          <OnboardingGate>
            <Outlet />
          </OnboardingGate>
        </AppShell>
      </Authenticated>
    </>
  );
}

function FullPageSkeleton() {
  return (
    <div className="min-h-screen p-6 max-w-6xl mx-auto space-y-4">
      <Skeleton className="h-10 w-48" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-32 w-full" />
    </div>
  );
}
