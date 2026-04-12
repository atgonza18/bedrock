import { useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Download, FileText, AlertTriangle } from "lucide-react";
import { KIND_LABELS } from "@/lib/constants";

export const Route = createFileRoute("/r/$token")({
  component: PortalPage,
});

function PortalPage() {
  const { token } = Route.useParams();
  const data = useQuery(api.portal.queries.getReportByToken, { token });
  const trackAccess = useMutation(api.portal.mutations.trackAccess);

  // Track portal access on mount.
  useEffect(() => {
    void trackAccess({ token });
    // Only track once per page load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  if (data === undefined) {
    return (
      <div className="min-h-screen bg-topo flex flex-col items-center justify-center">
        <div className="space-y-4 w-80">
          <Skeleton className="h-8 w-48 mx-auto" />
          <Skeleton className="h-48 w-full" />
          <p className="text-sm text-muted-foreground text-center">Loading report...</p>
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
    fieldDate,
    weather,
    detail,
    cylinderSets,
    pdfUrl,
    approvalInfo,
  } = data;

  const kindLabel = KIND_LABELS[kind] ?? kind;
  const dateStr = new Date(fieldDate).toLocaleDateString("en-US");

  return (
    <div className="min-h-screen bg-background bg-topo">
      {/* Header bar */}
      <header className="border-b bg-background/95 backdrop-blur">
        <div className="mx-auto max-w-3xl flex items-center justify-between h-14 px-4">
          <div>
            <span className="font-semibold">{orgName}</span>
            <span className="text-muted-foreground ml-2 text-sm">
              Report Portal
            </span>
          </div>
          {pdfUrl && (
            <Button asChild size="sm">
              <a href={pdfUrl} target="_blank" rel="noopener noreferrer">
                <Download className="h-4 w-4 mr-1.5" />
                Download PDF
              </a>
            </Button>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8 space-y-6">
        {/* Report header */}
        <div>
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-muted-foreground" />
            <h1 className="text-xl font-bold font-mono">{reportNumber}</h1>
            <Badge variant="secondary" className="capitalize">{kindLabel}</Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {projectName} | Job #{jobNumber} | {dateStr}
          </p>
        </div>

        {/* Detail */}
        {kind === "concrete_field" && detail && (
          <Card>
            <CardContent className="pt-6 space-y-4">
              <Section title="Pour Information">
                <Field label="Mix Design #" value={detail.mixDesignNumber} />
                <Field label="Design Strength" value={detail.designStrengthPsi ? `${detail.designStrengthPsi} psi` : null} />
                <Field label="Supplier" value={detail.supplier} />
                <Field label="Ticket #" value={detail.ticketNumber} />
                <Field label="Truck #" value={detail.truckNumber} />
                <Field label="Cubic Yards" value={detail.cubicYards} />
                <Field label="Placement" value={detail.placementLocation} />
              </Section>

              <Separator />

              <Section title="Test Results">
                <Field label="Slump" value={detail.slumpInches ? `${detail.slumpInches} in` : null} />
                <Field label="Air Content" value={detail.airContentPct ? `${detail.airContentPct}%` : null} />
                <Field label="Air Method" value={detail.airMethod} />
                <Field label="Concrete Temp" value={detail.concreteTempF ? `${detail.concreteTempF}°F` : null} />
                <Field label="Ambient Temp" value={detail.ambientTempF ? `${detail.ambientTempF}°F` : null} />
                <Field label="Unit Weight" value={detail.unitWeightPcf ? `${detail.unitWeightPcf} pcf` : null} />
              </Section>

              {weather && (
                <>
                  <Separator />
                  <Section title="Weather">
                    <Field label="Temperature" value={weather.tempF ? `${weather.tempF}°F` : null} />
                    <Field label="Conditions" value={weather.conditions} />
                    <Field label="Wind" value={weather.windMph ? `${weather.windMph} mph` : null} />
                  </Section>
                </>
              )}

              {cylinderSets.length > 0 && (
                <>
                  <Separator />
                  <Section title="Cylinder Test Specimens">
                    {cylinderSets.map((set, i) => (
                      <div key={i} className="mt-2">
                        <p className="text-sm font-medium mb-1">{set.setLabel}</p>
                        <div className="grid grid-cols-4 text-xs text-muted-foreground border-b pb-1 mb-1">
                          <span>Cylinder</span>
                          <span>Break Age</span>
                          <span>Strength</span>
                          <span>Fracture</span>
                        </div>
                        {set.cylinders.map((c, j) => (
                          <div key={j} className="grid grid-cols-4 text-sm py-0.5">
                            <span className="font-mono">{c.cylinderNumber}</span>
                            <span>{c.breakAgeDays} day</span>
                            <span>{c.strengthPsi ?? <em className="text-muted-foreground">Pending</em>}</span>
                            <span className="text-muted-foreground">{c.fractureType ?? "—"}</span>
                          </div>
                        ))}
                      </div>
                    ))}
                  </Section>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Approval */}
        {approvalInfo && (
          <Card>
            <CardContent className="pt-6 space-y-3">
              <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Approval
              </p>
              <p className="text-sm">
                Approved on{" "}
                {new Date(approvalInfo.approvedAt).toLocaleDateString("en-US")}
              </p>
              {approvalInfo.signatureUrl && (
                <div className="border rounded-md bg-white p-2 inline-block">
                  <img
                    src={approvalInfo.signatureUrl}
                    alt="Approval signature"
                    className="h-12"
                  />
                </div>
              )}
              {approvalInfo.comments && (
                <p className="text-sm text-muted-foreground">
                  {approvalInfo.comments}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        <p className="text-xs text-center text-muted-foreground pt-4">
          This report was generated by {orgName} via Bedrock.
        </p>
      </main>
    </div>
  );
}

function ErrorPage({ title, message }: { title: string; message: string }) {
  return (
    <div className="min-h-screen bg-topo flex items-center justify-center px-4">
      <Card className="max-w-sm w-full text-center">
        <CardContent className="pt-6 space-y-4">
          <div className="size-12 rounded-full bg-amber-brand/10 flex items-center justify-center mx-auto">
            <AlertTriangle className="h-6 w-6 text-amber-brand" />
          </div>
          <h1 className="font-heading text-lg font-bold">{title}</h1>
          <p className="text-sm text-muted-foreground">{message}</p>
          <a href="/" className="inline-block text-sm font-medium text-amber-brand hover:underline">
            Back to homepage
          </a>
        </CardContent>
      </Card>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-2">
        {title}
      </p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1">{children}</div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | number | null | undefined }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div className="flex gap-2 text-sm py-0.5">
      <span className="text-muted-foreground min-w-[100px]">{label}</span>
      <span>{String(value)}</span>
    </div>
  );
}
