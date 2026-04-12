import { useCallback, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id, Doc } from "../../../../convex/_generated/dataModel";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { CheckCircle2, XCircle } from "lucide-react";

const schema = z.object({
  testMethod: z.enum(["static", "dynamic", "statnamic"]).optional(),
  loadDirection: z.enum(["axial_compression", "axial_tension", "lateral"]).optional(),
  pileId: z.string().optional(),
  pileType: z.string().optional(),
  pileTypeId: z.string().optional(),
  blockNumber: z.string().optional(),
  rowNumber: z.string().optional(),
  pileNumber: z.string().optional(),
  installedLength: z.number().optional(),
  designLoadKips: z.number().optional(),
  maxLoadKips: z.number().optional(),
  failureCriterionNotes: z.string().optional(),
  result: z.enum(["pass", "fail", "inconclusive"]).optional(),
  // Report-level
  fieldDate: z.string().optional(),
  locationNote: z.string().optional(),
  stationFrom: z.string().optional(),
  stationTo: z.string().optional(),
  weather: z.object({
    tempF: z.number().optional(),
    conditions: z.string().optional(),
    windMph: z.number().optional(),
  }).optional(),
});

type FormValues = z.infer<typeof schema>;

type Props = {
  reportId: Id<"reports">;
  report: Doc<"reports">;
  detail: Record<string, any> | null;
  readOnly?: boolean;
};

export function PileLoadForm({ reportId, report, detail, readOnly }: Props) {
  const updateDraft = useMutation(api.reports.mutations.updateDraft);
  const zones = useQuery(api.specZones.listByProject, { projectId: report.projectId });
  const pileTypes = useQuery(api.pileTypes.listByProject, { projectId: report.projectId });
  const selectedZone = zones?.find((z) => z._id === report.specZoneId) ?? null;
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initializedRef = useRef(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      testMethod: detail?.testMethod ?? undefined,
      loadDirection: detail?.loadDirection ?? undefined,
      pileId: detail?.pileId ?? "",
      pileType: detail?.pileType ?? "",
      pileTypeId: detail?.pileTypeId ?? "",
      blockNumber: detail?.blockNumber ?? "",
      rowNumber: detail?.rowNumber ?? "",
      pileNumber: detail?.pileNumber ?? "",
      installedLength: detail?.installedLength ?? undefined,
      designLoadKips: detail?.designLoadKips ?? undefined,
      maxLoadKips: detail?.maxLoadKips ?? undefined,
      failureCriterionNotes: detail?.failureCriterionNotes ?? "",
      result: detail?.result ?? undefined,
      fieldDate: tsToDateStr(report.fieldDate),
      locationNote: report.locationNote ?? "",
      stationFrom: report.stationFrom ?? "",
      stationTo: report.stationTo ?? "",
      weather: report.weather ?? {},
    },
  });

  // Populate form once on mount. Skip subsequent resets to prevent
  // Convex reactivity from wiping unsaved input via form.reset().
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    form.reset({
      testMethod: detail?.testMethod ?? undefined,
      loadDirection: detail?.loadDirection ?? undefined,
      pileId: detail?.pileId ?? "",
      pileType: detail?.pileType ?? "",
      pileTypeId: detail?.pileTypeId ?? "",
      blockNumber: detail?.blockNumber ?? "",
      rowNumber: detail?.rowNumber ?? "",
      pileNumber: detail?.pileNumber ?? "",
      installedLength: detail?.installedLength ?? undefined,
      designLoadKips: detail?.designLoadKips ?? undefined,
      maxLoadKips: detail?.maxLoadKips ?? undefined,
      failureCriterionNotes: detail?.failureCriterionNotes ?? "",
      result: detail?.result ?? undefined,
      fieldDate: tsToDateStr(report.fieldDate),
      locationNote: report.locationNote ?? "",
      stationFrom: report.stationFrom ?? "",
      stationTo: report.stationTo ?? "",
      weather: report.weather ?? {},
    });
  }, [report, detail, form]);

  const saveToServer = useCallback(
    (values: FormValues) => {
      if (readOnly) return;
      const { fieldDate, locationNote, stationFrom, stationTo, weather, ...detailFields } = values;

      // HTML inputs produce strings, but Convex schema expects numbers.
      // Coerce numeric fields to prevent the entire mutation from rolling back.
      const cleanWeather = weather && Object.values(weather).some((v) => v !== undefined && v !== "")
        ? { tempF: toNum(weather.tempF), conditions: weather.conditions || undefined, windMph: toNum(weather.windMph) }
        : undefined;

      void updateDraft({
        reportId,
        fieldDate: dateStrToTs(fieldDate),
        locationNote: locationNote || undefined,
        stationFrom: stationFrom || undefined,
        stationTo: stationTo || undefined,
        weather: cleanWeather,
        detail: {
          testMethod: detailFields.testMethod || undefined,
          loadDirection: detailFields.loadDirection || undefined,
          pileId: detailFields.pileId || undefined,
          pileType: detailFields.pileType || undefined,
          pileTypeId: detailFields.pileTypeId || undefined,
          blockNumber: detailFields.blockNumber || undefined,
          rowNumber: detailFields.rowNumber || undefined,
          pileNumber: detailFields.pileNumber || undefined,
          installedLength: toNum(detailFields.installedLength),
          designLoadKips: toNum(detailFields.designLoadKips),
          maxLoadKips: toNum(detailFields.maxLoadKips),
          failureCriterionNotes: detailFields.failureCriterionNotes || undefined,
          result: detailFields.result || undefined,
        },
      });
    },
    [reportId, updateDraft, readOnly],
  );

  const debouncedSave = useCallback(
    (values: FormValues) => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => saveToServer(values), 1000);
    },
    [saveToServer],
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/incompatible-library -- RHF watch subscription for auto-save
    const sub = form.watch((values) => {
      debouncedSave(values as FormValues);
    });
    return () => {
      sub.unsubscribe();
      // Flush pending save immediately (critical for mobile wizard step switches)
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
        saveToServer(form.getValues() as FormValues);
      }
    };
  }, [form, debouncedSave, saveToServer]);

  const disabled = readOnly;

  return (
    <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
      {/* Section 1: Site Conditions */}
      <section className="space-y-4">
        <h3 className="font-heading text-sm font-semibold text-foreground">
          Site Conditions
        </h3>
        <p className="text-sm text-muted-foreground">
          Record weather and location at the test pile.
        </p>
        <Field label="Field date" disabled={disabled}>
          <Input type="date" {...form.register("fieldDate")} className="w-auto" />
        </Field>
        <Field label="Test zone" disabled={disabled}>
          <Select
            value={report.specZoneId ?? ""}
            onValueChange={(v) => {
              void updateDraft({
                reportId,
                specZoneId: v as Id<"projectSpecZones">,
              });
            }}
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select zone (optional)..." />
            </SelectTrigger>
            <SelectContent>
              {zones?.map((z) => (
                <SelectItem key={z._id} value={z._id}>
                  {z.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="Temp (°F)" disabled={disabled}>
            <Input {...form.register("weather.tempF")} inputMode="decimal" placeholder="°F" />
          </Field>
          <Field label="Conditions" disabled={disabled}>
            <Input {...form.register("weather.conditions")} placeholder="Clear / Overcast" />
          </Field>
          <Field label="Wind (mph)" disabled={disabled}>
            <Input {...form.register("weather.windMph")} inputMode="decimal" placeholder="0" />
          </Field>
        </div>
        <Field label="Location note" disabled={disabled}>
          <Input {...form.register("locationNote")} />
        </Field>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Station from" disabled={disabled}>
            <Input {...form.register("stationFrom")} />
          </Field>
          <Field label="Station to" disabled={disabled}>
            <Input {...form.register("stationTo")} />
          </Field>
        </div>
      </section>

      <div className="border-t-2 border-muted pt-2" />

      {/* Section 2: Pile Identification */}
      <section className="space-y-4">
        <h3 className="font-heading text-sm font-semibold text-foreground">
          Pile Identification
        </h3>
        <p className="text-sm text-muted-foreground">
          Details about the pile being tested.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Pile ID" disabled={disabled}>
            <Input {...form.register("pileId")} placeholder="P-07" />
          </Field>
          <Field label="Pile type" disabled={disabled}>
            {pileTypes && pileTypes.length > 0 ? (
              <Select
                value={form.watch("pileType") ?? ""}
                onValueChange={(v) => {
                  form.setValue("pileType", v, { shouldDirty: true });
                  const pt = pileTypes.find((p) => p.name === v);
                  if (pt) {
                    form.setValue("pileTypeId", pt._id, { shouldDirty: true });
                  }
                }}
                disabled={disabled}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select pile type..." />
                </SelectTrigger>
                <SelectContent>
                  {pileTypes.map((pt) => (
                    <SelectItem key={pt._id} value={pt.name}>
                      <div className="flex items-center gap-2">
                        <div
                          className="size-3 rounded-full shrink-0"
                          style={{ backgroundColor: pt.color }}
                        />
                        {pt.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input {...form.register("pileType")} placeholder='18" HP14x73 steel' />
            )}
          </Field>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <Field label="Block" disabled={disabled}>
            <Input {...form.register("blockNumber")} placeholder="3" />
          </Field>
          <Field label="Row" disabled={disabled}>
            <Input {...form.register("rowNumber")} placeholder="12" />
          </Field>
          <Field label="Pile #" disabled={disabled}>
            <Input {...form.register("pileNumber")} placeholder="7" />
          </Field>
        </div>
        <Field label="Installed length (ft)" disabled={disabled}>
          <Input {...form.register("installedLength")} inputMode="decimal" placeholder="0.0" />
        </Field>
      </section>

      <div className="border-t-2 border-muted pt-2" />

      {/* Section 3: Test Configuration */}
      <section className="space-y-4">
        <h3 className="font-heading text-sm font-semibold text-foreground">
          Test Configuration
        </h3>
        <p className="text-sm text-muted-foreground">
          How the test will be conducted.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Load direction" disabled={disabled}>
            <Select
              value={form.watch("loadDirection") ?? ""}
              onValueChange={(v) => form.setValue("loadDirection", v as any, { shouldDirty: true })}
              disabled={disabled}
            >
              <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="axial_compression">Axial Compression (D1143)</SelectItem>
                <SelectItem value="axial_tension">Axial Tension / Uplift (D3689)</SelectItem>
                <SelectItem value="lateral">Lateral (D3966)</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Test method" disabled={disabled}>
            <Select
              value={form.watch("testMethod") ?? ""}
              onValueChange={(v) => form.setValue("testMethod", v as any, { shouldDirty: true })}
              disabled={disabled}
            >
              <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="static">Static</SelectItem>
                <SelectItem value="dynamic">Dynamic (PDA)</SelectItem>
                <SelectItem value="statnamic">Statnamic (Rapid)</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </div>
        <Field label="Design load (kips)" disabled={disabled}>
          <Input {...form.register("designLoadKips")} inputMode="decimal" placeholder="0" />
        </Field>
      </section>

      <div className="border-t-2 border-muted pt-2" />

      {/* Section 4: Load Increments */}
      <section className="space-y-4">
        <h3 className="font-heading text-sm font-semibold text-foreground">
          Load Increments
        </h3>
        <p className="text-sm text-muted-foreground">
          Record applied loads and settlements using the editor below.
        </p>
        <p className="text-sm text-muted-foreground">
          Add load increments below using the increment editor.
        </p>
      </section>

      <div className="border-t-2 border-muted pt-2" />

      {/* Section 5: Results */}
      <section className="space-y-4">
        <h3 className="font-heading text-sm font-semibold text-foreground">
          Results
        </h3>
        <p className="text-sm text-muted-foreground">
          Complete after the test is finished.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Max load (kips)" disabled={disabled}>
            <Input {...form.register("maxLoadKips")} inputMode="decimal" placeholder="0" />
          </Field>
          <Field label="Result" disabled={disabled}>
            <Select
              value={form.watch("result") ?? ""}
              onValueChange={(v) => form.setValue("result", v as "pass" | "fail" | "inconclusive", { shouldDirty: true })}
              disabled={disabled}
            >
              <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pass">Pass</SelectItem>
                <SelectItem value="fail">Fail</SelectItem>
                <SelectItem value="inconclusive">Inconclusive</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </div>
        <Field label="Failure criterion notes" disabled={disabled}>
          <Textarea {...form.register("failureCriterionNotes")} rows={2} />
        </Field>
      </section>

      {/* Live spec check */}
      {selectedZone?.specPileDesignLoadKips && (
        <div className="space-y-2">
          <h3 className="font-heading text-sm font-semibold text-foreground">Acceptance Check</h3>
          <p className="text-sm text-muted-foreground">Based on zone: {selectedZone.name}</p>
          <SpecCheckBanner
            label="Max load vs design"
            actual={toNum(form.watch("maxLoadKips")) ?? null}
            required={selectedZone.specPileDesignLoadKips}
            unit="kips"
            comparison="gte"
          />
          {selectedZone.specPileType && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground rounded-lg border px-4 py-2.5">
              <span>Expected pile type:</span>
              <span className="font-medium text-foreground">{selectedZone.specPileType}</span>
            </div>
          )}
          {selectedZone.specPileFailureCriterion && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground rounded-lg border px-4 py-2.5">
              <span>Failure criterion:</span>
              <span className="font-medium text-foreground">{selectedZone.specPileFailureCriterion}</span>
            </div>
          )}
        </div>
      )}
    </form>
  );
}

/** Coerce an input string to a number, or undefined if empty/NaN. */
function toNum(v: any): number | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const n = Number(v);
  return isNaN(n) ? undefined : n;
}

/** Convert a ms timestamp to YYYY-MM-DD for date inputs. */
function tsToDateStr(ts: number | undefined): string {
  if (!ts) return "";
  return new Date(ts).toISOString().split("T")[0];
}

/** Convert a YYYY-MM-DD string to a ms timestamp, or undefined. */
function dateStrToTs(s: string | undefined): number | undefined {
  if (!s) return undefined;
  const t = new Date(s + "T12:00:00").getTime();
  return isNaN(t) ? undefined : t;
}

function SpecCheckBanner({
  label,
  actual,
  required,
  unit,
  comparison,
}: {
  label: string;
  actual: number | null;
  required: number | null;
  unit: string;
  comparison: "gte" | "lte";
}) {
  if (actual === null || required === null) return null;
  const passed = comparison === "gte" ? actual >= required : actual <= required;
  return (
    <div className={cn(
      "flex items-center justify-between rounded-lg border px-4 py-3",
      passed
        ? "border-emerald-200 bg-emerald-50/50 dark:border-emerald-900/50 dark:bg-emerald-950/20"
        : "border-red-200 bg-red-50/50 dark:border-red-900/50 dark:bg-red-950/20"
    )}>
      <div className="flex items-center gap-2">
        {passed ? (
          <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
        ) : (
          <XCircle className="size-4 text-red-600 dark:text-red-400" />
        )}
        <span className="text-sm font-medium">
          {label}
        </span>
      </div>
      <div className="text-sm">
        <span className={cn("font-mono font-semibold", passed ? "text-emerald-700 dark:text-emerald-300" : "text-red-700 dark:text-red-300")}>
          {actual} {unit}
        </span>
        <span className="text-muted-foreground ml-1.5">
          / {comparison === "gte" ? "\u2265" : "\u2264"} {required} {unit} required
        </span>
      </div>
    </div>
  );
}

function Field({
  label,
  disabled,
  children,
  className,
}: {
  label: string;
  disabled?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label className="text-sm font-medium text-muted-foreground">{label}</Label>
      <div className={disabled ? "opacity-50 pointer-events-none grayscale-[20%]" : ""}>
        {children}
      </div>
    </div>
  );
}
