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

  // Divider
  divider: { borderBottom: "0.5 solid #e0e0e0", marginVertical: 10 },

  // Result display
  resultBox: {
    backgroundColor: "#fdfaf5",
    borderLeft: `3 solid ${ACCENT}`,
    padding: 10,
    marginTop: 6,
  },
  resultLabel: {
    fontSize: 7,
    color: "#888",
    textTransform: "uppercase",
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  resultValue: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: "#1a1a1a",
  },
  resultPass: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: "#16a34a",
  },
  resultFail: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: "#dc2626",
  },
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

function FieldFull({ label, value }: { label: string; value: any }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <View style={styles.fieldFull}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldValue}>{String(value)}</Text>
    </View>
  );
}

type Props = {
  detail: Record<string, any>;
  weather?: any;
  locationNote?: string;
  stationFrom?: string;
  stationTo?: string;
  specZone?: { name: string } | null;
};

export function ProofRollContent({
  detail,
  weather,
  locationNote,
  stationFrom,
  stationTo,
  specZone,
}: Props) {
  const resultStr = detail.result?.toString().toUpperCase();
  const isPass = resultStr === "PASS" || resultStr === "SATISFACTORY";
  const isFail = resultStr === "FAIL" || resultStr === "UNSATISFACTORY";

  return (
    <View>
      {/* Equipment & Area */}
      <View style={styles.section}>
        <Text style={styles.sectionHeader}>Equipment &amp; Area</Text>
        <View style={styles.fieldGrid}>
          <FieldPair label="Equipment Used" value={detail.equipmentUsed} />
          <FieldPair label="Number of Passes" value={detail.numberOfPasses} />
          <FieldFull label="Area Description" value={detail.areaDescription} />
          {specZone && (
            <FieldPair label="Test Zone" value={specZone.name} />
          )}
        </View>
      </View>

      <View style={styles.divider} />

      {/* Assessment */}
      <View style={styles.section}>
        <Text style={styles.sectionHeader}>Assessment</Text>

        <View style={styles.resultBox}>
          <Text style={styles.resultLabel}>Result</Text>
          <Text
            style={
              isPass
                ? styles.resultPass
                : isFail
                  ? styles.resultFail
                  : styles.resultValue
            }
          >
            {detail.result ?? "\u2014"}
          </Text>
        </View>

        <View style={[styles.fieldGrid, { marginTop: 8 }]}>
          <FieldFull label="Failure Zones" value={detail.failureZones} />
          <FieldFull label="Recommendations" value={detail.recommendations} />
        </View>
      </View>

      <View style={styles.divider} />

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
