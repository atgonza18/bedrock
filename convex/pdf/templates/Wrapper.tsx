"use node";

import React from "react";
import { Document, Page, View, Text, Image, StyleSheet, Svg, Path } from "@react-pdf/renderer";

const ACCENT = "#c89340";
const INK = "#1a1a1a";
const MUTE = "#8a8a8a";
const RULE = "#d8d4cc";

const styles = StyleSheet.create({
  page: {
    paddingTop: 48,
    paddingLeft: 48,
    paddingRight: 48,
    paddingBottom: 64,
    fontSize: 9,
    fontFamily: "Helvetica",
    color: INK,
  },
  // ─── Masthead ──────────────────────────────────────────
  masthead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingBottom: 14,
    marginBottom: 22,
    borderBottom: `0.75 solid ${INK}`,
  },
  mastheadLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  logoMarkBox: {
    width: 22,
    height: 22,
    backgroundColor: INK,
    borderRadius: 3,
    padding: 4,
  },
  logoImg: {
    maxHeight: 22,
    maxWidth: 120,
    objectFit: "contain" as const,
  },
  orgNameBlock: {},
  orgName: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: INK,
    letterSpacing: 0.2,
  },
  eyebrow: {
    fontSize: 6.5,
    color: MUTE,
    textTransform: "uppercase",
    letterSpacing: 1.4,
    marginTop: 2,
  },
  mastheadRight: {
    alignItems: "flex-end",
  },
  reportNumber: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    color: INK,
    letterSpacing: 0.4,
    marginBottom: 3,
  },
  statusPill: {
    fontSize: 6.5,
    color: MUTE,
    textTransform: "uppercase",
    letterSpacing: 1.4,
  },
  // ─── Title block ──────────────────────────────────────
  titleBlock: {
    marginBottom: 24,
  },
  kindBadge: {
    fontSize: 6.5,
    color: MUTE,
    textTransform: "uppercase",
    letterSpacing: 1.4,
    marginBottom: 6,
  },
  projectName: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    color: INK,
    lineHeight: 1.15,
    marginBottom: 12,
  },
  metaGrid: {
    flexDirection: "row",
    gap: 24,
    marginTop: 8,
  },
  metaCell: {
    flex: 1,
  },
  metaLabel: {
    fontSize: 6.5,
    color: MUTE,
    textTransform: "uppercase",
    letterSpacing: 1.4,
    marginBottom: 2,
  },
  metaValue: {
    fontSize: 9,
    color: INK,
  },
  // ─── Section headings (shared with children) ──────────
  sectionWrap: {
    marginBottom: 18,
  },
  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    gap: 8,
  },
  sectionNumber: {
    fontSize: 7,
    color: MUTE,
    fontFamily: "Helvetica",
  },
  sectionTitle: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: INK,
    textTransform: "uppercase",
    letterSpacing: 1.4,
  },
  sectionRule: {
    flex: 1,
    height: 0.5,
    backgroundColor: RULE,
  },
  // ─── Certification block ──────────────────────────────
  certification: {
    marginTop: 32,
    paddingTop: 20,
    borderTop: `0.75 solid ${INK}`,
  },
  certEyebrow: {
    fontSize: 6.5,
    color: MUTE,
    textTransform: "uppercase",
    letterSpacing: 1.4,
    marginBottom: 12,
  },
  certRow: {
    flexDirection: "row",
    gap: 28,
    alignItems: "flex-start",
  },
  signatureBox: {
    border: `0.5 solid ${RULE}`,
    padding: 6,
    minWidth: 140,
  },
  signatureImage: {
    height: 36,
    objectFit: "contain" as const,
  },
  approvedKicker: {
    fontSize: 6.5,
    color: "#2d7049",
    textTransform: "uppercase",
    letterSpacing: 1.4,
    marginBottom: 8,
  },
  approverInfo: {
    flex: 1,
  },
  approverName: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: INK,
    marginBottom: 2,
  },
  approverMeta: {
    fontSize: 8,
    color: MUTE,
    marginBottom: 2,
  },
  // ─── Photos ──────────────────────────────────────────
  photosWrap: {
    marginTop: 18,
  },
  photosGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  photoCell: {
    width: "48%",
    marginBottom: 10,
  },
  photoImage: {
    width: "100%",
    maxHeight: 180,
    objectFit: "contain" as const,
    border: `0.5 solid ${RULE}`,
  },
  photoCaption: {
    fontSize: 6,
    color: MUTE,
    marginTop: 2,
  },
  // ─── Footer ───────────────────────────────────────────
  footer: {
    position: "absolute",
    bottom: 28,
    left: 48,
    right: 48,
    borderTop: `0.5 solid ${RULE}`,
    paddingTop: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    fontSize: 6.5,
    color: MUTE,
    textTransform: "uppercase",
    letterSpacing: 1.4,
  },
  // Amber hairline at the very top (kept as a subtle brand nod)
  accentBar: {
    position: "absolute",
    top: 0,
    left: 48,
    width: 28,
    height: 2,
    backgroundColor: ACCENT,
  },
});

export type WrapperProps = {
  orgName: string;
  reportNumber: string;
  projectName: string;
  jobNumber: string;
  fieldDate: string;
  kind: string;
  creatorName: string;
  signatureUrl?: string | null;
  approverName?: string | null;
  approvedAt?: string | null;
  portalUrl?: string | null;
  specZoneName?: string;
  logoUrl?: string | null;
  photoUrls?: { fileName: string; url: string }[];
  children: React.ReactNode;
};

export function ReportDocument({
  orgName,
  reportNumber,
  projectName,
  jobNumber,
  fieldDate,
  kind,
  creatorName,
  signatureUrl,
  approverName,
  approvedAt,
  specZoneName,
  logoUrl,
  photoUrls,
  children,
}: WrapperProps) {
  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        {/* Short amber hairline — a single branded gesture */}
        <View style={styles.accentBar} fixed />

        {/* Masthead */}
        <View style={styles.masthead} fixed>
          <View style={styles.mastheadLeft}>
            {logoUrl ? (
              <Image src={logoUrl} style={styles.logoImg} />
            ) : (
              <>
                <View style={styles.logoMarkBox}>
                  <Svg viewBox="0 0 24 24" width={14} height={14}>
                    <Path d="M3.2 19.5 L9 10.8 L12 13.8 L16 7.5 L20.8 19.5 Z" fill="#ffffff" />
                  </Svg>
                </View>
                <View style={styles.orgNameBlock}>
                  <Text style={styles.orgName}>{orgName}</Text>
                  <Text style={styles.eyebrow}>Field report delivery</Text>
                </View>
              </>
            )}
          </View>
          <View style={styles.mastheadRight}>
            <Text style={styles.reportNumber}>{reportNumber}</Text>
            <Text style={styles.statusPill}>
              {approvedAt ? "Certified · Delivered" : "Draft"}
            </Text>
          </View>
        </View>

        {/* Title block */}
        <View style={styles.titleBlock}>
          <Text style={styles.kindBadge}>{kind}</Text>
          <Text style={styles.projectName}>{projectName}</Text>
          <View style={styles.metaGrid}>
            <View style={styles.metaCell}>
              <Text style={styles.metaLabel}>Job number</Text>
              <Text style={styles.metaValue}>{jobNumber || "—"}</Text>
            </View>
            <View style={styles.metaCell}>
              <Text style={styles.metaLabel}>Field date</Text>
              <Text style={styles.metaValue}>{fieldDate}</Text>
            </View>
            <View style={styles.metaCell}>
              <Text style={styles.metaLabel}>Technician</Text>
              <Text style={styles.metaValue}>{creatorName}</Text>
            </View>
            {specZoneName && (
              <View style={styles.metaCell}>
                <Text style={styles.metaLabel}>Test zone</Text>
                <Text style={styles.metaValue}>{specZoneName}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Content (children render sections via SectionHead) */}
        {children}

        {/* Photos */}
        {photoUrls && photoUrls.length > 0 && (
          <View style={styles.photosWrap}>
            <SectionHead number="P" title="Photos" />
            <View style={styles.photosGrid}>
              {photoUrls.map((photo, i) => (
                <View
                  key={i}
                  style={[
                    styles.photoCell,
                    { marginRight: i % 2 === 0 ? "4%" : 0 },
                  ]}
                >
                  <Image src={photo.url} style={styles.photoImage} />
                  <Text style={styles.photoCaption}>{photo.fileName}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Certification */}
        {signatureUrl && (
          <View style={styles.certification} wrap={false}>
            <Text style={styles.certEyebrow}>Certification</Text>
            <View style={styles.certRow}>
              <View>
                <Text style={styles.approvedKicker}>✓ Approved</Text>
                <View style={styles.signatureBox}>
                  <Image src={signatureUrl} style={styles.signatureImage} />
                </View>
              </View>
              <View style={styles.approverInfo}>
                {approverName && (
                  <Text style={styles.approverName}>{approverName}</Text>
                )}
                {approvedAt && (
                  <Text style={styles.approverMeta}>Approved {approvedAt}</Text>
                )}
              </View>
            </View>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text>Delivered by {orgName}</Text>
          <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
          <Text>{reportNumber}</Text>
        </View>
      </Page>
    </Document>
  );
}

/**
 * Shared numbered-section header for the body of each template.
 * Use: <SectionHead number="01" title="Delivery ticket" />
 */
export function SectionHead({
  number,
  title,
}: {
  number: string;
  title: string;
}) {
  return (
    <View style={styles.sectionHead}>
      <Text style={styles.sectionNumber}>§{number}</Text>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionRule} />
    </View>
  );
}

/** Wraps a child template body for consistent spacing. */
export function SectionBody({ children }: { children: React.ReactNode }) {
  return <View style={styles.sectionWrap}>{children}</View>;
}

/** Shared styles for consumers (field rows, tables, etc.). */
export const sharedPdfStyles = StyleSheet.create({
  fieldGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 10,
  },
  fieldCell: {
    width: "33%",
    marginBottom: 8,
  },
  fieldCellWide: {
    width: "66%",
    marginBottom: 8,
  },
  fieldLabel: {
    fontSize: 6.5,
    color: MUTE,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: 2,
  },
  fieldValue: {
    fontSize: 9,
    color: INK,
  },
  table: {
    borderTop: `0.5 solid ${RULE}`,
    borderLeft: `0.5 solid ${RULE}`,
    borderRight: `0.5 solid ${RULE}`,
    marginTop: 4,
    marginBottom: 10,
  },
  thead: {
    flexDirection: "row",
    borderBottom: `0.5 solid ${RULE}`,
    backgroundColor: "#faf8f4",
  },
  th: {
    fontSize: 6.5,
    color: MUTE,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    padding: 6,
    fontFamily: "Helvetica-Bold",
  },
  tr: {
    flexDirection: "row",
    borderBottom: `0.5 solid ${RULE}`,
  },
  td: {
    fontSize: 8.5,
    color: INK,
    padding: 6,
  },
});
