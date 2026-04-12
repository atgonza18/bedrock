"use node";

import React from "react";
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

  // Pass/fail
  passBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0fdf4",
    borderRadius: 3,
    padding: 6,
    marginTop: 6,
  },
  failBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fef2f2",
    borderRadius: 3,
    padding: 6,
    marginTop: 6,
  },
  passText: { fontSize: 9, fontFamily: "Helvetica-Bold", color: "#16a34a" },
  failText: { fontSize: 9, fontFamily: "Helvetica-Bold", color: "#dc2626" },

  // Cylinder set label
  setLabel: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: "#333",
    marginBottom: 4,
  },
});

type ConcreteDetail = {
  mixDesignNumber?: string | null;
  designStrengthPsi?: number | null;
  supplier?: string | null;
  ticketNumber?: string | null;
  truckNumber?: string | null;
  cubicYards?: number | null;
  placementLocation?: string | null;
  slumpInches?: number | null;
  airContentPct?: number | null;
  airMethod?: string | null;
  concreteTempF?: number | null;
  ambientTempF?: number | null;
  unitWeightPcf?: number | null;
  admixtureNotes?: string | null;
};

type CylinderData = {
  setLabel: string;
  cylinders: {
    cylinderNumber: string;
    breakAgeDays: number;
    strengthPsi?: number | null;
    fractureType?: string | null;
  }[];
};

type WeatherData = {
  tempF?: number | null;
  conditions?: string | null;
  windMph?: number | null;
};

type Props = {
  detail: ConcreteDetail;
  weather?: WeatherData | null;
  locationNote?: string | null;
  stationFrom?: string | null;
  stationTo?: string | null;
  cylinderSets: CylinderData[];
  specZone?: { name: string; specMinConcreteStrengthPsi?: number } | null;
};

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

export function ConcreteFieldContent({
  detail,
  weather,
  locationNote,
  stationFrom,
  stationTo,
  cylinderSets,
  specZone,
}: Props) {
  const passes =
    specZone?.specMinConcreteStrengthPsi && detail.designStrengthPsi
      ? detail.designStrengthPsi >= specZone.specMinConcreteStrengthPsi
      : null;

  return (
    <View>
      {/* Delivery Ticket */}
      <View style={styles.section}>
        <Text style={styles.sectionHeader}>Delivery Ticket</Text>
        <View style={styles.fieldGrid}>
          <FieldPair label="Mix Design #" value={detail.mixDesignNumber} />
          <FieldPair label="Design Strength (psi)" value={detail.designStrengthPsi} />
          <FieldPair label="Supplier" value={detail.supplier} />
          <FieldPair label="Ticket #" value={detail.ticketNumber} />
          <FieldPair label="Truck #" value={detail.truckNumber} />
          <FieldPair label="Cubic Yards" value={detail.cubicYards} />
          <FieldFull label="Placement Location" value={detail.placementLocation} />
        </View>
      </View>

      <View style={styles.divider} />

      {/* Fresh Concrete Tests */}
      <View style={styles.section}>
        <Text style={styles.sectionHeader}>Fresh Concrete Tests</Text>
        <View style={styles.fieldGrid}>
          <FieldPair label="Slump (in)" value={detail.slumpInches} />
          <FieldPair label="Air Content (%)" value={detail.airContentPct} />
          <FieldPair label="Air Method" value={detail.airMethod} />
          <FieldPair label="Concrete Temp (\u00b0F)" value={detail.concreteTempF} />
          <FieldPair label="Ambient Temp (\u00b0F)" value={detail.ambientTempF} />
          <FieldPair label="Unit Weight (pcf)" value={detail.unitWeightPcf} />
          <FieldFull label="Admixture Notes" value={detail.admixtureNotes} />
        </View>
      </View>

      {/* Spec Check */}
      {passes !== null && (
        <View style={passes ? styles.passBox : styles.failBox}>
          <Text style={passes ? styles.passText : styles.failText}>
            {passes ? "PASS" : "FAIL"} \u2014 {detail.designStrengthPsi} psi vs{" "}
            {specZone!.specMinConcreteStrengthPsi} psi required
          </Text>
        </View>
      )}

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

      {/* Cylinder Sets */}
      {cylinderSets.length > 0 && (
        <>
          <View style={styles.divider} />
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>Cylinder Test Specimens</Text>
            {cylinderSets.map((set, i) => (
              <View key={i} style={{ marginBottom: 10 }}>
                <Text style={styles.setLabel}>{set.setLabel}</Text>
                <View style={styles.tableContainer}>
                  <View style={styles.tableHeaderRow}>
                    <Text style={[styles.tableHeaderCell, { width: 60 }]}>
                      Cylinder
                    </Text>
                    <Text style={[styles.tableHeaderCell, { width: 60 }]}>
                      Break Age
                    </Text>
                    <Text style={[styles.tableHeaderCell, { width: 80 }]}>
                      Strength (psi)
                    </Text>
                    <Text style={[styles.tableHeaderCell, { flex: 1 }]}>
                      Fracture
                    </Text>
                  </View>
                  {set.cylinders.map((c, j) => (
                    <View
                      key={j}
                      style={j % 2 === 1 ? styles.tableRowAlt : styles.tableRow}
                    >
                      <Text style={[styles.tableCell, { width: 60 }]}>
                        {c.cylinderNumber}
                      </Text>
                      <Text style={[styles.tableCell, { width: 60 }]}>
                        {c.breakAgeDays} day
                      </Text>
                      <Text style={[styles.tableCell, { width: 80 }]}>
                        {c.strengthPsi ?? "Pending"}
                      </Text>
                      <Text style={[styles.tableCell, { flex: 1 }]}>
                        {c.fractureType ?? "\u2014"}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </View>
        </>
      )}
    </View>
  );
}
