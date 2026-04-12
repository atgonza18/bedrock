"use node";

import React from "react";
import { Document, Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer";

const ACCENT = "#c89340";

const styles = StyleSheet.create({
  page: {
    paddingTop: 3, // room for accent bar flush to top
    paddingLeft: 40,
    paddingRight: 40,
    paddingBottom: 60,
    fontSize: 9,
    fontFamily: "Helvetica",
    color: "#1a1a1a",
  },
  // Thin amber bar at the very top of the page
  accentBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: ACCENT,
  },
  // Header block
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingTop: 20,
    paddingBottom: 12,
    borderBottom: `1.5 solid ${ACCENT}`,
    marginBottom: 16,
  },
  headerLeft: {
    flex: 1,
    paddingRight: 20,
  },
  logo: {
    maxHeight: 45,
    maxWidth: 150,
    objectFit: "contain" as const,
    marginBottom: 4,
  },
  orgName: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    color: "#1a1a1a",
    marginBottom: 2,
  },
  headerRight: {
    alignItems: "flex-end",
  },
  reportNumber: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    color: "#1a1a1a",
    marginBottom: 4,
  },
  metaLabel: {
    fontSize: 7,
    color: "#888",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  metaValue: {
    fontSize: 8,
    color: "#444",
    marginBottom: 3,
  },
  // Content area
  content: {
    flex: 1,
  },
  // Signature block
  signatureBlock: {
    marginTop: 24,
    width: 200,
  },
  signatureImage: {
    height: 40,
    marginBottom: 2,
  },
  signatureLine: {
    borderBottom: "1 solid #999",
    marginBottom: 4,
  },
  signatureLabel: {
    fontSize: 7,
    color: "#888",
    textTransform: "uppercase",
    letterSpacing: 0.3,
    marginBottom: 1,
  },
  signatureValue: {
    fontSize: 8,
    color: "#333",
  },
  // Footer
  footer: {
    position: "absolute",
    bottom: 25,
    left: 40,
    right: 40,
    borderTop: "0.5 solid #d0d0d0",
    paddingTop: 6,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    fontSize: 7,
    color: "#999",
  },
  footerLeft: {
    flex: 1,
  },
  footerCenter: {
    flex: 1,
    textAlign: "center",
  },
  footerRight: {
    flex: 1,
    textAlign: "right",
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
        {/* Accent bar */}
        <View style={styles.accentBar} fixed />

        {/* Header */}
        <View style={styles.header} fixed>
          <View style={styles.headerLeft}>
            {logoUrl ? (
              <Image src={logoUrl} style={styles.logo} />
            ) : (
              <Text style={styles.orgName}>{orgName}</Text>
            )}
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.reportNumber}>{reportNumber}</Text>
            <Text style={styles.metaLabel}>Project</Text>
            <Text style={styles.metaValue}>{projectName}</Text>
            <Text style={styles.metaLabel}>Job Number</Text>
            <Text style={styles.metaValue}>{jobNumber}</Text>
            <Text style={styles.metaLabel}>Field Date</Text>
            <Text style={styles.metaValue}>{fieldDate}</Text>
            <Text style={styles.metaLabel}>Report Type</Text>
            <Text style={styles.metaValue}>{kind}</Text>
            <Text style={styles.metaLabel}>Technician</Text>
            <Text style={styles.metaValue}>{creatorName}</Text>
            {specZoneName && (
              <>
                <Text style={styles.metaLabel}>Test Zone</Text>
                <Text style={styles.metaValue}>{specZoneName}</Text>
              </>
            )}
          </View>
        </View>

        {/* Content */}
        <View style={styles.content}>{children}</View>

        {/* Photos */}
        {photoUrls && photoUrls.length > 0 && (
          <View style={{ marginTop: 14 }}>
            <Text style={{
              fontSize: 9,
              fontFamily: "Helvetica-Bold",
              color: "#1a1a1a",
              textTransform: "uppercase",
              letterSpacing: 0.8,
              marginBottom: 8,
              paddingBottom: 3,
              borderBottom: `1.5 solid ${ACCENT}`,
            }}>
              Photos
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
              {photoUrls.map((photo, i) => (
                <View key={i} style={{ width: "48%", marginBottom: 8, marginRight: i % 2 === 0 ? "4%" : 0 }}>
                  <Image src={photo.url} style={{ width: "100%", maxHeight: 200, objectFit: "contain", borderRadius: 2, border: "0.5 solid #e0e0e0" }} />
                  <Text style={{ fontSize: 6, color: "#888", marginTop: 2 }}>{photo.fileName}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Signature */}
        {signatureUrl && (
          <View style={styles.signatureBlock}>
            <Image src={signatureUrl} style={styles.signatureImage} />
            <View style={styles.signatureLine} />
            <Text style={styles.signatureLabel}>Approved By</Text>
            <Text style={styles.signatureValue}>
              {approverName ?? "\u2014"} {approvedAt ? `on ${approvedAt}` : ""}
            </Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerLeft}>{orgName}</Text>
          <Text
            style={styles.footerCenter}
            render={({ pageNumber }) => `Page ${pageNumber}`}
          />
          <Text style={styles.footerRight}>{reportNumber}</Text>
        </View>
      </Page>
    </Document>
  );
}
