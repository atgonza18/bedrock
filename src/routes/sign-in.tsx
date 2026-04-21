import { Navigate, createFileRoute } from "@tanstack/react-router";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { Skeleton } from "@/components/ui/skeleton";
import { SignInForm } from "@/features/auth/SignInForm";
import { FlaskConical, ClipboardCheck, Send } from "lucide-react";
import { BedrockMark } from "@/components/logo";
import { BedrockLogo } from "@/components/logo";

export const Route = createFileRoute("/sign-in")({
  component: SignInPage,
});

function SignInPage() {
  return (
    <main className="min-h-screen flex relative overflow-hidden">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-[45%] relative bg-primary overflow-hidden">
        {/* Topo pattern overlay */}
        <div className="absolute inset-0 bg-topo opacity-30" />
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/90 to-amber-brand/20" />

        <div className="relative z-10 flex flex-col justify-between p-10 xl:p-14 text-primary-foreground w-full">
          {/* Logo */}
          <div className="inline-flex items-center gap-2.5" aria-label="Bedrock">
            <span className="flex items-center justify-center size-9 rounded-md bg-primary-foreground text-primary">
              <BedrockMark className="size-4" aria-hidden />
            </span>
            <span className="font-heading text-lg font-bold tracking-tight">
              Bedrock
            </span>
          </div>

          {/* Copy */}
          <div className="space-y-6 max-w-md">
            <h2 className="font-heading text-3xl xl:text-4xl font-bold leading-tight">
              From the field to the client, in one flow.
            </h2>
            <p className="text-primary-foreground/70 text-base leading-relaxed">
              Concrete, density, DCP, proof roll, and pile load reports — drafted
              on-site, reviewed by PMs, delivered to clients automatically.
            </p>

            {/* Feature highlights */}
            <div className="flex flex-col gap-3 pt-2">
              {[
                { icon: FlaskConical, text: "5 test types, purpose-built" },
                { icon: ClipboardCheck, text: "PM review & digital signatures" },
                { icon: Send, text: "Auto-deliver PDF to clients" },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-3 text-sm text-primary-foreground/60">
                  <div className="size-7 rounded-md bg-white/10 flex items-center justify-center shrink-0">
                    <Icon className="size-3.5" />
                  </div>
                  {text}
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <p className="text-sm text-primary-foreground/40">
            Building &amp; Earth Sciences
          </p>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-topo relative">
        <div className="absolute inset-0 bg-gradient-to-b from-amber-brand/[0.03] via-transparent to-transparent pointer-events-none lg:hidden" />

        <div className="relative w-full max-w-sm space-y-8">
          {/* Mobile logo */}
          <div className="flex justify-center lg:hidden">
            <BedrockLogo variant="dark" size="lg" />
          </div>

          {/* Form card */}
          <div className="rounded-xl border bg-card/80 backdrop-blur-sm p-6 space-y-6 shadow-sm">
            {/* Form header */}
            <div className="text-center space-y-1.5">
              <h1 className="font-heading text-xl font-bold tracking-tight">
                Welcome back
              </h1>
              <p className="text-sm text-muted-foreground">
                Sign in to your account to continue.
              </p>
            </div>

            {/* Auth states */}
            <AuthLoading>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-12" />
                  <Skeleton className="h-10 w-full" />
                </div>
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-10 w-full" />
                </div>
                <Skeleton className="h-10 w-full" />
              </div>
            </AuthLoading>
            <Authenticated>
              <Navigate to="/app" replace />
            </Authenticated>
            <Unauthenticated>
              <SignInForm />
            </Unauthenticated>
          </div>

          {/* Mobile footer */}
          <p className="text-center text-xs text-muted-foreground lg:hidden">
            Building &amp; Earth Sciences
          </p>
        </div>
      </div>
    </main>
  );
}
