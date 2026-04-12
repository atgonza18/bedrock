"use node";

import React from "react";
import { View, Text, Svg, Line, Circle, StyleSheet } from "@react-pdf/renderer";

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
  fieldValueRow: {
    flexDirection: "row",
    alignItems: "center",
  },

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

  // Chart
  chartContainer: { marginTop: 8, marginBottom: 8 },
  chartTitle: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#555",
    marginBottom: 4,
  },
});

type Props = {
  detail: Record<string, any>;
  pileLoadIncrements: any[];
  weather?: any;
  locationNote?: string;
  stationFrom?: string;
  stationTo?: string;
  pileTypeInfo?: { name: string; color: string } | null;
  specZone?: { name: string; specPileDesignLoadKips?: number } | null;
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

export function PileLoadContent({
  detail,
  pileLoadIncrements,
  weather,
  locationNote,
  stationFrom,
  stationTo,
  pileTypeInfo,
  specZone,
}: Props) {
  const passes =
    specZone?.specPileDesignLoadKips && detail.maxLoadKips
      ? detail.maxLoadKips >= specZone.specPileDesignLoadKips
      : null;

  return (
    <View>
      {/* Pile Identification */}
      <View style={styles.section}>
        <Text style={styles.sectionHeader}>Pile Identification</Text>
        <View style={styles.fieldGrid}>
          <FieldPair label="Pile ID" value={detail.pileId} />
          <FieldPair
            label="Block / Row / Pile"
            value={
              [detail.blockNumber, detail.rowNumber, detail.pileNumber]
                .filter(Boolean)
                .join(" / ") || null
            }
          />
          {pileTypeInfo ? (
            <View style={styles.fieldPair}>
              <Text style={styles.fieldLabel}>PILE TYPE</Text>
              <View style={styles.fieldValueRow}>
                <Svg width={8} height={8} viewBox="0 0 8 8">
                  <Circle cx={4} cy={4} r={4} fill={pileTypeInfo.color} />
                </Svg>
                <Text style={[styles.fieldValue, { marginLeft: 4 }]}>
                  {pileTypeInfo.name}
                </Text>
              </View>
            </View>
          ) : (
            <FieldPair label="Pile Type" value={detail.pileType} />
          )}
          <FieldPair label="Installed Length (ft)" value={detail.installedLength} />
        </View>
      </View>

      <View style={styles.divider} />

      {/* Test Configuration */}
      <View style={styles.section}>
        <Text style={styles.sectionHeader}>Test Configuration</Text>
        <View style={styles.fieldGrid}>
          <FieldPair
            label="Load Direction"
            value={
              detail.loadDirection === "axial_compression"
                ? "Axial Compression (D1143)"
                : detail.loadDirection === "axial_tension"
                  ? "Axial Tension / Uplift (D3689)"
                  : detail.loadDirection === "lateral"
                    ? "Lateral (D3966)"
                    : detail.loadDirection
            }
          />
          <FieldPair
            label="Test Method"
            value={
              detail.testMethod === "static"
                ? "Static"
                : detail.testMethod === "dynamic"
                  ? "Dynamic (PDA)"
                  : detail.testMethod === "statnamic"
                    ? "Statnamic (Rapid)"
                    : detail.testMethod
            }
          />
          <FieldPair label="Design Load (kips)" value={detail.designLoadKips} />
          <FieldPair label="Max Load (kips)" value={detail.maxLoadKips} />
          <FieldFull label="Failure Criterion" value={detail.failureCriterionNotes} />
        </View>
      </View>

      {/* Results */}
      <View style={styles.section}>
        <Text style={styles.sectionHeader}>Results</Text>
        <View style={styles.fieldGrid}>
          <FieldPair label="Result" value={detail.result} />
        </View>
        {passes !== null && (
          <View style={passes ? styles.passBox : styles.failBox}>
            <Text style={passes ? styles.passText : styles.failText}>
              {passes ? "PASS" : "FAIL"} \u2014 {detail.maxLoadKips} kips vs{" "}
              {specZone!.specPileDesignLoadKips} kips required
            </Text>
          </View>
        )}
      </View>

      {/* Load Increments Table */}
      {pileLoadIncrements.length > 0 && (
        <>
          <View style={styles.divider} />
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>Load Increments</Text>
            <View style={styles.tableContainer}>
              <View style={styles.tableHeaderRow}>
                <Text style={[styles.tableHeaderCell, { width: 30 }]}>#</Text>
                <Text style={[styles.tableHeaderCell, { width: 70 }]}>
                  Load (kips)
                </Text>
                <Text style={[styles.tableHeaderCell, { width: 60 }]}>
                  Held (min)
                </Text>
                <Text style={[styles.tableHeaderCell, { width: 80 }]}>
                  Settlement (in)
                </Text>
              </View>
              {pileLoadIncrements.map((inc: any, i: number) => (
                <View
                  key={i}
                  style={i % 2 === 1 ? styles.tableRowAlt : styles.tableRow}
                >
                  <Text style={[styles.tableCell, { width: 30 }]}>
                    {inc.sequence}
                  </Text>
                  <Text style={[styles.tableCell, { width: 70 }]}>
                    {inc.loadKips}
                  </Text>
                  <Text style={[styles.tableCell, { width: 60 }]}>
                    {inc.heldForMinutes}
                  </Text>
                  <Text style={[styles.tableCell, { width: 80 }]}>
                    {inc.netSettlementIn}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* Load-Settlement Chart */}
          <View style={styles.chartContainer}>
            <Text style={styles.chartTitle}>Load-Settlement Curve</Text>
            <LoadSettlementChart increments={pileLoadIncrements} />
          </View>
        </>
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
    </View>
  );
}

/** Simple SVG scatter plot of load (x) vs settlement (y, inverted). */
function LoadSettlementChart({ increments }: { increments: any[] }) {
  if (increments.length < 2) return null;

  const W = 340;
  const H = 160;
  const PAD_L = 40;
  const PAD_R = 15;
  const PAD_T = 15;
  const PAD_B = 25;

  const loads = increments.map((i: any) => i.loadKips as number);
  const settlements = increments.map((i: any) => i.netSettlementIn as number);
  const maxLoad = Math.max(...loads, 1);
  const maxSettlement = Math.max(...settlements, 0.01);

  const scaleX = (v: number) => PAD_L + (v / maxLoad) * (W - PAD_L - PAD_R);
  const scaleY = (v: number) => PAD_T + (v / maxSettlement) * (H - PAD_T - PAD_B);

  return (
    <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      {/* Grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
        const x = PAD_L + frac * (W - PAD_L - PAD_R);
        return (
          <Line
            key={`gx-${frac}`}
            x1={x}
            y1={PAD_T}
            x2={x}
            y2={H - PAD_B}
            stroke="#eee"
            strokeWidth={0.5}
          />
        );
      })}
      {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
        const y = PAD_T + frac * (H - PAD_T - PAD_B);
        return (
          <Line
            key={`gy-${frac}`}
            x1={PAD_L}
            y1={y}
            x2={W - PAD_R}
            y2={y}
            stroke="#eee"
            strokeWidth={0.5}
          />
        );
      })}
      {/* Axes */}
      <Line
        x1={PAD_L}
        y1={PAD_T}
        x2={PAD_L}
        y2={H - PAD_B}
        stroke="#999"
        strokeWidth={0.75}
      />
      <Line
        x1={PAD_L}
        y1={PAD_T}
        x2={W - PAD_R}
        y2={PAD_T}
        stroke="#999"
        strokeWidth={0.75}
      />
      {/* Data points + lines */}
      {increments.map((inc: any, idx: number) => {
        const x = scaleX(inc.loadKips);
        const y = scaleY(inc.netSettlementIn);
        const prev = idx > 0 ? increments[idx - 1] : null;
        return (
          <React.Fragment key={idx}>
            {prev && (
              <Line
                x1={scaleX(prev.loadKips)}
                y1={scaleY(prev.netSettlementIn)}
                x2={x}
                y2={y}
                stroke={ACCENT}
                strokeWidth={1.25}
              />
            )}
            <Circle cx={x} cy={y} r={2.5} fill={ACCENT} />
          </React.Fragment>
        );
      })}
    </Svg>
  );
}
