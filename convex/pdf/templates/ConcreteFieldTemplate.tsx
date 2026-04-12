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

function CylinderStrengthChart({
  cylinderSets,
  specStrength,
}: {
  cylinderSets: CylinderData[];
  specStrength?: number;
}) {
  const bars: { label: string; strength: number }[] = [];
  for (const set of cylinderSets) {
    for (const c of set.cylinders) {
      if (c.strengthPsi != null) {
        bars.push({
          label: `${set.setLabel} / #${c.cylinderNumber} (${c.breakAgeDays}d)`,
          strength: c.strengthPsi,
        });
      }
    }
  }
  if (bars.length === 0) return null;

  const LABEL_W = 110;
  const CHART_W = 270;
  const BAR_H = 14;
  const BAR_GAP = 4;
  const PAD_T = 6;
  const PAD_B = 4;
  const H = PAD_T + bars.length * (BAR_H + BAR_GAP) + PAD_B;
  const maxVal = Math.max(...bars.map((b) => b.strength), specStrength ?? 0, 1);
  const ceil = Math.ceil(maxVal / 1000) * 1000;

  const scaleX = (v: number) => (v / ceil) * CHART_W;

  const tickFracs = [0, 0.25, 0.5, 0.75, 1];

  return (
    <View style={{ marginTop: 10 }}>
      <Text style={styles.sectionHeader}>Cylinder Break Strength</Text>

      <View style={{ flexDirection: "row" }}>
        {/* Y-axis labels */}
        <View style={{ width: LABEL_W, paddingTop: PAD_T }}>
          {bars.map((b, i) => (
            <View
              key={i}
              style={{
                height: BAR_H + BAR_GAP,
                justifyContent: "center",
              }}
            >
              <Text style={{ fontSize: 6, color: "#666" }}>{b.label}</Text>
            </View>
          ))}
        </View>

        {/* SVG chart area */}
        <Svg width={CHART_W} height={H} viewBox={`0 0 ${CHART_W} ${H}`}>
          {/* Vertical grid lines */}
          {tickFracs.map((frac, idx) => {
            const x = scaleX(frac * ceil);
            return (
              <Line
                key={idx}
                x1={x}
                y1={0}
                x2={x}
                y2={H}
                stroke="#e5e5e5"
                strokeWidth={0.5}
              />
            );
          })}

          {/* Spec requirement line */}
          {specStrength != null && specStrength > 0 && (
            <Line
              x1={scaleX(specStrength)}
              y1={0}
              x2={scaleX(specStrength)}
              y2={H}
              stroke="#dc2626"
              strokeWidth={0.75}
              strokeDasharray="4,3"
            />
          )}

          {/* Data bars */}
          {bars.map((b, i) => {
            const y = PAD_T + i * (BAR_H + BAR_GAP);
            const barW = Math.max(scaleX(b.strength), 1);
            const meetsSpec = !specStrength || b.strength >= specStrength;
            return (
              <Rect
                key={i}
                x={0}
                y={y}
                width={barW}
                height={BAR_H}
                fill={meetsSpec ? ACCENT : "#dc2626"}
                rx={2}
              />
            );
          })}
        </Svg>
      </View>

      {/* X-axis tick labels */}
      <View
        style={{
          flexDirection: "row",
          marginLeft: LABEL_W,
          width: CHART_W,
          justifyContent: "space-between",
          marginTop: 1,
        }}
      >
        <Text style={{ fontSize: 6, color: "#888" }}>0</Text>
        <Text style={{ fontSize: 6, color: "#888" }}>
          {Math.round(ceil * 0.25)}
        </Text>
        <Text style={{ fontSize: 6, color: "#888" }}>
          {Math.round(ceil * 0.5)}
        </Text>
        <Text style={{ fontSize: 6, color: "#888" }}>
          {Math.round(ceil * 0.75)}
        </Text>
        <Text style={{ fontSize: 6, color: "#888" }}>{ceil} psi</Text>
      </View>

      {/* Legend */}
      <View style={{ flexDirection: "row", marginTop: 6, marginLeft: LABEL_W }}>
        <View style={{ flexDirection: "row", alignItems: "center", marginRight: 14 }}>
          <Svg width={10} height={8} viewBox="0 0 10 8">
            <Rect x={0} y={0} width={10} height={8} fill={ACCENT} rx={1} />
          </Svg>
          <Text style={{ fontSize: 6, color: "#666", marginLeft: 3 }}>
            Meets Spec
          </Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", marginRight: 14 }}>
          <Svg width={10} height={8} viewBox="0 0 10 8">
            <Rect x={0} y={0} width={10} height={8} fill="#dc2626" rx={1} />
          </Svg>
          <Text style={{ fontSize: 6, color: "#666", marginLeft: 3 }}>
            Below Spec
          </Text>
        </View>
        {specStrength != null && specStrength > 0 && (
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Svg width={14} height={8} viewBox="0 0 14 8">
              <Line
                x1={7}
                y1={0}
                x2={7}
                y2={8}
                stroke="#dc2626"
                strokeWidth={0.75}
                strokeDasharray="2,1"
              />
            </Svg>
            <Text style={{ fontSize: 6, color: "#666", marginLeft: 3 }}>
              Spec Min ({specStrength} psi)
            </Text>
          </View>
        )}
      </View>
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

      {/* Cylinder Strength Chart */}
      <CylinderStrengthChart
        cylinderSets={cylinderSets}
        specStrength={specZone?.specMinConcreteStrengthPsi}
      />
    </View>
  );
}
