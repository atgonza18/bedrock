"use node";

import React from "react";
import { View, Text, Image, StyleSheet } from "@react-pdf/renderer";
import {
  parseTemplateFields,
  parseFieldValues,
  type TemplateField,
  type FieldValue,
  type TableColumn,
} from "../../lib/customTemplates";

const ACCENT = "#c89340";

const styles = StyleSheet.create({
  section: { marginBottom: 14 },
  sectionHeader: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: "#1a1a1a",
    marginBottom: 6,
    paddingBottom: 3,
    borderBottom: `1.5 solid ${ACCENT}`,
  },
  subHeader: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#555",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 6,
    marginTop: 4,
  },

  fieldRow: { flexDirection: "row", marginBottom: 6, alignItems: "flex-start" },
  fieldLabel: {
    fontSize: 8,
    color: "#888",
    width: "34%",
    paddingTop: 1,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  fieldValue: {
    fontSize: 9,
    color: "#1a1a1a",
    flex: 1,
  },

  divider: { borderBottom: "0.5 solid #e0e0e0", marginVertical: 8 },

  // Pass/fail pills
  passPill: {
    alignSelf: "flex-start",
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#16a34a",
    backgroundColor: "#ecfdf5",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 2,
  },
  failPill: {
    alignSelf: "flex-start",
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#dc2626",
    backgroundColor: "#fef2f2",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 2,
  },
  naPill: {
    alignSelf: "flex-start",
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#6b7280",
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 2,
  },

  // Tables
  table: { borderTop: "0.5 solid #ccc", borderLeft: "0.5 solid #ccc" },
  tableRow: { flexDirection: "row" },
  tableHeadCell: {
    padding: 4,
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: "#555",
    backgroundColor: "#f6f6f6",
    borderRight: "0.5 solid #ccc",
    borderBottom: "0.5 solid #ccc",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  tableCell: {
    padding: 4,
    fontSize: 8,
    color: "#1a1a1a",
    borderRight: "0.5 solid #ccc",
    borderBottom: "0.5 solid #ccc",
  },

  // Photos
  photoRow: { flexDirection: "row", flexWrap: "wrap", gap: 4 },
  photo: { width: 96, height: 96, objectFit: "cover", border: "0.5 solid #e0e0e0" },
});

type Props = {
  detail: Record<string, any>;
  weather?: any;
  locationNote?: string;
  stationFrom?: string;
  stationTo?: string;
  specZone?: { name: string } | null;
  /** Signed URLs keyed by storageId for any photo values in this response. */
  customPhotoUrls?: Record<string, string>;
};

export function CustomTestContent({
  detail,
  weather,
  locationNote,
  stationFrom,
  stationTo,
  specZone,
  customPhotoUrls,
}: Props) {
  let fields: TemplateField[] = [];
  let values: Record<string, FieldValue> = {};
  try {
    fields = parseTemplateFields(detail.templateFieldsJson ?? "[]");
  } catch {
    fields = [];
  }
  try {
    values = parseFieldValues(detail.valuesJson ?? "{}");
  } catch {
    values = {};
  }

  return (
    <View>
      <View style={styles.section}>
        <Text style={styles.sectionHeader}>
          {detail.templateNameAtCreation ?? "Custom Test"}
        </Text>
        {fields.length === 0 ? (
          <Text style={{ fontSize: 9, color: "#888" }}>
            No fields on this template.
          </Text>
        ) : (
          fields.map((f) =>
            renderField(f, values[f.id], customPhotoUrls),
          )
        )}
      </View>

      <View style={styles.divider} />

      <View style={styles.section}>
        <Text style={styles.sectionHeader}>Site Conditions</Text>
        <Kv label="Temperature" value={weather?.tempF ? `${weather.tempF} °F` : null} />
        <Kv label="Conditions" value={weather?.conditions} />
        <Kv label="Wind" value={weather?.windMph ? `${weather.windMph} mph` : null} />
        <Kv label="Station from" value={stationFrom} />
        <Kv label="Station to" value={stationTo} />
        <Kv label="Location note" value={locationNote} />
        {specZone && <Kv label="Test zone" value={specZone.name} />}
      </View>
    </View>
  );
}

function renderField(
  field: TemplateField,
  value: FieldValue | undefined,
  photoUrls: Record<string, string> | undefined,
): React.ReactElement {
  if (field.kind === "heading") {
    return (
      <Text key={field.id} style={styles.subHeader}>
        {field.text || "Section"}
      </Text>
    );
  }
  if (field.kind === "table") {
    const rows = value?.kind === "table" ? value.rows : [];
    return (
      <View key={field.id} style={{ marginBottom: 10 }}>
        <Text style={[styles.fieldLabel, { width: "100%", marginBottom: 4 }]}>
          {field.label}
        </Text>
        <View style={styles.table}>
          <View style={styles.tableRow}>
            {field.columns.map((c) => (
              <Text
                key={c.id}
                style={[styles.tableHeadCell, { flex: 1 }]}
              >
                {c.label}
                {c.kind === "number" && "unit" in c && c.unit
                  ? ` (${c.unit})`
                  : ""}
              </Text>
            ))}
          </View>
          {rows.length === 0 ? (
            <View style={styles.tableRow}>
              <Text
                style={[
                  styles.tableCell,
                  { flex: 1, color: "#888", fontStyle: "italic" },
                ]}
              >
                No rows
              </Text>
            </View>
          ) : (
            rows.map((row, i) => (
              <View key={i} style={styles.tableRow}>
                {field.columns.map((c) => (
                  <Text key={c.id} style={[styles.tableCell, { flex: 1 }]}>
                    {formatTableCell(c, row[c.id])}
                  </Text>
                ))}
              </View>
            ))
          )}
        </View>
      </View>
    );
  }
  if (field.kind === "photo") {
    const ids = value?.kind === "photo" ? value.storageIds : [];
    const urls = ids
      .map((sid) => photoUrls?.[sid])
      .filter((u): u is string => Boolean(u));
    if (urls.length === 0 && !field.required) return <View key={field.id} />;
    return (
      <View key={field.id} style={{ marginBottom: 10 }}>
        <Text style={[styles.fieldLabel, { width: "100%", marginBottom: 4 }]}>
          {field.label}
        </Text>
        {urls.length === 0 ? (
          <Text style={{ fontSize: 8, color: "#888" }}>No photos.</Text>
        ) : (
          <View style={styles.photoRow}>
            {urls.map((u) => (
              <Image key={u} src={u} style={styles.photo} />
            ))}
          </View>
        )}
      </View>
    );
  }

  const rendered = renderScalar(field, value);
  return (
    <View key={field.id} style={styles.fieldRow}>
      <Text style={styles.fieldLabel}>{field.label}</Text>
      {typeof rendered === "string" ? (
        <Text style={styles.fieldValue}>{rendered || "\u2014"}</Text>
      ) : (
        rendered ?? <Text style={styles.fieldValue}>—</Text>
      )}
    </View>
  );
}

function renderScalar(
  field: Exclude<TemplateField, { kind: "heading" | "table" | "photo" }>,
  value: FieldValue | undefined,
): React.ReactElement | string {
  switch (field.kind) {
    case "text":
      return value?.kind === "text" ? value.value : "";
    case "textarea":
      return value?.kind === "textarea" ? value.value : "";
    case "number": {
      const n = value?.kind === "number" ? value.value : null;
      if (n === null || n === undefined) return "";
      return field.unit ? `${n} ${field.unit}` : String(n);
    }
    case "date": {
      const t = value?.kind === "date" ? value.value : null;
      if (!t) return "";
      return new Date(t).toLocaleDateString("en-US");
    }
    case "select":
      return value?.kind === "select" ? value.value ?? "" : "";
    case "checkbox":
      return value?.kind === "checkbox" && value.value ? "Yes" : "No";
    case "passfail": {
      const v = value?.kind === "passfail" ? value.value : null;
      if (v === "pass")
        return <Text style={styles.passPill}>PASS</Text>;
      if (v === "fail")
        return <Text style={styles.failPill}>FAIL</Text>;
      if (v === "na") return <Text style={styles.naPill}>N/A</Text>;
      return "";
    }
  }
}

function formatTableCell(col: TableColumn, raw: unknown): string {
  switch (col.kind) {
    case "text":
    case "select":
      return typeof raw === "string" ? raw : "";
    case "number":
      if (typeof raw !== "number" || Number.isNaN(raw)) return "";
      return String(raw);
    case "date":
      if (typeof raw !== "number" || raw <= 0) return "";
      return new Date(raw).toLocaleDateString("en-US");
    case "checkbox":
      return raw ? "✓" : "—";
    case "passfail":
      if (raw === "pass") return "Pass";
      if (raw === "fail") return "Fail";
      if (raw === "na") return "N/A";
      return "";
  }
}

function Kv({ label, value }: { label: string; value: any }) {
  if (!value) return null;
  return (
    <View style={styles.fieldRow}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldValue}>{String(value)}</Text>
    </View>
  );
}
