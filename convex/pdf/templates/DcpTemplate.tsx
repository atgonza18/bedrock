"use node";

import { View, Text, StyleSheet } from "@react-pdf/renderer";

const ACCENT = "#c89340";

const styles = StyleSheet.create({
  // Sections
  section: { marginBottom: 14 },
  sectionHeader: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: "#1a1a1a",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 8,
    paddingBottom: 3,
    borderBottom: `1.5 solid ${ACCENT}`,
  },

  // Field rows — two column layout
  fieldGrid: { flexDirection: "row", flexWrap: "wrap" },
  fieldPair: { width: "50%", paddingRight: 12, marginBottom: 5 },
  fieldFull: { width: "100%", marginBottom: 5 },
  fieldLabel: {
    fontSize: 7,
    color: "#888",
    marginBottom: 1,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  fieldValue: { fontSize: 9, color: "#1a1a1a" },

  // Tables
  tableContainer: { marginTop: 4 },
  tableHeaderRow: {
    flexDirection: "row",
    backgroundColor: "#f0f0f0",
    paddingVertical: 4,
    paddingHorizontal: 4,
    borderBottom: "1 solid #ddd",
  },
  tableHeaderCell: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: "#555",
    textTransform: "uppercase",
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 3,
    paddingHorizontal: 4,
    borderBottom: "0.5 solid #eee",
  },
  tableRowAlt: {
    flexDirection: "row",
    paddingVertical: 3,
    paddingHorizontal: 4,
    borderBottom: "0.5 solid #eee",
    backgroundColor: "#fafafa",
  },
  tableCell: { fontSize: 8, color: "#333" },

  // Divider
  divider: { borderBottom: "0.5 solid #e0e0e0", marginVertical: 10 },
});

function FieldPair({ label, value }: { label: string; value: any }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <View style={styles.fieldPair}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldValue}>{String(value)}</Text>
    </View>
  );
}

type Props = {
  detail: Record<string, any>;
  dcpLayers: any[];
  weather?: any;
  locationNote?: string;
  stationFrom?: string;
  stationTo?: string;
  specZone?: { name: string } | null;
};

export function DcpContent({
  detail,
  dcpLayers,
  weather,
  locationNote,
  stationFrom,
  stationTo,
  specZone,
}: Props) {
  return (
    <View>
      {/* Equipment */}
      <View style={styles.section}>
        <Text style={styles.sectionHeader}>Equipment</Text>
        <View style={styles.fieldGrid}>
          <FieldPair label="Hammer Weight (lbs)" value={detail.hammerWeightLbs} />
          {specZone && (
            <FieldPair label="Test Zone" value={specZone.name} />
          )}
        </View>
      </View>

      <View style={styles.divider} />

      {/* Test Point */}
      <View style={styles.section}>
        <Text style={styles.sectionHeader}>Test Point</Text>
        <View style={styles.fieldGrid}>
          <FieldPair label="Test Location" value={detail.testLocation} />
          <FieldPair label="Groundwater Depth (in)" value={detail.groundwaterDepthIn} />
          <FieldPair label="Station From" value={stationFrom} />
          <FieldPair label="Station To" value={stationTo} />
          <FieldPair label="Location Note" value={locationNote} />
        </View>
      </View>

      <View style={styles.divider} />

      {/* DCP Layers */}
      {dcpLayers.length > 0 && (
        <>
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>DCP Layers</Text>
            <View style={styles.tableContainer}>
              <View style={styles.tableHeaderRow}>
                <Text style={[styles.tableHeaderCell, { width: 45 }]}>
                  Seq.
                </Text>
                <Text style={[styles.tableHeaderCell, { width: 55 }]}>
                  From Depth
                </Text>
                <Text style={[styles.tableHeaderCell, { width: 50 }]}>
                  To Depth
                </Text>
                <Text style={[styles.tableHeaderCell, { width: 55 }]}>
                  Blow Count
                </Text>
                <Text style={[styles.tableHeaderCell, { width: 50 }]}>
                  DCP Index
                </Text>
                <Text style={[styles.tableHeaderCell, { width: 55 }]}>
                  Est. CBR
                </Text>
                <Text style={[styles.tableHeaderCell, { flex: 1 }]}>
                  Soil Desc.
                </Text>
              </View>
              {dcpLayers.map((layer, i) => (
                <View
                  key={i}
                  style={i % 2 === 1 ? styles.tableRowAlt : styles.tableRow}
                >
                  <Text style={[styles.tableCell, { width: 45 }]}>
                    {layer.sequence ?? i + 1}
                  </Text>
                  <Text style={[styles.tableCell, { width: 55 }]}>
                    {layer.fromDepthIn ?? "\u2014"}
                  </Text>
                  <Text style={[styles.tableCell, { width: 50 }]}>
                    {layer.toDepthIn ?? "\u2014"}
                  </Text>
                  <Text style={[styles.tableCell, { width: 55 }]}>
                    {layer.blowCount ?? "\u2014"}
                  </Text>
                  <Text style={[styles.tableCell, { width: 50 }]}>
                    {layer.dcpIndexMmPerBlow ?? "\u2014"}
                  </Text>
                  <Text style={[styles.tableCell, { width: 55 }]}>
                    {layer.estimatedCbrPct ?? "\u2014"}
                  </Text>
                  <Text style={[styles.tableCell, { flex: 1 }]}>
                    {layer.soilDescription ?? "\u2014"}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.divider} />
        </>
      )}

      {/* Site Conditions */}
      <View style={styles.section}>
        <Text style={styles.sectionHeader}>Site Conditions</Text>
        <View style={styles.fieldGrid}>
          <FieldPair label="Temperature (\u00b0F)" value={weather?.tempF} />
          <FieldPair label="Conditions" value={weather?.conditions} />
          <FieldPair label="Wind (mph)" value={weather?.windMph} />
        </View>
      </View>
    </View>
  );
}
