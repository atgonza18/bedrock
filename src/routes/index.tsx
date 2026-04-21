import { Link, createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  FlaskConical,
  ClipboardCheck,
  Smartphone,
  ShieldCheck,
  Send,
  Gauge,
  Truck,
  Layers,
  ArrowDownUp,
  Zap,
  Clock,
  FileText,
} from "lucide-react";
import { BedrockLogo, BedrockMark } from "@/components/logo";

export const Route = createFileRoute("/")({
  component: LandingPage,
});

const WORKFLOW_STEPS = [
  {
    number: "01",
    title: "Collect in the field",
    description:
      "Techs fill out purpose-built forms on-site with auto-save. Nothing gets lost — even with spotty signal.",
    icon: Smartphone,
  },
  {
    number: "02",
    title: "Review & approve",
    description:
      "PMs review submissions, request changes if needed, and approve with a digital signature.",
    icon: ShieldCheck,
  },
  {
    number: "03",
    title: "Deliver to client",
    description:
      "Approved reports auto-generate a professional PDF and deliver through a secure client portal.",
    icon: Send,
  },
];

const TEST_TYPES = [
  {
    name: "Concrete Field Test",
    description:
      "Slump, air content, temperatures, unit weight, and cylinder tracking — one form, no paper.",
    icon: FlaskConical,
  },
  {
    name: "Nuclear Density",
    description:
      "Wet density, dry density, and moisture content with multi-point reading support per location.",
    icon: Gauge,
  },
  {
    name: "Proof Roll",
    description:
      "Roller specs, pass counts, and deflection observations for subgrade verification.",
    icon: Truck,
  },
  {
    name: "DCP",
    description:
      "Dynamic Cone Penetrometer data entry — layer by layer — with cumulative blow counts.",
    icon: Layers,
  },
  {
    name: "Pile Load Test",
    description:
      "Axial compression, tension, and lateral load increments with time-settlement records.",
    icon: ArrowDownUp,
  },
];

const FEATURES = [
  {
    icon: Zap,
    title: "Auto-save drafts",
    description:
      "Every field saves automatically. Spotty cell signal won't cost you data.",
  },
  {
    icon: ClipboardCheck,
    title: "PM review queue",
    description:
      "Claim, review, approve, or request changes — all from one queue.",
  },
  {
    icon: FileText,
    title: "PDF generation",
    description:
      "Professional reports generated automatically on approval.",
  },
  {
    icon: Clock,
    title: "Full audit trail",
    description:
      "Every edit, submission, and approval timestamped and tracked.",
  },
];

function LandingPage() {
  return (
    <main className="min-h-screen relative bg-topo">
      {/* Subtle ambient */}
      <div className="absolute inset-0 bg-gradient-to-b from-amber-brand/[0.03] via-transparent to-primary/[0.02] pointer-events-none" />

      <div className="relative z-10 flex flex-col min-h-screen">
        {/* ── Nav ────────────────────────────────────────── */}
        <header className="flex items-center justify-between px-6 sm:px-10 lg:px-16 py-5 max-w-7xl mx-auto w-full">
          <BedrockLogo variant="dark" size="lg" />

          <Button asChild variant="ghost" size="sm">
            <Link to="/sign-in">Sign in</Link>
          </Button>
        </header>

        {/* ── Hero ───────────────────────────────────────── */}
        <section className="px-6 sm:px-10 lg:px-16 pt-16 sm:pt-24 pb-20 sm:pb-28 max-w-7xl mx-auto w-full">
          <div className="max-w-3xl">
            <div
              className="inline-flex items-center gap-2 rounded-full border border-amber-brand/30 bg-amber-brand/10 px-3.5 py-1.5 text-xs font-semibold tracking-wide text-amber-brand-foreground animate-fade-in-up"
            >
              <FlaskConical className="size-3" />
              CMT &amp; Geotechnical Reporting
            </div>
            <h1
              className="font-heading text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.08] mt-6 animate-fade-in-up"
              style={{ animationDelay: "0.08s" }}
            >
              Field test reports, from site to client —{" "}
              <span className="text-amber-brand">
                without the paperwork.
              </span>
            </h1>
            <p
              className="text-lg sm:text-xl text-muted-foreground max-w-2xl leading-relaxed mt-6 animate-fade-in-up"
              style={{ animationDelay: "0.16s" }}
            >
              Bedrock replaces paper forms, spreadsheet templates, and email
              chains with one continuous digital workflow.
            </p>
            <div
              className="flex items-center gap-4 mt-8 animate-fade-in-up"
              style={{ animationDelay: "0.24s" }}
            >
              <Button asChild size="lg" className="gap-2 px-6">
                <Link to="/sign-in">
                  Get started
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <span className="text-sm text-muted-foreground hidden sm:inline">
                No credit card required
              </span>
            </div>
          </div>

          {/* Trust metrics */}
          <div
            className="flex flex-wrap gap-x-10 gap-y-4 mt-16 sm:mt-20 animate-fade-in-up"
            style={{ animationDelay: "0.32s" }}
          >
            {[
              { value: "5", label: "Test types" },
              { value: "100%", label: "Digital workflow" },
              { value: "<24h", label: "Avg. turnaround" },
            ].map((m) => (
              <div key={m.label}>
                <p className="font-heading text-2xl sm:text-3xl font-bold tracking-tight">
                  {m.value}
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                  {m.label}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ── How It Works ──────────────────────────────── */}
        <section className="border-t border-border/60">
          <div className="px-6 sm:px-10 lg:px-16 py-20 sm:py-28 max-w-7xl mx-auto w-full">
            <p className="text-xs font-heading font-semibold text-amber-brand uppercase tracking-wider">
              How it works
            </p>
            <h2 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight mt-3 max-w-md">
              Three steps. Zero paper.
            </h2>
            <p className="text-muted-foreground mt-3 max-w-lg leading-relaxed">
              From the moment a tech opens a form to the moment a client
              downloads the PDF.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-6 lg:gap-10 mt-12 sm:mt-16">
              {WORKFLOW_STEPS.map((step) => (
                <div key={step.number}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="size-10 rounded-lg bg-primary/[0.07] flex items-center justify-center shrink-0">
                      <step.icon className="size-5 text-primary" />
                    </div>
                    <span className="font-heading text-sm font-bold text-amber-brand tabular-nums">
                      {step.number}
                    </span>
                  </div>
                  <h3 className="font-heading text-lg font-semibold tracking-tight">
                    {step.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed mt-2">
                    {step.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Test Types ────────────────────────────────── */}
        <section className="border-t border-border/60">
          <div className="px-6 sm:px-10 lg:px-16 py-20 sm:py-28 max-w-7xl mx-auto w-full">
            <p className="text-xs font-heading font-semibold text-amber-brand uppercase tracking-wider">
              Test types
            </p>
            <h2 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight mt-3 max-w-md">
              Built for the tests you run.
            </h2>
            <p className="text-muted-foreground mt-3 max-w-lg leading-relaxed">
              Purpose-built forms for each test type. Every field, every unit,
              every calculation your techs need.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-12 sm:mt-16">
              {TEST_TYPES.map((test) => (
                <div
                  key={test.name}
                  className="group rounded-xl border bg-card p-5 hover:shadow-md transition-all duration-200"
                >
                  <div className="size-10 rounded-lg bg-amber-brand/10 flex items-center justify-center mb-4 group-hover:bg-amber-brand/15 transition-colors duration-200">
                    <test.icon className="size-5 text-amber-brand" />
                  </div>
                  <h3 className="font-heading text-sm font-semibold tracking-tight">
                    {test.name}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed mt-1.5">
                    {test.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Features ──────────────────────────────────── */}
        <section className="border-t border-border/60">
          <div className="px-6 sm:px-10 lg:px-16 py-20 sm:py-28 max-w-7xl mx-auto w-full">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-6">
              {FEATURES.map(({ icon: Icon, title, description }) => (
                <div key={title}>
                  <Icon className="size-5 text-muted-foreground mb-3" />
                  <h3 className="font-heading text-sm font-semibold">
                    {title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed mt-1">
                    {description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ───────────────────────────────────────── */}
        <section className="border-t border-border/60">
          <div className="px-6 sm:px-10 lg:px-16 py-20 sm:py-28 max-w-7xl mx-auto w-full text-center">
            <h2 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight">
              Ready to leave the paper behind?
            </h2>
            <p className="text-muted-foreground mt-3 max-w-lg mx-auto leading-relaxed">
              Set up your organization in minutes. Start collecting field data
              the same day.
            </p>
            <div className="mt-8">
              <Button asChild size="lg" className="gap-2 px-8">
                <Link to="/sign-in">
                  Get started
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* ── Footer ────────────────────────────────────── */}
        <footer className="mt-auto border-t border-border/60">
          <div className="px-6 sm:px-10 lg:px-16 py-6 max-w-7xl mx-auto w-full">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <BedrockMark className="size-3" />
                <span>Bedrock by Building &amp; Earth Sciences</span>
              </div>
              <span>&copy; {new Date().getFullYear()}</span>
            </div>
          </div>
        </footer>
      </div>
    </main>
  );
}
