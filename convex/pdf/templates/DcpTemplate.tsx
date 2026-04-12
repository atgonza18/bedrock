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

function DepthCbrChart({ layers }: { layers: any[] }) {
  const validLayers: {
    fromIn: number;
    toIn: number;
    cbr: number;
  }[] = [];
  for (const l of layers) {
    if (
      l.fromDepthIn != null &&
      l.toDepthIn != null &&
      l.estimatedCbrPct != null
    ) {
      validLayers.push({
        fromIn: l.fromDepthIn,
        toIn: l.toDepthIn,
        cbr: l.estimatedCbrPct,
      });
    }
  }
  if (validLayers.length === 0) return null;

  const W = 380;
  const LABEL_COL = 32;
  const PAD_T = 10;
  const PAD_B = 8;
  const PAD_R = 10;
  const PLOT_W = W - LABEL_COL - PAD_R;

  const maxDepth = Math.max(...validLayers.map((l) => l.toIn));
  const maxCbr = Math.max(...validLayers.map((l) => l.cbr), 1);
  const cbrCeil = Math.ceil(maxCbr / 10) * 10 || 10;
  const depthCeil = Math.ceil(maxDepth);

  const DEPTH_SCALE = 4;
  const minPlotH = 140;
  const PLOT_H = Math.max(depthCeil * DEPTH_SCALE, minPlotH);
  const SVG_H = PAD_T + PLOT_H + PAD_B;

  const scaleY = (depthIn: number) => PAD_T + (depthIn / depthCeil) * PLOT_H;
  const scaleX = (cbr: number) => (cbr / cbrCeil) * PLOT_W;

  const xTicks = [0, 0.25, 0.5, 0.75, 1];
  const depthTicks: number[] = [];
  const depthStep = Math.max(1, Math.round(depthCeil / 6));
  for (let d = 0; d <= depthCeil; d += depthStep) {
    depthTicks.push(d);
  }
  if (!depthTicks.includes(depthCeil)) depthTicks.push(depthCeil);

  return (
    <View style={{ marginTop: 10 }}>
      <Text style={styles.sectionHeader}>Depth vs Estimated CBR</Text>

      <View style={{ flexDirection: "row" }}>
        {/* Y-axis depth labels */}
        <View style={{ width: LABEL_COL, height: SVG_H }}>
          {depthTicks.map((d, idx) => (
            <Text
              key={idx}
              style={{
                fontSize: 6,
                color: "#888",
                position: "absolute",
                top: scaleY(d) - 4,
                right: 3,
              }}
            >
              {d}"
            </Text>
          ))}
        </View>

        {/* SVG chart */}
        <Svg
          width={PLOT_W + PAD_R}
          height={SVG_H}
          viewBox={`0 0 ${PLOT_W + PAD_R} ${SVG_H}`}
        >
          {/* Vertical grid lines */}
          {xTicks.map((frac, idx) => {
            const x = scaleX(frac * cbrCeil);
            return (
              <Line
                key={idx}
                x1={x}
                y1={PAD_T}
                x2={x}
                y2={PAD_T + PLOT_H}
                stroke="#e5e5e5"
                strokeWidth={0.5}
              />
            );
          })}

          {/* Horizontal grid lines at depth ticks */}
          {depthTicks.map((d, idx) => (
            <Line
              key={idx}
              x1={0}
              y1={scaleY(d)}
              x2={PLOT_W}
              y2={scaleY(d)}
              stroke="#e5e5e5"
              strokeWidth={0.5}
            />
          ))}

          {/* Axis lines */}
          <Line
            x1={0}
            y1={PAD_T}
            x2={0}
            y2={PAD_T + PLOT_H}
            stroke="#999"
            strokeWidth={0.75}
          />
          <Line
            x1={0}
            y1={PAD_T}
            x2={PLOT_W}
            y2={PAD_T}
            stroke="#999"
            strokeWidth={0.75}
          />

          {/* Layer bars — horizontal bars at each depth range */}
          {validLayers.map((l, i) => {
            const yTop = scaleY(l.fromIn);
            const yBot = scaleY(l.toIn);
            const h = yBot - yTop;
            const barW = Math.max(scaleX(l.cbr), 1);
            return (
              <Rect
                key={i}
                x={0}
                y={yTop}
                width={barW}
                height={Math.max(h, 2)}
                fill={ACCENT}
                opacity={0.85}
              />
            );
          })}
        </Svg>
      </View>

      {/* X-axis labels (CBR values) */}
      <View
        style={{
          flexDirection: "row",
          marginLeft: LABEL_COL,
          width: PLOT_W,
          justifyContent: "space-between",
          marginTop: 1,
        }}
      >
        {xTicks.map((frac, idx) => (
          <Text key={idx} style={{ fontSize: 6, color: "#888" }}>
            {Math.round(frac * cbrCeil)}
            {idx === xTicks.length - 1 ? "% CBR" : ""}
          </Text>
        ))}
      </View>

      {/* Legend */}
      <View style={{ flexDirection: "row", marginTop: 6, marginLeft: LABEL_COL }}>
        <View
          style={{ flexDirection: "row", alignItems: "center", marginRight: 14 }}
        >
          <Svg width={10} height={8} viewBox="0 0 10 8">
            <Rect x={0} y={0} width={10} height={8} fill={ACCENT} opacity={0.85} rx={1} />
          </Svg>
          <Text style={{ fontSize: 6, color: "#666", marginLeft: 3 }}>
            Estimated CBR at Depth
          </Text>
        </View>
      </View>

      {/* Axis labels */}
      <View style={{ flexDirection: "row", marginTop: 3, marginLeft: LABEL_COL }}>
        <Text style={{ fontSize: 6, color: "#888" }}>
          Y-axis: depth (inches) | X-axis: estimated CBR (%)
        </Text>
      </View>
    </View>
  );
}

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

          {/* Depth vs CBR Chart */}
          <DepthCbrChart layers={dcpLayers} />

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
