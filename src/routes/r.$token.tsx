import { useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Download, AlertTriangle, Check } from "lucide-react";
import { reportKindLabel } from "@/lib/constants";
import { TestKindIcon } from "@/components/test-icons";

export const Route = createFileRoute("/r/$token")({
  component: PortalPage,
});

function PortalPage() {
  const { token } = Route.useParams();
  const data = useQuery(api.portal.queries.getReportByToken, { token });
  const trackAccess = useMutation(api.portal.mutations.trackAccess);

  useEffect(() => {
    void trackAccess({ token });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  if (data === undefined) {
    return (
      <div className="min-h-screen bg-background bg-topo flex flex-col items-center justify-center">
        <div className="space-y-4 w-80">
          <Skeleton className="h-8 w-48 mx-auto" />
          <Skeleton className="h-48 w-full" />
          <p className="text-sm text-muted-foreground text-center">Loading report…</p>
        </div>
      </div>
    );
  }

  if (data.state === "not_found") {
    return <ErrorPage title="Report not found" message="This link may be invalid." />;
  }
  if (data.state === "expired") {
    return <ErrorPage title="Link expired" message="This report link has expired. Please contact the testing company for a new link." />;
  }
  if (data.state === "revoked") {
    return <ErrorPage title="Link revoked" message="This report link has been revoked." />;
  }

  const {
    orgName,
    projectName,
    jobNumber,
    reportNumber,
    kind,
    templateName,
    status,
    fieldDate,
    weather,
    locationNote,
    stationFrom,
    stationTo,
    detail,
    cylinderSets,
    pdfUrl,
    approvalInfo,
  } = data;

  const kindLabel = reportKindLabel(kind, templateName);
  const dateStr = new Date(fieldDate).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="min-h-screen bg-background">
      {/* ── Masthead ────────────────────────────────────────────────── */}
      <header className="border-b border-border/70">
        <div className="mx-auto max-w-4xl px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="size-8 rounded-sm bg-foreground text-background flex items-center justify-center font-heading font-bold text-sm shrink-0">
                {orgName.charAt(0)}
              </div>
              <div className="min-w-0">
                <p className="font-heading text-sm font-semibold tracking-tight truncate">
                  {orgName}
                </p>
                <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                  Field report delivery
                </p>
              </div>
            </div>
            {pdfUrl && (
              <Button asChild variant="outline" size="sm" className="shrink-0">
                <a href={pdfUrl} target="_blank" rel="noopener noreferrer">
                  <Download className="size-4" />
                  <span className="hidden sm:inline">Download PDF</span>
                  <span className="sm:hidden">PDF</span>
                </a>
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* ── Document ──────────────────────────────────────────────── */}
      <main className="mx-auto max-w-4xl px-6 lg:px-8 py-10 lg:py-14">
        {/* Title block */}
        <div className="pb-8 border-b border-border/70">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-4">
            <span className="inline-flex items-center gap-1.5">
              <TestKindIcon kind={kind} width={14} height={14} />
              {kindLabel}
            </span>
            <span className="text-border">·</span>
            <StatusPill status={status} />
          </div>
          <h1 className="font-heading text-3xl sm:text-4xl font-semibold tracking-tight leading-tight">
            {projectName}
          </h1>
          <dl className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-3">
            <Meta label="Report" value={reportNumber} mono />
            <Meta label="Job number" value={jobNumber || "—"} mono />
            <Meta label="Field date" value={dateStr} />
            <Meta label="Issued by" value={orgName} />
          </dl>
        </div>

        {/* Body */}
        <div className="mt-10 space-y-12">
          {kind === "concrete_field" && detail && (
            <>
              <DocSection number="01" title="Delivery ticket">
                <FieldGrid>
                  <F label="Supplier" value={detail.supplier} />
                  <F label="Mix design" value={detail.mixDesignNumber} mono />
                  <F label="Ticket number" value={detail.ticketNumber} mono />
                  <F label="Truck number" value={detail.truckNumber} mono />
                  <F label="Design strength" value={fmtUnit(detail.designStrengthPsi, "psi")} />
                  <F label="Cubic yards" value={detail.cubicYards} />
                  <F label="Placement" value={detail.placementLocation} span={2} />
                </FieldGrid>
              </DocSection>

              <DocSection number="02" title="Fresh-concrete tests">
                <FieldGrid>
                  <F label="Slump" value={fmtUnit(detail.slumpInches, "in")} />
                  <F label="Air content" value={detail.airContentPct ? `${detail.airContentPct}%` : null} />
                  <F label="Air method" value={cap(detail.airMethod)} />
                  <F label="Concrete temp" value={fmtUnit(detail.concreteTempF, "°F")} />
                  <F label="Ambient temp" value={fmtUnit(detail.ambientTempF, "°F")} />
                  <F label="Unit weight" value={fmtUnit(detail.unitWeightPcf, "pcf")} />
                </FieldGrid>
              </DocSection>

              {(weather || locationNote || stationFrom || stationTo) && (
                <DocSection number="03" title="Conditions &amp; location">
                  <FieldGrid>
                    {weather?.tempF !== undefined && (
                      <F label="Temperature" value={fmtUnit(weather.tempF, "°F")} />
                    )}
                    {weather?.conditions && (
                      <F label="Conditions" value={weather.conditions} />
                    )}
                    {weather?.windMph !== undefined && (
                      <F label="Wind" value={fmtUnit(weather.windMph, "mph")} />
                    )}
                    {locationNote && (
                      <F label="Location" value={locationNote} span={2} />
                    )}
                    {(stationFrom || stationTo) && (
                      <F
                        label="Station"
                        value={[stationFrom, stationTo].filter(Boolean).join(" — ")}
                      />
                    )}
                  </FieldGrid>
                </DocSection>
              )}

              {cylinderSets.length > 0 && (
                <DocSection number="04" title="Cylinder test specimens">
                  <div className="space-y-6">
                    {cylinderSets.map((set, i) => (
                      <div key={i}>
                        <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground mb-2">
                          {set.setLabel}
                        </p>
                        <div className="overflow-hidden border border-border/70 rounded-sm">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                                <th className="text-left font-medium px-3 py-2 border-b border-border/70">Cylinder</th>
                                <th className="text-left font-medium px-3 py-2 border-b border-border/70">Break age</th>
                                <th className="text-left font-medium px-3 py-2 border-b border-border/70">Strength</th>
                                <th className="text-left font-medium px-3 py-2 border-b border-border/70">Fracture</th>
                              </tr>
                            </thead>
                            <tbody>
                              {set.cylinders.map((c, j) => (
                                <tr key={j} className="border-b border-border/40 last:border-0">
                                  <td className="font-mono px-3 py-2">{c.cylinderNumber}</td>
                                  <td className="px-3 py-2">{c.breakAgeDays}-day</td>
                                  <td className="px-3 py-2 font-mono">
                                    {c.strengthPsi != null
                                      ? `${c.strengthPsi.toLocaleString()} psi`
                                      : <span className="text-muted-foreground italic">Pending</span>}
                                  </td>
                                  <td className="px-3 py-2 text-muted-foreground">{c.fractureType ?? "—"}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))}
                  </div>
                </DocSection>
              )}
            </>
          )}

          {/* Fallback for other kinds — render any string/number fields from detail */}
          {kind !== "concrete_field" && detail && (
            <DocSection number="01" title="Test data">
              <FieldGrid>
                {Object.entries(detail)
                  .filter(([k, v]) =>
                    !k.startsWith("_") &&
                    k !== "orgId" &&
                    k !== "reportId" &&
                    (typeof v === "string" || typeof v === "number") &&
                    v !== "",
                  )
                  .map(([k, v]) => (
                    <F
                      key={k}
                      label={humanize(k)}
                      value={typeof v === "number" && k.toLowerCase().includes("pct") ? `${v}%` : String(v)}
                    />
                  ))}
              </FieldGrid>
            </DocSection>
          )}
        </div>

        {/* ── Approval block ─────────────────────────────────────── */}
        {approvalInfo && (
          <div className="mt-16 pt-10 border-t border-border">
            <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-6">
              Certification
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-8 items-start">
              <div className="shrink-0">
                <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-emerald-700 dark:text-emerald-500 mb-3">
                  <Check className="size-3.5" strokeWidth={2.5} />
                  Approved
                </div>
                {approvalInfo.signatureUrl && (
                  <div className="border border-border/70 rounded-sm bg-background p-3 w-fit">
                    <img
                      src={approvalInfo.signatureUrl}
                      alt="Approval signature"
                      className="h-14 w-auto"
                    />
                  </div>
                )}
              </div>
              <div className="space-y-1">
                {approvalInfo.approvedByName && (
                  <p className="font-heading text-lg font-semibold leading-tight">
                    {approvalInfo.approvedByName}
                  </p>
                )}
                {approvalInfo.peLicenseNumber && (
                  <p className="text-sm text-muted-foreground">
                    PE {approvalInfo.peLicenseNumber}
                    {approvalInfo.peState ? ` · ${approvalInfo.peState}` : ""}
                  </p>
                )}
                <p className="text-sm text-muted-foreground">
                  Approved {new Date(approvalInfo.approvedAt).toLocaleDateString("en-US", {
                    year: "numeric", month: "long", day: "numeric",
                  })}
                </p>
                {approvalInfo.comments && (
                  <>
                    <Separator className="my-3" />
                    <p className="text-sm leading-relaxed text-foreground/80">
                      {approvalInfo.comments}
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Footer ────────────────────────────────────────────── */}
        <footer className="mt-16 pt-6 border-t border-border/70 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
          <span>Delivered by {orgName}</span>
          <span className="font-mono tracking-normal normal-case">{reportNumber}</span>
        </footer>
      </main>
    </div>
  );
}

/* ── Building blocks ───────────────────────────────────────────── */

function DocSection({
  number,
  title,
  children,
}: {
  number: string;
  title: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="flex items-baseline gap-3 mb-5">
        <span className="font-mono text-xs text-muted-foreground tabular-nums">§{number}</span>
        <h2 className="font-heading text-sm font-semibold uppercase tracking-[0.14em]">
          {title}
        </h2>
        <div className="flex-1 h-px bg-border/70" />
      </div>
      {children}
    </section>
  );
}

function FieldGrid({ children }: { children: React.ReactNode }) {
  return (
    <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-8 gap-y-5">
      {children}
    </dl>
  );
}

function F({
  label,
  value,
  mono,
  span,
}: {
  label: string;
  value: React.ReactNode | string | number | null | undefined;
  mono?: boolean;
  span?: number;
}) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div className={span === 2 ? "col-span-2" : span === 3 ? "col-span-3" : ""}>
      <dt className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </dt>
      <dd className={`mt-1 text-sm ${mono ? "font-mono" : ""}`}>{value}</dd>
    </div>
  );
}

function Meta({
  label,
  value,
  mono,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </dt>
      <dd className={`mt-1 text-sm font-medium ${mono ? "font-mono" : ""}`}>
        {value}
      </dd>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const isDelivered = status === "delivered";
  return (
    <span className={`inline-flex items-center gap-1.5 normal-case tracking-normal text-[11px] ${isDelivered ? "text-emerald-700 dark:text-emerald-500" : "text-muted-foreground"}`}>
      <span className={`size-1.5 rounded-full ${isDelivered ? "bg-emerald-600 dark:bg-emerald-500" : "bg-muted-foreground"}`} />
      {isDelivered ? "Delivered" : cap(status.replace("_", " "))}
    </span>
  );
}

function fmtUnit(n: number | null | undefined, unit: string): string | null {
  if (n === null || n === undefined) return null;
  return `${n} ${unit}`;
}

function cap(s: string | null | undefined): string | null {
  if (!s) return null;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function humanize(k: string): string {
  return k
    .replace(/([A-Z])/g, " $1")
    .replace(/_/g, " ")
    .replace(/\bPct\b/g, "%")
    .replace(/\bF\b/g, "°F")
    .replace(/\bPsi\b/g, "psi")
    .trim()
    .replace(/^./, (c) => c.toUpperCase());
}

function ErrorPage({ title, message }: { title: string; message: string }) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="max-w-sm w-full text-center space-y-5">
        <div className="size-10 rounded-full border border-border flex items-center justify-center mx-auto">
          <AlertTriangle className="size-5 text-muted-foreground" />
        </div>
        <div className="space-y-2">
          <h1 className="font-heading text-lg font-semibold">{title}</h1>
          <p className="text-sm text-muted-foreground">{message}</p>
        </div>
        <a href="/" className="inline-block text-sm font-medium underline-offset-4 hover:underline">
          Back to homepage
        </a>
      </div>
    </div>
  );
}
