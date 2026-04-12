import { useState, useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id, Doc } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2 } from "lucide-react";

type Props = {
  reportId: Id<"reports">;
  readings: Doc<"nuclearDensityReadings">[];
  readOnly?: boolean;
  /** Pre-fill from the selected Proctor curve. */
  defaultMdd?: number;
  defaultOmc?: number;
};

export function DensityReadingsEditor({ reportId, readings, readOnly, defaultMdd, defaultOmc }: Props) {
  const addReading = useMutation(api.reports.densityReadings.addReading);
  const removeReading = useMutation(api.reports.densityReadings.removeReading);
  const [form, setForm] = useState({
    testNumber: `N-${readings.length + 1}`,
    station: "",
    depthInches: "6",
    wetDensityPcf: "",
    moisturePct: "",
    dryDensityPcf: "",
    maxDryDensityPcf: defaultMdd?.toString() ?? "",
    optimumMoisturePct: defaultOmc?.toString() ?? "",
  });

  // Update MDD/OMC when Proctor selection changes (but don't overwrite if tech manually edited)
  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      maxDryDensityPcf: defaultMdd?.toString() ?? prev.maxDryDensityPcf,
      optimumMoisturePct: defaultOmc?.toString() ?? prev.optimumMoisturePct,
    }));
  }, [defaultMdd, defaultOmc]);

  return (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        Density Readings
      </h3>
      {readings.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-xs text-muted-foreground">
                <th className="text-left py-1 pr-2">Test #</th>
                <th className="text-left py-1 pr-2">Station</th>
                <th className="text-right py-1 pr-2">Depth (in)</th>
                <th className="text-right py-1 pr-2">Wet (pcf)</th>
                <th className="text-right py-1 pr-2">Moist %</th>
                <th className="text-right py-1 pr-2">Dry (pcf)</th>
                <th className="text-right py-1 pr-2">Compact %</th>
                <th className="text-center py-1 pr-2">P/F</th>
                {!readOnly && <th className="w-8" />}
              </tr>
            </thead>
            <tbody>
              {readings.map((r) => (
                <tr key={r._id} className="border-b">
                  <td className="py-1 pr-2 font-mono">{r.testNumber}</td>
                  <td className="py-1 pr-2">{r.station ?? "—"}</td>
                  <td className="py-1 pr-2 text-right">{r.depthInches}</td>
                  <td className="py-1 pr-2 text-right">{r.wetDensityPcf}</td>
                  <td className="py-1 pr-2 text-right">{r.moisturePct}</td>
                  <td className="py-1 pr-2 text-right">{r.dryDensityPcf}</td>
                  <td className="py-1 pr-2 text-right">{r.compactionPct}%</td>
                  <td className="py-1 pr-2 text-center">
                    <Badge variant={r.passed ? "default" : "destructive"} className="text-xs">
                      {r.passed ? "Pass" : "Fail"}
                    </Badge>
                  </td>
                  {!readOnly && (
                    <td>
                      <Button variant="ghost" size="icon" className="h-6 w-6"
                        onClick={() => void removeReading({ readingId: r._id })}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {!readOnly && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
          <div className="space-y-1">
            <Label className="text-xs">Test #</Label>
            <Input className="h-8 text-sm" value={form.testNumber}
              onChange={(e) => setForm({ ...form, testNumber: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Station</Label>
            <Input className="h-8 text-sm" value={form.station}
              onChange={(e) => setForm({ ...form, station: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Depth (in)</Label>
            <Input className="h-8 text-sm" inputMode="decimal" value={form.depthInches}
              onChange={(e) => setForm({ ...form, depthInches: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Wet density (pcf)</Label>
            <Input className="h-8 text-sm" inputMode="decimal" value={form.wetDensityPcf}
              onChange={(e) => setForm({ ...form, wetDensityPcf: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Moisture %</Label>
            <Input className="h-8 text-sm" inputMode="decimal" value={form.moisturePct}
              onChange={(e) => setForm({ ...form, moisturePct: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Dry density (pcf)</Label>
            <Input className="h-8 text-sm" inputMode="decimal" value={form.dryDensityPcf}
              onChange={(e) => setForm({ ...form, dryDensityPcf: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Max dry (pcf)</Label>
            <Input className="h-8 text-sm" inputMode="decimal" value={form.maxDryDensityPcf}
              onChange={(e) => setForm({ ...form, maxDryDensityPcf: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Opt moisture %</Label>
            <Input className="h-8 text-sm" inputMode="decimal" value={form.optimumMoisturePct}
              onChange={(e) => setForm({ ...form, optimumMoisturePct: e.target.value })} />
          </div>
          <div className="col-span-2 sm:col-span-4">
            <Button type="button" size="sm" onClick={() => {
              void addReading({
                reportId,
                testNumber: form.testNumber,
                station: form.station || undefined,
                depthInches: parseFloat(form.depthInches) || 6,
                wetDensityPcf: parseFloat(form.wetDensityPcf) || 0,
                moisturePct: parseFloat(form.moisturePct) || 0,
                dryDensityPcf: parseFloat(form.dryDensityPcf) || 0,
                maxDryDensityPcf: parseFloat(form.maxDryDensityPcf) || 0,
                optimumMoisturePct: parseFloat(form.optimumMoisturePct) || 0,
              }).then(() => {
                const num = parseInt(form.testNumber.replace(/\D/g, ""), 10) || readings.length;
                setForm({ ...form, testNumber: `N-${num + 1}`, station: "", wetDensityPcf: "",
                  moisturePct: "", dryDensityPcf: "" });
              });
            }}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Add reading
            </Button>
          </div>
        </div>
      )}
      {readings.length === 0 && readOnly && (
        <p className="text-sm text-muted-foreground">No density readings recorded.</p>
      )}
    </section>
  );
}
