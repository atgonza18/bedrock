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
  increments: Doc<"pileLoadIncrements">[];
  readOnly?: boolean;
  loadDirection?: string;
};

const MOVEMENT_LABELS: Record<string, { load: string; movement: string; header: string }> = {
  axial_compression: { load: "Load (kips)", movement: "Settlement (in)", header: "Load Increments" },
  axial_tension: { load: "Uplift load (kips)", movement: "Uplift (in)", header: "Load Increments" },
  lateral: { load: "Lateral load (kips)", movement: "Deflection (in)", header: "Load Increments" },
};

export function PileLoadIncrementEditor({ reportId, increments, readOnly, loadDirection }: Props) {
  const labels = MOVEMENT_LABELS[loadDirection ?? ""] ?? MOVEMENT_LABELS.axial_compression;
  const addIncrement = useMutation(api.reports.pileLoadMutations.addIncrement);
  const removeIncrement = useMutation(api.reports.pileLoadMutations.removeIncrement);
  const [form, setForm] = useState({
    loadKips: "",
    heldForMinutes: "10",
    netSettlementIn: "",
  });

  return (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        {labels.header}
      </h3>
      {increments.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-xs text-muted-foreground">
                <th className="text-left py-1 pr-2">#</th>
                <th className="text-right py-1 pr-2">{labels.load}</th>
                <th className="text-right py-1 pr-2">Held (min)</th>
                <th className="text-right py-1 pr-2">{labels.movement}</th>
                <th className="text-left py-1 pr-2">Applied</th>
                {!readOnly && <th className="w-8" />}
              </tr>
            </thead>
            <tbody>
              {increments.map((inc) => (
                <tr key={inc._id} className="border-b">
                  <td className="py-1 pr-2">{inc.sequence}</td>
                  <td className="py-1 pr-2 text-right font-mono">{inc.loadKips}</td>
                  <td className="py-1 pr-2 text-right">{inc.heldForMinutes}</td>
                  <td className="py-1 pr-2 text-right font-mono">{inc.netSettlementIn}</td>
                  <td className="py-1 pr-2 text-muted-foreground">
                    {new Date(inc.appliedAt).toLocaleTimeString()}
                  </td>
                  {!readOnly && (
                    <td>
                      <Button variant="ghost" size="icon" className="h-6 w-6"
                        onClick={() => void removeIncrement({ incrementId: inc._id })}
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
        <div className="grid grid-cols-3 gap-2 pt-2">
          <div className="space-y-1">
            <Label className="text-xs">{labels.load}</Label>
            <Input className="h-8 text-sm" inputMode="decimal" value={form.loadKips}
              onChange={(e) => setForm({ ...form, loadKips: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Held (min)</Label>
            <Input className="h-8 text-sm" inputMode="decimal" value={form.heldForMinutes}
              onChange={(e) => setForm({ ...form, heldForMinutes: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{labels.movement}</Label>
            <Input className="h-8 text-sm" inputMode="decimal" value={form.netSettlementIn}
              onChange={(e) => setForm({ ...form, netSettlementIn: e.target.value })} />
          </div>
          <div className="col-span-3">
            <Button type="button" size="sm" onClick={() => {
              void addIncrement({
                reportId,
                sequence: increments.length + 1,
                loadKips: parseFloat(form.loadKips) || 0,
                appliedAt: Date.now(),
                heldForMinutes: parseFloat(form.heldForMinutes) || 0,
                netSettlementIn: parseFloat(form.netSettlementIn) || 0,
              }).then(() => setForm({ loadKips: "", heldForMinutes: "10", netSettlementIn: "" }));
            }}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Add increment
            </Button>
          </div>
        </div>
      )}
      {increments.length === 0 && readOnly && (
        <p className="text-sm text-muted-foreground">No load increments recorded.</p>
      )}
    </section>
  );
}
