import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id, Doc } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2 } from "lucide-react";

type Props = {
  reportId: Id<"reports">;
  layers: Doc<"dcpLayers">[];
  readOnly?: boolean;
};

export function DcpLayersEditor({ reportId, layers, readOnly }: Props) {
  const addLayer = useMutation(api.reports.dcpLayerMutations.addLayer);
  const removeLayer = useMutation(api.reports.dcpLayerMutations.removeLayer);
  const lastLayer = layers[layers.length - 1];
  const [form, setForm] = useState({
    fromDepthIn: lastLayer ? String(lastLayer.toDepthIn) : "0",
    toDepthIn: lastLayer ? String(lastLayer.toDepthIn + 6) : "6",
    blowCount: "",
    soilDescription: "",
  });

  return (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        DCP Layers
      </h3>
      {layers.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-xs text-muted-foreground">
                <th className="text-left py-1 pr-2">#</th>
                <th className="text-right py-1 pr-2">From (in)</th>
                <th className="text-right py-1 pr-2">To (in)</th>
                <th className="text-right py-1 pr-2">Blows</th>
                <th className="text-right py-1 pr-2">DPI (mm/blow)</th>
                <th className="text-right py-1 pr-2">Est. CBR %</th>
                <th className="text-left py-1 pr-2">Soil</th>
                {!readOnly && <th className="w-8" />}
              </tr>
            </thead>
            <tbody>
              {layers.map((l) => (
                <tr key={l._id} className="border-b">
                  <td className="py-1 pr-2">{l.sequence}</td>
                  <td className="py-1 pr-2 text-right">{l.fromDepthIn}</td>
                  <td className="py-1 pr-2 text-right">{l.toDepthIn}</td>
                  <td className="py-1 pr-2 text-right">{l.blowCount}</td>
                  <td className="py-1 pr-2 text-right">{l.dcpIndexMmPerBlow}</td>
                  <td className="py-1 pr-2 text-right">{l.estimatedCbrPct}</td>
                  <td className="py-1 pr-2 text-muted-foreground">{l.soilDescription ?? "—"}</td>
                  {!readOnly && (
                    <td>
                      <Button variant="ghost" size="icon" className="h-6 w-6"
                        onClick={() => void removeLayer({ layerId: l._id })}
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
            <Label className="text-xs">From (in)</Label>
            <Input className="h-8 text-sm" inputMode="decimal" value={form.fromDepthIn}
              onChange={(e) => setForm({ ...form, fromDepthIn: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">To (in)</Label>
            <Input className="h-8 text-sm" inputMode="decimal" value={form.toDepthIn}
              onChange={(e) => setForm({ ...form, toDepthIn: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Blow count</Label>
            <Input className="h-8 text-sm" inputMode="decimal" value={form.blowCount}
              onChange={(e) => setForm({ ...form, blowCount: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Soil description</Label>
            <Input className="h-8 text-sm" value={form.soilDescription}
              onChange={(e) => setForm({ ...form, soilDescription: e.target.value })} />
          </div>
          <div className="col-span-2 sm:col-span-4">
            <Button type="button" size="sm" onClick={() => {
              const from = parseFloat(form.fromDepthIn) || 0;
              const to = parseFloat(form.toDepthIn) || 6;
              const blows = parseInt(form.blowCount, 10) || 1;
              void addLayer({
                reportId,
                sequence: layers.length + 1,
                fromDepthIn: from,
                toDepthIn: to,
                blowCount: blows,
                soilDescription: form.soilDescription || undefined,
              }).then(() => {
                setForm({
                  fromDepthIn: String(to),
                  toDepthIn: String(to + (to - from)),
                  blowCount: "",
                  soilDescription: "",
                });
              });
            }}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Add layer
            </Button>
          </div>
        </div>
      )}
      {layers.length === 0 && readOnly && (
        <p className="text-sm text-muted-foreground">No DCP layers recorded.</p>
      )}
    </section>
  );
}
