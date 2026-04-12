import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id, Doc } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Plus, Trash2 } from "lucide-react";

type CylinderSet = Doc<"concreteCylinderSets"> & {
  cylinders: Doc<"concreteCylinders">[];
};

type Props = {
  reportId: Id<"reports">;
  cylinderSets: CylinderSet[];
  readOnly?: boolean;
};

export function CylinderSetEditor({ reportId, cylinderSets, readOnly }: Props) {
  const addSet = useMutation(api.reports.cylinders.addCylinderSet);
  const removeSet = useMutation(api.reports.cylinders.removeCylinderSet);
  const addCylinder = useMutation(api.reports.cylinders.addCylinder);
  const removeCylinder = useMutation(api.reports.cylinders.removeCylinder);
  const [addingSet, setAddingSet] = useState(false);

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Cylinder Sets
        </h3>
        {!readOnly && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setAddingSet(true);
              void addSet({
                reportId,
                setLabel: `Set ${String.fromCharCode(65 + cylinderSets.length)}`,
                castDate: Date.now(),
              }).finally(() => setAddingSet(false));
            }}
            disabled={addingSet}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add set
          </Button>
        )}
      </div>

      {cylinderSets.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No cylinder sets yet. Add a set to track cylinder casts.
        </p>
      ) : (
        <div className="space-y-4">
          {cylinderSets.map((set) => (
            <Card key={set._id}>
              <CardHeader className="flex flex-row items-center justify-between py-3 px-4">
                <CardTitle className="text-sm">
                  {set.setLabel}
                  <Badge variant="outline" className="ml-2 text-xs">
                    {set.status}
                  </Badge>
                </CardTitle>
                {!readOnly && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() =>
                      void removeSet({ setId: set._id })
                    }
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </CardHeader>
              <CardContent className="px-4 pb-3 space-y-2">
                {set.cylinders.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    No cylinders. Add cylinders with target break ages.
                  </p>
                ) : (
                  <ul className="space-y-1">
                    {set.cylinders.map((c) => (
                      <li
                        key={c._id}
                        className="flex items-center gap-2 text-sm"
                      >
                        <span className="font-mono w-10">
                          {c.cylinderNumber}
                        </span>
                        <Badge variant="secondary" className="text-xs">
                          {c.breakAgeDays}d
                        </Badge>
                        {c.strengthPsi !== undefined && (
                          <span className="text-muted-foreground">
                            {c.strengthPsi} psi
                          </span>
                        )}
                        {c.strengthPsi === undefined && (
                          <span className="text-xs text-muted-foreground italic">
                            pending
                          </span>
                        )}
                        {!readOnly && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 ml-auto"
                            onClick={() =>
                              void removeCylinder({
                                cylinderId: c._id,
                              })
                            }
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
                {!readOnly && (
                  <AddCylinderRow
                    setId={set._id}
                    nextNumber={`${set.setLabel.slice(-1)}-${set.cylinders.length + 1}`}
                    addCylinder={addCylinder}
                  />
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}

function AddCylinderRow({
  setId,
  nextNumber,
  addCylinder,
}: {
  setId: Id<"concreteCylinderSets">;
  nextNumber: string;
  addCylinder: (args: { setId: Id<"concreteCylinderSets">; cylinderNumber: string; breakAgeDays: number }) => Promise<any>;
}) {
  const [number, setNumber] = useState(nextNumber);
  const [breakAge, setBreakAge] = useState("28");
  const [adding, setAdding] = useState(false);

  return (
    <div className="flex items-end gap-2 pt-2">
      <div className="space-y-1 flex-1">
        <Label className="text-xs">Cylinder #</Label>
        <Input
          value={number}
          onChange={(e) => setNumber(e.target.value)}
          className="h-8 text-sm"
        />
      </div>
      <div className="space-y-1 w-24">
        <Label className="text-xs">Break age</Label>
        <Select value={breakAge} onValueChange={setBreakAge}>
          <SelectTrigger className="h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">7 day</SelectItem>
            <SelectItem value="14">14 day</SelectItem>
            <SelectItem value="28">28 day</SelectItem>
            <SelectItem value="56">56 day</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button
        type="button"
        size="sm"
        className="h-8"
        disabled={adding || !number.trim()}
        onClick={() => {
          setAdding(true);
          void addCylinder({
            setId,
            cylinderNumber: number,
            breakAgeDays: parseInt(breakAge, 10),
          })
            .then(() => {
              const parts = number.split("-");
              const lastNum = parseInt(parts[parts.length - 1] ?? "0", 10);
              setNumber(
                parts.length > 1
                  ? `${parts.slice(0, -1).join("-")}-${lastNum + 1}`
                  : `${lastNum + 1}`,
              );
            })
            .finally(() => setAdding(false));
        }}
      >
        <Plus className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
