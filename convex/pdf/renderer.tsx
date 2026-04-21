"use node";

import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { ReportDocument } from "./templates/Wrapper";
import { ConcreteFieldContent } from "./templates/ConcreteFieldTemplate";
import { NuclearDensityContent } from "./templates/NuclearDensityTemplate";
import { ProofRollContent } from "./templates/ProofRollTemplate";
import { DcpContent } from "./templates/DcpTemplate";
import { PileLoadContent } from "./templates/PileLoadTemplate";
import { CustomTestContent } from "./templates/CustomTestTemplate";

/**
 * The data bundle passed to the PDF renderer. Assembled by the
 * `loadForDelivery` internal query in the deliver action.
 */
export type DeliveryBundle = {
  org: { displayName: string; logoUrl?: string | null };
  project: { name: string; jobNumber: string };
  report: {
    number: string;
    kind: string;
    fieldDate: number;
    weather?: { tempF?: number; conditions?: string; windMph?: number } | null;
    locationNote?: string | null;
    stationFrom?: string | null;
    stationTo?: string | null;
  };
  creatorName: string;
  detail: Record<string, any> | null;
  cylinderSets: {
    setLabel: string;
    cylinders: {
      cylinderNumber: string;
      breakAgeDays: number;
      strengthPsi?: number | null;
      fractureType?: string | null;
    }[];
  }[];
  densityReadings?: any[];
  dcpLayers?: any[];
  pileLoadIncrements?: any[];
  approval: {
    signatureUrl: string | null;
    approverName: string;
    approvedAt: number;
    comments?: string | null;
  } | null;
  specZone?: { name: string; specMinCompactionPct?: number; specMinConcreteStrengthPsi?: number; specPileDesignLoadKips?: number } | null;
  pileTypeInfo?: { name: string; color: string } | null;
  portalUrl?: string | null;
  photoUrls?: { fileName: string; url: string }[];
  /** storageId → signed URL for photos embedded in custom test responses. */
  customPhotoUrls?: Record<string, string>;
};

/** Convert null to undefined for props. */
function n2u(val: string | null | undefined): string | undefined {
  return val ?? undefined;
}

function formatDate(epoch: number): string {
  return new Date(epoch).toLocaleDateString("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

/**
 * Renders a report to PDF bytes. Runs in the Node.js runtime only.
 */
export async function renderReportPdf(
  bundle: DeliveryBundle,
): Promise<Uint8Array> {
  const kindLabel = bundle.report.kind.replace(/_/g, " ");

  let content: React.ReactElement;
  if (bundle.report.kind === "concrete_field") {
    content = (
      <ConcreteFieldContent
        detail={bundle.detail ?? {}}
        weather={bundle.report.weather}
        locationNote={bundle.report.locationNote}
        stationFrom={bundle.report.stationFrom}
        stationTo={bundle.report.stationTo}
        cylinderSets={bundle.cylinderSets}
        specZone={bundle.specZone}
      />
    );
  } else if (bundle.report.kind === "nuclear_density") {
    content = (
      <NuclearDensityContent
        detail={bundle.detail ?? {}}
        densityReadings={bundle.densityReadings ?? []}
        weather={bundle.report.weather ?? undefined}
        locationNote={n2u(bundle.report.locationNote)}
        stationFrom={n2u(bundle.report.stationFrom)}
        stationTo={n2u(bundle.report.stationTo)}
        specZone={bundle.specZone}
      />
    );
  } else if (bundle.report.kind === "proof_roll") {
    content = (
      <ProofRollContent
        detail={bundle.detail ?? {}}
        weather={bundle.report.weather ?? undefined}
        locationNote={n2u(bundle.report.locationNote)}
        stationFrom={n2u(bundle.report.stationFrom)}
        stationTo={n2u(bundle.report.stationTo)}
        specZone={bundle.specZone}
      />
    );
  } else if (bundle.report.kind === "dcp") {
    content = (
      <DcpContent
        detail={bundle.detail ?? {}}
        dcpLayers={bundle.dcpLayers ?? []}
        weather={bundle.report.weather ?? undefined}
        locationNote={n2u(bundle.report.locationNote)}
        stationFrom={n2u(bundle.report.stationFrom)}
        stationTo={n2u(bundle.report.stationTo)}
        specZone={bundle.specZone}
      />
    );
  } else if (bundle.report.kind === "pile_load") {
    content = (
      <PileLoadContent
        detail={bundle.detail ?? {}}
        pileLoadIncrements={bundle.pileLoadIncrements ?? []}
        weather={bundle.report.weather ?? undefined}
        locationNote={n2u(bundle.report.locationNote)}
        stationFrom={n2u(bundle.report.stationFrom)}
        stationTo={n2u(bundle.report.stationTo)}
        pileTypeInfo={bundle.pileTypeInfo}
        specZone={bundle.specZone}
      />
    );
  } else if (bundle.report.kind === "custom") {
    content = (
      <CustomTestContent
        detail={bundle.detail ?? {}}
        weather={bundle.report.weather ?? undefined}
        locationNote={n2u(bundle.report.locationNote)}
        stationFrom={n2u(bundle.report.stationFrom)}
        stationTo={n2u(bundle.report.stationTo)}
        specZone={bundle.specZone}
        customPhotoUrls={bundle.customPhotoUrls}
      />
    );
  } else {
    content = <></>;
  }

  const doc = (
    <ReportDocument
      orgName={bundle.org.displayName}
      reportNumber={bundle.report.number}
      projectName={bundle.project.name}
      jobNumber={bundle.project.jobNumber}
      fieldDate={formatDate(bundle.report.fieldDate)}
      kind={kindLabel}
      creatorName={bundle.creatorName}
      signatureUrl={bundle.approval?.signatureUrl}
      approverName={bundle.approval?.approverName}
      approvedAt={
        bundle.approval ? formatDate(bundle.approval.approvedAt) : null
      }
      portalUrl={bundle.portalUrl}
      specZoneName={bundle.specZone?.name}
      logoUrl={bundle.org.logoUrl}
      photoUrls={bundle.photoUrls}
    >
      {content}
    </ReportDocument>
  );

  const buffer = await renderToBuffer(doc);
  return new Uint8Array(buffer);
}
