import { createFileRoute, Link } from "@tanstack/react-router";
import { useSetBreadcrumbs } from "@/components/layout/breadcrumb-context";
import { PageTransition } from "@/components/layout/PageTransition";
import { Card, CardContent } from "@/components/ui/card";
import { TestKindIcon } from "@/components/test-icons";
import { kindColor } from "@/lib/test-kind-colors";
import { useCurrentMember } from "@/features/auth/useCurrentMember";
import {
  LayoutDashboard,
  FolderKanban,
  FileText,
  FlaskConical,
  ClipboardCheck,
  Users,
  Building2,
  Shield,
  Layers,
  Wrench,
  Award,
  Settings,
  ActivitySquare,
  UserRound,
  PenLine,
  Camera,
  Copy,
  Mail,
  CheckCircle,
  XCircle,
  Keyboard,
  Sparkles,
  WifiOff,
  Sun,
  Smartphone,
} from "lucide-react";

export const Route = createFileRoute("/app/help")({
  component: HelpPage,
});

const SECTIONS = [
  { id: "get-started", label: "Get started" },
  { id: "daily-flow", label: "Daily flow (by role)" },
  { id: "reports", label: "Reports" },
  { id: "review", label: "Review queue" },
  { id: "lab", label: "Lab & cylinder breaks" },
  { id: "portal", label: "Client portal" },
  { id: "admin", label: "Admin" },
  { id: "profile", label: "Your profile" },
  { id: "shortcuts", label: "Keyboard shortcuts" },
  { id: "mobile", label: "Mobile & field use" },
  { id: "troubleshooting", label: "Troubleshooting" },
];

function HelpPage() {
  const me = useCurrentMember();
  useSetBreadcrumbs([{ label: "Help & guide" }]);

  return (
    <PageTransition>
      <div className="mx-auto max-w-5xl px-4 sm:px-6 py-6">
        {/* Intro */}
        <div className="pb-8 border-b border-border/70">
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground mb-3">
            Guide · Every feature, what it does, how to use it
          </p>
          <h1 className="font-heading text-3xl sm:text-4xl font-semibold tracking-tight leading-tight">
            How to use Bedrock
          </h1>
          <p className="text-muted-foreground mt-3 max-w-2xl leading-relaxed">
            A complete reference for every feature in the app. Skim the table of
            contents; jump to any section. The content is grouped by the kind of
            user — field tech, PM, admin, client.
          </p>
        </div>

        {/* Layout: TOC sidebar + content */}
        <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-10 mt-10">
          <aside className="lg:sticky lg:top-20 h-fit">
            <nav>
              <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground mb-3">
                Contents
              </p>
              <ul className="space-y-1.5 text-sm">
                {SECTIONS.map((s) => (
                  <li key={s.id}>
                    <a
                      href={`#${s.id}`}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {s.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </aside>

          <div className="space-y-14 min-w-0" data-stagger>
            {/* Get started */}
            <Section id="get-started" number="01" title="Get started">
              <p>
                Bedrock runs the full life of a field test — from the crew's
                phone on site, through PM review, to your client's inbox.
              </p>
              <Steps>
                <Step num="1" title="Sign in">
                  Sign in at the login screen. If you were invited by email,
                  use that same email when you create your account.
                </Step>
                <Step num="2" title="Land on the dashboard">
                  The <Crumb icon={LayoutDashboard}>Dashboard</Crumb> shows
                  activity at a glance. Admins also see ops metrics (reports
                  delivered, avg turnaround, queue depth, rejection rate) and a
                  delivery-activity heatmap.
                </Step>
                <Step num="3" title="Fill in your profile">
                  Open the user menu (bottom-left of the sidebar) →{" "}
                  <Crumb icon={UserRound}>Your profile</Crumb>. Upload your
                  signature and PE seal once. They're applied automatically on
                  every future approval.
                </Step>
              </Steps>
              <Tip>
                Press <Kbd>?</Kbd> anywhere to see keyboard shortcuts. Press{" "}
                <Kbd>⌘</Kbd>
                <Kbd>K</Kbd> to open the command palette.
              </Tip>
            </Section>

            {/* Daily flow */}
            <Section id="daily-flow" number="02" title="Daily flow by role">
              <SubSection title="Field tech">
                <ol className="list-decimal pl-5 space-y-1.5 text-sm leading-relaxed">
                  <li>
                    Open{" "}
                    <Crumb icon={FolderKanban}>Projects</Crumb> → tap your
                    project → <em>New report</em> → pick a test type.
                  </li>
                  <li>
                    Fill in the form. Every keystroke auto-saves (1s debounce)
                    — the save pill at the top turns to <em>Saved</em> after
                    each pause. On mobile the pill sticks to the top of the
                    screen.
                  </li>
                  <li>
                    Add photos (camera icon uses the rear camera on phones).
                    For concrete: add cylinder sets. For density: add readings.
                    For DCP: add layer depths.
                  </li>
                  <li>
                    Tap <em>Submit for review</em>. If required fields are
                    missing, a toast lists them.
                  </li>
                </ol>
              </SubSection>
              <SubSection title="Project manager (PM)">
                <ol className="list-decimal pl-5 space-y-1.5 text-sm leading-relaxed">
                  <li>
                    Open <Crumb icon={ClipboardCheck}>Review Queue</Crumb>{" "}
                    (press <Kbd>G</Kbd> <Kbd>Q</Kbd>). Urgency ramp shows
                    which are aging — hairline turns red at 24h overdue.
                  </li>
                  <li>
                    Press <Kbd>C</Kbd> to claim the next submitted report, or
                    click <em>Claim</em> on a specific one.
                  </li>
                  <li>
                    Click <em>Approve</em> or <em>Reject</em>. Your signature
                    on file is used by default — toggle to draw a different
                    one inline if needed.
                  </li>
                  <li>
                    <strong>Bulk approve</strong>: in the <em>In review</em>{" "}
                    section, tick the checkboxes, then{" "}
                    <em>Approve N</em>. One signature applies to all.
                  </li>
                </ol>
              </SubSection>
              <SubSection title="Admin">
                Admins can do everything a PM can, plus full org setup — see the{" "}
                <a href="#admin" className="underline underline-offset-2">
                  Admin
                </a>{" "}
                section below.
              </SubSection>
              <SubSection title="Client">
                Clients log in (or open a portal link) and see only their own
                reports in read-only mode. They can download the PDF; nothing
                else.
              </SubSection>
            </Section>

            {/* Reports */}
            <Section id="reports" number="03" title="Reports">
              <p>
                Bedrock supports five test types, each with its own signature
                accent color that you'll see consistently across the app
                (queue, list, portal, command palette).
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                <KindCard
                  kind="concrete_field"
                  label="Concrete field test"
                  desc="ASTM C143 slump, C231 air, C1064 temp, C31 cylinder casting."
                />
                <KindCard
                  kind="nuclear_density"
                  label="Nuclear density"
                  desc="ASTM D6938. Compaction % computed server-side from Proctor reference."
                />
                <KindCard
                  kind="proof_roll"
                  label="Proof roll"
                  desc="Observation of subgrade under loaded equipment. Pass/fail/conditional."
                />
                <KindCard
                  kind="dcp"
                  label="DCP"
                  desc="ASTM D6951 dynamic cone penetrometer. CBR estimated from blow count."
                />
                <KindCard
                  kind="pile_load"
                  label="Pile load test"
                  desc="ASTM D1143 static / D4945 dynamic. Load-settlement chart in PDF."
                />
              </div>

              <SubSection title="Create">
                <Crumb icon={FolderKanban}>Projects</Crumb> → project →{" "}
                <em>New report</em> → pick kind. A draft is created with the
                next <span className="font-mono">CMT-YYYY-#####</span> number.
              </SubSection>
              <SubSection title="Auto-save">
                The form saves silently every second. The status pill (top of
                form) morphs{" "}
                <span className="text-muted-foreground">●&nbsp;Saving…</span>{" "}
                →{" "}
                <span className="text-emerald-600 dark:text-emerald-500">
                  ✓ Saved
                </span>
                . If you lose connection, a red banner appears at the top of
                the app (<WifiOff className="inline size-3" aria-hidden />).
              </SubSection>
              <SubSection title="Photos">
                <Crumb icon={Camera}>Photos</Crumb> — tap <em>Add photo</em>{" "}
                to open the rear camera on phones, or pick a file on desktop.
                Tap a photo to open the lightbox (pinch/scroll to zoom, drag to
                pan). The trash icon removes it — visible by default on mobile,
                on hover on desktop.
              </SubSection>
              <SubSection title="Duplicate">
                On any draft, click <Crumb icon={Copy}>Duplicate</Crumb> in the
                header to create a new draft pre-filled with supplier / mix /
                station / weather / location. Photos and cylinders are not
                copied — those are event-specific. Useful for repeat trucks of
                the same mix.
              </SubSection>
              <SubSection title="Filter your report list">
                <Crumb icon={FileText}>My Reports</Crumb> has a search box,
                test-type filter, project filter, and status pills. Use{" "}
                <em>Reset filters</em> to clear everything.
              </SubSection>
              <SubSection title="Status lifecycle">
                <code className="text-xs">
                  draft → submitted → in&nbsp;review → approved → delivered
                </code>
                . A <em>rejected</em> report bounces back to the tech with the
                PM's reason; they fix and re-submit.
              </SubSection>
            </Section>

            {/* Review */}
            <Section id="review" number="04" title="Review queue">
              <p>
                PMs and admins review submitted reports in{" "}
                <Crumb icon={ClipboardCheck}>Review Queue</Crumb>.
              </p>
              <SubSection title="Urgency ramp">
                Cards get a hairline left-border that escalates with age:
                neutral &lt;1h, soft gray 1–6h, dark 6–24h, red 24h+. Submitted
                reports are sorted oldest-first so overdue work surfaces at the
                top.
              </SubSection>
              <SubSection title="Claim">
                Press <Kbd>C</Kbd> to claim the next submitted report, or
                click <em>Claim</em> on a specific card. Claiming moves the
                report from <em>Submitted</em> to <em>In review</em> with you
                as reviewer.
              </SubSection>
              <SubSection title="Approve (single)">
                Click <CheckCircle className="inline size-3.5 text-emerald-600" />
                <em>Approve</em>. If you have a signature on file, it's
                pre-selected — one click and you're done. Otherwise draw a new
                one. Approval triggers PDF generation + client delivery.
              </SubSection>
              <SubSection title="Reject">
                Click <XCircle className="inline size-3.5 text-destructive" />{" "}
                <em>Reject</em>, write what needs to be fixed (required), and
                submit. The tech sees it in <em>My Reports</em> with a red
                banner and can resubmit after fixing.
              </SubSection>
              <SubSection title="Bulk approve">
                In the <em>In review</em> section, tick the checkboxes on the
                left of each card — a counter appears at the top right with{" "}
                <em>Approve N</em>. The same signature + comments apply to
                every selected report; each one gets its own audit entry and
                client delivery.
              </SubSection>
            </Section>

            {/* Lab */}
            <Section id="lab" number="05" title="Lab & cylinder breaks">
              <p>
                Concrete cylinders cast in the field eventually get broken in
                the lab at 7, 14, 28, or 56 days. The <Crumb icon={FlaskConical}>Lab</Crumb>{" "}
                module is where that happens.
              </p>
              <SubSection title="Break queue">
                Cylinders are grouped by urgency:{" "}
                <em>overdue · today · this week · upcoming</em>. Overdue
                cylinders should be broken immediately to stay within ASTM
                tolerance.
              </SubSection>
              <SubSection title="Record a break">
                Click a cylinder → enter <em>load (lbs)</em> and{" "}
                <em>area (sq in)</em>, pick fracture type (ASTM C39 types
                1–6), add optional notes. Strength is auto-computed
                (load ÷ area). When all cylinders in a set are broken, the set
                is marked complete.
              </SubSection>
              <Tip>
                After a cylinder is broken, the parent report shows the
                strength value. If the report is already delivered, re-sending
                the PDF picks up the updated strength automatically.
              </Tip>
            </Section>

            {/* Portal */}
            <Section id="portal" number="06" title="Client portal">
              <p>
                Approved reports are delivered to client contacts via a magic
                link (<span className="font-mono">/r/&lt;token&gt;</span>) that
                renders a certified-document view with PDF download. No login
                required.
              </p>
              <SubSection title="Recipients">
                Set default recipients per project:{" "}
                <Crumb icon={FolderKanban}>Projects</Crumb> → project →{" "}
                <em>Recipients</em> tab →{" "}
                <Crumb icon={Mail}>Manage recipients</Crumb>. Portal tokens
                mint automatically on approval for each listed contact.
              </SubSection>
              <SubSection title="PDF download">
                The portal header has a <em>Download PDF</em> button. The PDF
                is generated server-side on approval and stored in Convex; the
                portal serves a signed URL.
              </SubSection>
              <SubSection title="Access tracking">
                Each portal link tracks view count. On the report detail →{" "}
                <em>Delivery</em> card, you see each recipient and how many
                times they've opened their link.
              </SubSection>
              <Tip>
                Email delivery (Resend wiring) needs DNS + API key from your
                IT. Until then, the portal link is the delivery mechanism. Copy
                it from the Delivery card to send manually if needed.
              </Tip>
            </Section>

            {/* Admin */}
            <Section id="admin" number="07" title="Admin">
              <p>Admin-only pages live under the <Crumb icon={Shield}>Admin</Crumb> section of the sidebar.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <AdminCard
                  icon={Users}
                  title="Users"
                  desc="Invite teammates (tech / PM / admin / client). Change roles after the fact. Revoke invitations."
                />
                <AdminCard
                  icon={Building2}
                  title="Clients"
                  desc="EPC/GC companies you work with. Add client contacts (who'll receive portal links)."
                />
                <AdminCard
                  icon={FolderKanban}
                  title="Projects"
                  desc="Create projects, assign clients. Team assignment + default recipients happen on the project detail page."
                />
                <AdminCard
                  icon={Layers}
                  title="Proctors"
                  desc="Proctor curves referenced by nuclear-density tests (MDD + optimum moisture %)."
                />
                <AdminCard
                  icon={Wrench}
                  title="Equipment"
                  desc="Gauges and testing equipment, including calibration dates for audit compliance."
                />
                <AdminCard
                  icon={Award}
                  title="Certifications"
                  desc="Tech certifications (ACI, NICET, etc.) with expiration tracking."
                />
                <AdminCard
                  icon={ActivitySquare}
                  title="Audit log"
                  desc="Every state change across every report — created, submitted, approved, rejected, delivered, archived — with actor and timestamp."
                />
                <AdminCard
                  icon={Settings}
                  title="Settings"
                  desc="Org branding: logo, display name, primary color."
                />
              </div>
              <SubSection title="Project team assignment">
                On any project detail page → <em>Team</em> tab →{" "}
                <em>Manage team</em>. Assign techs, PMs, or observers.{" "}
                <strong>Important:</strong> non-admin techs only see projects
                they're assigned to.
              </SubSection>
              <SubSection title="Default recipients">
                On any project detail page → <em>Recipients</em> tab →{" "}
                <em>Manage recipients</em>. Pick which client contacts receive
                the approved PDF + portal link. A project with no recipients
                won't mint portal tokens on approval.
              </SubSection>
            </Section>

            {/* Profile */}
            <Section id="profile" number="08" title="Your profile">
              <p>
                Open the user menu (bottom-left of sidebar) →{" "}
                <Crumb icon={UserRound}>Your profile</Crumb>.
              </p>
              <SubSection title="Signature on file">
                Draw your signature once. On every future approval, it's the
                default — one click to approve. You can still draw a different
                one on the spot if needed (toggle <em>Draw a different one</em>{" "}
                in the approve dialog).
              </SubSection>
              <SubSection title="PE license & seal">
                Enter your PE license number and licensed states (two-letter
                codes, comma-separated). Upload your seal as PNG or JPEG. The
                seal is embedded into approval records for every report you
                approve — critical for states that require wet-sealed materials
                reports.
              </SubSection>
              <Tip>
                <Crumb icon={PenLine}>Replace</Crumb> on either signature or
                seal lets you change them without losing history — existing
                approvals keep the version that was on file at approval time
                (via <span className="font-mono">peLicenseNumberAtTime</span>).
              </Tip>
            </Section>

            {/* Shortcuts */}
            <Section id="shortcuts" number="09" title="Keyboard shortcuts">
              <p>
                Press <Kbd>?</Kbd> anywhere to open the shortcut overlay, or{" "}
                <Kbd>⌘</Kbd>
                <Kbd>K</Kbd> for the command palette (search projects, reports,
                actions).
              </p>
              <div className="rounded-lg border bg-card divide-y">
                <KbRow keys={["⌘", "K"]} label="Open command palette" />
                <KbRow keys={["?"]} label="Show keyboard shortcuts" />
                <KbRow keys={["B"]} label="Toggle sidebar" />
                <KbRow keys={["G", "D"]} label="Go to dashboard" />
                <KbRow keys={["G", "P"]} label="Go to projects" />
                <KbRow keys={["G", "R"]} label="Go to my reports" />
                <KbRow keys={["G", "Q"]} label="Go to review queue (PM+)" />
                <KbRow keys={["G", "A"]} label="Go to admin (admin)" />
                <KbRow keys={["C"]} label="Claim next submitted report (on queue)" />
                <KbRow keys={["Esc"]} label="Close open dialog" />
              </div>
            </Section>

            {/* Mobile */}
            <Section id="mobile" number="10" title="Mobile & field use">
              <SubSection title="Install as an app">
                On iOS Safari: tap Share → <em>Add to Home Screen</em>. On
                Android Chrome: menu → <em>Install app</em>. Launches in
                standalone mode with no browser chrome.
              </SubSection>
              <SubSection title="Offline awareness">
                When your device drops connection, a red banner appears at the
                top. Saves will fail silently until you're back online.{" "}
                <strong>Avoid editing on extended dropouts</strong> — finish
                the form, wait for the banner to clear, then verify the save
                pill says <em>Saved</em> before closing.
              </SubSection>
              <SubSection title="Gloves & daylight">
                All inputs are a minimum 44&nbsp;px tall on phones with 16&nbsp;px
                font (prevents iOS zoom-on-focus). The sticky submit bar stays
                in thumb reach.
              </SubSection>
              <SubSection title="Wizard flow">
                On mobile, the report form splits into steps (Test data →
                Photos → Cylinders/readings). Progress bar at the top; tap any
                segment to jump. Next/Back auto-scrolls to the top of each
                step.
              </SubSection>
              <SubSection title="Theme">
                User menu → <em>Theme</em> → Light / Dark / System.{" "}
                <Sun className="inline size-3.5" /> for outdoor visibility.
              </SubSection>
            </Section>

            {/* Troubleshooting */}
            <Section id="troubleshooting" number="11" title="Troubleshooting">
              <SubSection title="I don't see any projects">
                If you're a tech, you only see projects you're assigned to. Ask
                an admin to go to <em>Projects → the project → Team tab →
                Manage team</em> and add you.
              </SubSection>
              <SubSection title="My approval failed with “No signature…”">
                You have no signature on file and didn't draw one. Either go to{" "}
                <Crumb icon={UserRound}>Your profile</Crumb> and upload/draw a
                signature, or toggle to <em>Draw a different one</em> in the
                approve dialog.
              </SubSection>
              <SubSection title="The approve flow succeeded, but the client didn't get a link">
                Check the project's <em>Recipients</em> tab. If nobody is
                listed, no portal tokens were minted. Use{" "}
                <em>Manage recipients</em> to add the right contacts, then
                re-approve from the report detail (the PDF regenerates).
              </SubSection>
              <SubSection title="Connection banner won't go away">
                Check your LTE / WiFi signal. Refreshing the page while offline
                won't help. When you're back on, the banner clears within a
                second.
              </SubSection>
              <SubSection title="Reports in My Reports are stale">
                Convex is reactive — the list updates live. If something looks
                wrong, press <Kbd>⌘</Kbd>
                <Kbd>K</Kbd> and search for the report number directly.
              </SubSection>
              <Tip>
                Every action leaves an audit trail. Admin →{" "}
                <Crumb icon={ActivitySquare}>Audit log</Crumb> shows every
                event with actor and timestamp for the last 200 events.
              </Tip>
            </Section>

            {/* Outro */}
            <Card className="border-l-4 border-l-amber-brand">
              <CardContent className="py-5 space-y-2">
                <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                  <Sparkles className="inline size-3" /> Power tips
                </p>
                <ul className="list-disc pl-5 text-sm leading-relaxed space-y-1">
                  <li>
                    Upload your signature once in{" "}
                    <Link to="/app/profile" className="underline underline-offset-2">
                      Your profile
                    </Link>{" "}
                    — future approvals take a single click.
                  </li>
                  <li>
                    On the review queue, press <Kbd>C</Kbd> to chain through
                    submissions without reaching for the mouse.
                  </li>
                  <li>
                    On a pour sequence, duplicate the last report and only
                    adjust truck number / ticket number — saves ~15 min per
                    pour.
                  </li>
                  <li>
                    Bulk-approve routine low-risk reports from the{" "}
                    <em>In review</em> section — same signature for all.
                  </li>
                </ul>
              </CardContent>
            </Card>

            {me?.state === "ok" && me.membership.role === "admin" && (
              <Card>
                <CardContent className="py-5 space-y-2">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                    <Smartphone className="inline size-3" /> For the pilot rollout
                  </p>
                  <p className="text-sm leading-relaxed">
                    Before handing Bedrock to a pilot team, walk an admin
                    through: (1) invite users with roles, (2) add clients +
                    contacts, (3) create a project, (4) assign team, (5) set
                    recipients, (6) push them to fill in{" "}
                    <Link
                      to="/app/profile"
                      className="underline underline-offset-2"
                    >
                      Your profile
                    </Link>{" "}
                    with signature. They're ready.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-16 pt-6 border-t border-border/70 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
          <Keyboard className="inline size-3" /> Press <Kbd>?</Kbd> from
          anywhere for shortcuts
        </div>
      </div>
    </PageTransition>
  );
}

/* ── Building blocks ────────────────────────────────────────── */

function Section({
  id,
  number,
  title,
  children,
}: {
  id: string;
  number: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-20 space-y-4">
      <div className="flex items-baseline gap-3">
        <span className="font-mono text-xs text-muted-foreground tabular-nums">
          §{number}
        </span>
        <h2 className="font-heading text-xl sm:text-2xl font-semibold tracking-tight">
          {title}
        </h2>
        <div className="flex-1 h-px bg-border/70" />
      </div>
      <div className="space-y-4 text-sm leading-relaxed text-foreground/90">
        {children}
      </div>
    </section>
  );
}

function SubSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <h3 className="font-semibold text-[13px] uppercase tracking-[0.1em] text-muted-foreground">
        {title}
      </h3>
      <div className="text-sm leading-relaxed text-foreground/90">
        {children}
      </div>
    </div>
  );
}

function Steps({ children }: { children: React.ReactNode }) {
  return <div className="space-y-3 mt-2">{children}</div>;
}

function Step({
  num,
  title,
  children,
}: {
  num: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3">
      <span className="font-mono text-xs text-muted-foreground tabular-nums shrink-0 pt-0.5 w-4 text-right">
        {num}
      </span>
      <div className="min-w-0">
        <p className="font-semibold text-sm">{title}</p>
        <p className="text-sm text-muted-foreground leading-relaxed mt-0.5">
          {children}
        </p>
      </div>
    </div>
  );
}

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-l-4 border-l-amber-brand bg-card px-4 py-3 text-sm leading-relaxed">
      <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground mb-1">
        <Sparkles className="inline size-3" /> Tip
      </p>
      {children}
    </div>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="font-mono text-[11px] border rounded px-1.5 py-0.5 bg-muted/50 mx-0.5">
      {children}
    </kbd>
  );
}

function Crumb({
  icon: Icon,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-1 font-medium text-foreground">
      <Icon className="size-3.5 text-muted-foreground" />
      {children}
    </span>
  );
}

function KindCard({
  kind,
  label,
  desc,
}: {
  kind: string;
  label: string;
  desc: string;
}) {
  const c = kindColor(kind);
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center gap-2 mb-1">
        <TestKindIcon
          kind={kind}
          width={16}
          height={16}
          style={{ color: c.oklch }}
        />
        <p className="font-heading font-semibold text-sm">{label}</p>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
    </div>
  );
}

function AdminCard({
  icon: Icon,
  title,
  desc,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
}) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center gap-2 mb-1">
        <Icon className="size-3.5 text-muted-foreground" />
        <p className="font-heading font-semibold text-sm">{title}</p>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
    </div>
  );
}

function KbRow({ keys, label }: { keys: string[]; label: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5">
      <span className="text-sm">{label}</span>
      <span className="flex items-center gap-1">
        {keys.map((k, i) => (
          <Kbd key={i}>{k}</Kbd>
        ))}
      </span>
    </div>
  );
}
