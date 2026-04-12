"use node";

import { View, Text, Svg, Line, Rect, StyleSheet } from "@react-pdf/renderer";

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

function CompactionChart({
  readings,
  specMin,
}: {
  readings: any[];
  specMin?: number;
}) {
  const bars: { label: string; pct: number }[] = [];
  for (const r of readings) {
    if (r.compactionPct != null) {
      bars.push({
        label: String(r.testNumber ?? bars.length + 1),
        pct: r.compactionPct,
      });
    }
  }
  if (bars.length === 0) return null;

  const W = 380;
  const CHART_H = 120;
  const PAD_T = 8;
  const PAD_B = 4;
  const PAD_L = 30;
  const PAD_R = 10;
  const PLOT_W = W - PAD_L - PAD_R;
  const PLOT_H = CHART_H - PAD_T - PAD_B;
  const SVG_H = CHART_H;

  const allVals = bars.map((b) => b.pct);
  const rawMin = Math.min(...allVals, specMin ?? 100);
  const rawMax = Math.max(...allVals, specMin ?? 0);
  const yMin = Math.floor(Math.min(rawMin - 2, 85));
  const yMax = Math.ceil(Math.max(rawMax + 2, 105));
  const yRange = yMax - yMin || 1;

  const barCount = bars.length;
  const barMaxW = PLOT_W / barCount;
  const barW = Math.min(barMaxW * 0.7, 30);
  const barSpacing = PLOT_W / barCount;

  const scaleY = (v: number) => PAD_T + PLOT_H - ((v - yMin) / yRange) * PLOT_H;

  const yTicks: number[] = [];
  for (let v = Math.ceil(yMin); v <= Math.floor(yMax); v += Math.max(1, Math.round(yRange / 5))) {
    yTicks.push(v);
  }
  if (!yTicks.includes(yMax)) yTicks.push(yMax);

  return (
    <View style={{ marginTop: 10 }}>
      <Text style={styles.sectionHeader}>Compaction Summary</Text>

      <View style={{ flexDirection: "row" }}>
        {/* Y-axis labels */}
        <View style={{ width: PAD_L, height: SVG_H }}>
          {yTicks.map((v, idx) => (
            <Text
              key={idx}
              style={{
                fontSize: 6,
                color: "#888",
                position: "absolute",
                top: scaleY(v) - 4,
                right: 3,
              }}
            >
              {v}%
            </Text>
          ))}
        </View>

        {/* SVG chart */}
        <Svg
          width={PLOT_W + PAD_R}
          height={SVG_H}
          viewBox={`0 0 ${PLOT_W + PAD_R} ${SVG_H}`}
        >
          {/* Horizontal grid lines */}
          {yTicks.map((v, idx) => (
            <Line
              key={idx}
              x1={0}
              y1={scaleY(v)}
              x2={PLOT_W}
              y2={scaleY(v)}
              stroke="#e5e5e5"
              strokeWidth={0.5}
            />
          ))}

          {/* Spec minimum line */}
          {specMin != null && specMin > 0 && (
            <Line
              x1={0}
              y1={scaleY(specMin)}
              x2={PLOT_W}
              y2={scaleY(specMin)}
              stroke="#dc2626"
              strokeWidth={0.75}
              strokeDasharray="4,3"
            />
          )}

          {/* Vertical bars */}
          {bars.map((b, i) => {
            const cx = i * barSpacing + barSpacing / 2;
            const x = cx - barW / 2;
            const yTop = scaleY(b.pct);
            const yBottom = scaleY(yMin);
            const h = yBottom - yTop;
            const meetsSpec = !specMin || b.pct >= specMin;
            return (
              <Rect
                key={i}
                x={x}
                y={yTop}
                width={barW}
                height={Math.max(h, 1)}
                fill={meetsSpec ? ACCENT : "#dc2626"}
                rx={2}
              />
            );
          })}
        </Svg>
      </View>

      {/* X-axis labels */}
      <View
        style={{
          flexDirection: "row",
          marginLeft: PAD_L,
          width: PLOT_W,
        }}
      >
        {bars.map((b, i) => (
          <View
            key={i}
            style={{
              width: barSpacing,
              alignItems: "center",
            }}
          >
            <Text style={{ fontSize: 6, color: "#888" }}>#{b.label}</Text>
          </View>
        ))}
      </View>

      {/* Legend */}
      <View style={{ flexDirection: "row", marginTop: 6, marginLeft: PAD_L }}>
        <View
          style={{ flexDirection: "row", alignItems: "center", marginRight: 14 }}
        >
          <Svg width={10} height={8} viewBox="0 0 10 8">
            <Rect x={0} y={0} width={10} height={8} fill={ACCENT} rx={1} />
          </Svg>
          <Text style={{ fontSize: 6, color: "#666", marginLeft: 3 }}>
            Meets Spec
          </Text>
        </View>
        <View
          style={{ flexDirection: "row", alignItems: "center", marginRight: 14 }}
        >
          <Svg width={10} height={8} viewBox="0 0 10 8">
            <Rect x={0} y={0} width={10} height={8} fill="#dc2626" rx={1} />
          </Svg>
          <Text style={{ fontSize: 6, color: "#666", marginLeft: 3 }}>
            Below Spec
          </Text>
        </View>
        {specMin != null && specMin > 0 && (
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Svg width={14} height={8} viewBox="0 0 14 8">
              <Line
                x1={0}
                y1={4}
                x2={14}
                y2={4}
                stroke="#dc2626"
                strokeWidth={0.75}
                strokeDasharray="2,1"
              />
            </Svg>
            <Text style={{ fontSize: 6, color: "#666", marginLeft: 3 }}>
              Spec Min ({specMin}%)
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

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

          {/* Compaction Chart */}
          <CompactionChart
            readings={densityReadings}
            specMin={specZone?.specMinCompactionPct}
          />

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
