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

  // Pass/fail badges
  passBadge: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: "#16a34a",
    backgroundColor: "#f0fdf4",
    borderRadius: 2,
    paddingVertical: 1,
    paddingHorizontal: 3,
  },
  failBadge: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: "#dc2626",
    backgroundColor: "#fef2f2",
    borderRadius: 2,
    paddingVertical: 1,
    paddingHorizontal: 3,
  },

  // Spec reference box
  specBox: {
    backgroundColor: "#fdfaf5",
    borderLeft: `2 solid ${ACCENT}`,
    padding: 8,
    marginTop: 6,
  },
  specText: { fontSize: 8, color: "#555" },
  specValue: { fontSize: 9, fontFamily: "Helvetica-Bold", color: "#1a1a1a" },
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
  densityReadings: any[];
  weather?: any;
  locationNote?: string;
  stationFrom?: string;
  stationTo?: string;
  specZone?: { name: string; specMinCompactionPct?: number } | null;
};

export function NuclearDensityContent({
  detail,
  densityReadings,
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
          <FieldPair label="Gauge Model" value={detail.gaugeModel} />
          <FieldPair label="Serial Number" value={detail.gaugeSerialNumber} />
          <FieldPair label="Standard Count Date" value={detail.standardCountDate} />
          <FieldPair label="Material" value={detail.materialDescription} />
          <FieldPair label="Lift Number" value={detail.liftNumber} />
        </View>
      </View>

      {/* Spec Reference */}
      {specZone?.specMinCompactionPct && (
        <View style={styles.specBox}>
          <Text style={styles.specText}>
            Minimum Compaction ({specZone.name})
          </Text>
          <Text style={styles.specValue}>
            {specZone.specMinCompactionPct}%
          </Text>
        </View>
      )}

      <View style={styles.divider} />

      {/* Density Readings */}
      {densityReadings.length > 0 && (
        <>
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>Density Readings</Text>
            <View style={styles.tableContainer}>
              <View style={styles.tableHeaderRow}>
                <Text style={[styles.tableHeaderCell, { width: 35 }]}>
                  Test #
                </Text>
                <Text style={[styles.tableHeaderCell, { width: 50 }]}>
                  Station
                </Text>
                <Text style={[styles.tableHeaderCell, { width: 35 }]}>
                  Offset
                </Text>
                <Text style={[styles.tableHeaderCell, { width: 40 }]}>
                  Elev.
                </Text>
                <Text style={[styles.tableHeaderCell, { width: 35 }]}>
                  Depth
                </Text>
                <Text style={[styles.tableHeaderCell, { width: 45 }]}>
                  Wet Dens.
                </Text>
                <Text style={[styles.tableHeaderCell, { width: 40 }]}>
                  Moist. %
                </Text>
                <Text style={[styles.tableHeaderCell, { width: 45 }]}>
                  Dry Dens.
                </Text>
                <Text style={[styles.tableHeaderCell, { width: 45 }]}>
                  Comp. %
                </Text>
                <Text style={[styles.tableHeaderCell, { flex: 1 }]}>
                  Result
                </Text>
              </View>
              {densityReadings.map((reading, i) => {
                const pf = reading.passed === true ? "PASS" : reading.passed === false ? "FAIL" : undefined;
                const isPass = pf === "PASS";
                const isFail = pf === "FAIL";
                return (
                  <View
                    key={i}
                    style={i % 2 === 1 ? styles.tableRowAlt : styles.tableRow}
                  >
                    <Text style={[styles.tableCell, { width: 35 }]}>
                      {reading.testNumber ?? i + 1}
                    </Text>
                    <Text style={[styles.tableCell, { width: 50 }]}>
                      {reading.station ?? "\u2014"}
                    </Text>
                    <Text style={[styles.tableCell, { width: 35 }]}>
                      {reading.offset ?? "\u2014"}
                    </Text>
                    <Text style={[styles.tableCell, { width: 40 }]}>
                      {reading.elevation ?? "\u2014"}
                    </Text>
                    <Text style={[styles.tableCell, { width: 35 }]}>
                      {reading.depthInches ?? "\u2014"}
                    </Text>
                    <Text style={[styles.tableCell, { width: 45 }]}>
                      {reading.wetDensityPcf ?? "\u2014"}
                    </Text>
                    <Text style={[styles.tableCell, { width: 40 }]}>
                      {reading.moisturePct ?? "\u2014"}
                    </Text>
                    <Text style={[styles.tableCell, { width: 45 }]}>
                      {reading.dryDensityPcf ?? "\u2014"}
                    </Text>
                    <Text style={[styles.tableCell, { width: 45 }]}>
                      {reading.compactionPct ?? "\u2014"}
                    </Text>
                    <Text
                      style={[
                        isPass
                          ? styles.passBadge
                          : isFail
                            ? styles.failBadge
                            : styles.tableCell,
                        { flex: 1 },
                      ]}
                    >
                      {pf ?? "\u2014"}
                    </Text>
                  </View>
                );
              })}
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
          <FieldPair label="Station From" value={stationFrom} />
          <FieldPair label="Station To" value={stationTo} />
          <FieldPair label="Location Note" value={locationNote} />
        </View>
      </View>
    </View>
  );
}
