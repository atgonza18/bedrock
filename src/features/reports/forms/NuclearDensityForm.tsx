import { useCallback, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "convex/react";
import { z } from "zod";
import { api } from "../../../../convex/_generated/api";
import { Id, Doc } from "../../../../convex/_generated/dataModel";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const nuclearDensitySchema = z.object({
  fieldDate: z.string().optional(),
  weather: z
    .object({
      tempF: z.number().optional(),
      conditions: z.string().optional(),
      windMph: z.number().optional(),
    })
    .optional(),
  locationNote: z.string().optional(),
  stationFrom: z.string().optional(),
  stationTo: z.string().optional(),
  gaugeModel: z.string().optional(),
  gaugeSerialNumber: z.string().optional(),
  materialDescription: z.string().optional(),
  liftNumber: z.number().optional(),
});

type NuclearDensityFormValues = z.infer<typeof nuclearDensitySchema>;

type Props = {
  reportId: Id<"reports">;
  report: Doc<"reports">;
  detail: Record<string, any> | null;
  readOnly?: boolean;
  /** Called when a Proctor is selected, so parent can pass MDD/OMC to the readings editor. */
  onProctorChange?: (proctor: { maxDryDensityPcf: number; optimumMoisturePct: number } | null) => void;
};

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

/**
 * RHF-powered nuclear density form. Auto-saves on every change with a
 * 1-second debounce. All fields are optional to allow incremental drafts.
 */
export function NuclearDensityForm({ reportId, report, detail, readOnly, onProctorChange }: Props) {
  const updateDraft = useMutation(api.reports.mutations.updateDraft);
  const proctors = useQuery(api.proctors.list);
  const zones = useQuery(api.specZones.listByProject, { projectId: report.projectId });
  const selectedZone = zones?.find((z) => z._id === report.specZoneId) ?? null;
  const selectedProctorId = detail?.referencedProctorId as string | undefined;
  const selectedProctor = proctors?.find((p) => p._id === selectedProctorId) ?? null;
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initializedRef = useRef(false);

  const form = useForm<NuclearDensityFormValues>({
    resolver: zodResolver(nuclearDensitySchema),
    defaultValues: {
      fieldDate: tsToDateStr(report.fieldDate),
      weather: report.weather ?? {},
      locationNote: report.locationNote ?? "",
      stationFrom: report.stationFrom ?? "",
      stationTo: report.stationTo ?? "",
      gaugeModel: detail?.gaugeModel ?? "",
      gaugeSerialNumber: detail?.gaugeSerialNumber ?? "",
      materialDescription: detail?.materialDescription ?? "",
      liftNumber: detail?.liftNumber ?? undefined,
    },
  });

  // Populate form once on mount. Skip subsequent resets to prevent
  // Convex reactivity from wiping unsaved input via form.reset().
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    form.reset({
      fieldDate: tsToDateStr(report.fieldDate),
      weather: report.weather ?? {},
      locationNote: report.locationNote ?? "",
      stationFrom: report.stationFrom ?? "",
      stationTo: report.stationTo ?? "",
      gaugeModel: detail?.gaugeModel ?? "",
      gaugeSerialNumber: detail?.gaugeSerialNumber ?? "",
      materialDescription: detail?.materialDescription ?? "",
      liftNumber: detail?.liftNumber ?? undefined,
    });
  }, [report, detail, form]);

  const saveToServer = useCallback(
    (values: NuclearDensityFormValues) => {
      if (readOnly) return;
      const {
        fieldDate,
        weather,
        locationNote,
        stationFrom,
        stationTo,
        ...detailFields
      } = values;

      const cleanWeather = weather && Object.values(weather).some((v) => v !== undefined && v !== "")
        ? { tempF: toNum(weather.tempF), conditions: weather.conditions || undefined, windMph: toNum(weather.windMph) }
        : undefined;

      void updateDraft({
        reportId,
        fieldDate: dateStrToTs(fieldDate),
        weather: cleanWeather,
        locationNote: locationNote || undefined,
        stationFrom: stationFrom || undefined,
        stationTo: stationTo || undefined,
        detail: {
          gaugeModel: detailFields.gaugeModel || undefined,
          gaugeSerialNumber: detailFields.gaugeSerialNumber || undefined,
          materialDescription: detailFields.materialDescription || undefined,
          liftNumber: toNum(detailFields.liftNumber),
        },
      });
    },
    [reportId, updateDraft, readOnly],
  );

  const debouncedSave = useCallback(
    (values: NuclearDensityFormValues) => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => saveToServer(values), 1000);
    },
    [saveToServer],
  );

  // Watch all fields and debounce save.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/incompatible-library -- RHF watch subscription is intentional for auto-save
    const sub = form.watch((values) => {
      debouncedSave(values as NuclearDensityFormValues);
    });
    return () => {
      sub.unsubscribe();
      // Flush pending save immediately (critical for mobile wizard step switches)
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
        saveToServer(form.getValues() as NuclearDensityFormValues);
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
          Record weather and location at the test site.
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
            <Input
              {...form.register("weather.conditions")}
              placeholder="Clear / Overcast / Rain"
            />
          </Field>
          <Field label="Wind (mph)" disabled={disabled}>
            <Input {...form.register("weather.windMph")} inputMode="decimal" placeholder="0" />
          </Field>
        </div>
        <Field label="Location note" disabled={disabled}>
          <Input
            {...form.register("locationNote")}
            placeholder="Grid B-7, north abutment"
          />
        </Field>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Station from" disabled={disabled}>
            <Input
              {...form.register("stationFrom")}
              placeholder="STA 102+50"
            />
          </Field>
          <Field label="Station to" disabled={disabled}>
            <Input {...form.register("stationTo")} />
          </Field>
        </div>
      </section>

      <div className="border-t-2 border-muted pt-2" />

      {/* Section 2: Material Under Test */}
      <section className="space-y-4">
        <h3 className="font-heading text-sm font-semibold text-foreground">
          Material Under Test
        </h3>
        <p className="text-sm text-muted-foreground">
          What&apos;s being tested, which lift, and the reference Proctor for compaction calculations.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Material description" disabled={disabled}>
            <Input {...form.register("materialDescription")} />
          </Field>
          <Field label="Lift number" disabled={disabled}>
            <Input
              {...form.register("liftNumber")}
              inputMode="decimal"
              placeholder="0"
            />
          </Field>
          <Field label="Reference Proctor" disabled={disabled} className="sm:col-span-2">
            <Select
              value={selectedProctorId ?? ""}
              onValueChange={(v) => {
                const p = proctors?.find((pr) => pr._id === v) ?? null;
                // Save to server immediately (not through form auto-save since this isn't in RHF)
                void updateDraft({
                  reportId,
                  detail: { referencedProctorId: v || undefined },
                });
                onProctorChange?.(p ? { maxDryDensityPcf: p.maxDryDensityPcf, optimumMoisturePct: p.optimumMoisturePct } : null);
              }}
              disabled={disabled}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a Proctor curve..." />
              </SelectTrigger>
              <SelectContent>
                {proctors?.map((p) => (
                  <SelectItem key={p._id} value={p._id}>
                    {p.label} — {p.maxDryDensityPcf} pcf / {p.optimumMoisturePct}%
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
        {/* Show selected Proctor reference values */}
        {selectedProctor && (
          <div className="rounded-lg bg-muted/50 border px-4 py-3 grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Max dry density</p>
              <p className="font-heading text-lg font-bold">{selectedProctor.maxDryDensityPcf} <span className="text-sm font-normal text-muted-foreground">pcf</span></p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Optimum moisture</p>
              <p className="font-heading text-lg font-bold">{selectedProctor.optimumMoisturePct}<span className="text-sm font-normal text-muted-foreground">%</span></p>
            </div>
          </div>
        )}
      </section>

      <div className="border-t-2 border-muted pt-2" />

      {/* Section 3: Gauge */}
      <section className="space-y-4">
        <h3 className="font-heading text-sm font-semibold text-foreground">
          Gauge
        </h3>
        <p className="text-sm text-muted-foreground">
          Equipment details — update if you switch gauges.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Gauge model" disabled={disabled}>
            <Input {...form.register("gaugeModel")} />
          </Field>
          <Field label="Gauge serial number" disabled={disabled}>
            <Input {...form.register("gaugeSerialNumber")} />
          </Field>
        </div>
      </section>

      <div className="border-t-2 border-muted pt-2" />

      {/* Section 4: Density Readings */}
      <section className="space-y-4">
        <h3 className="font-heading text-sm font-semibold text-foreground">
          Density Readings
        </h3>
        <p className="text-sm text-muted-foreground">
          Add individual test readings using the editor below.
        </p>
      </section>

      {/* Zone spec reference */}
      {selectedZone?.specMinCompactionPct && (
        <div className="space-y-2">
          <h3 className="font-heading text-sm font-semibold text-foreground">Zone Spec Reference</h3>
          <div className="flex items-center gap-2 text-sm rounded-lg border border-amber-200 bg-amber-50/50 dark:border-amber-900/50 dark:bg-amber-950/20 px-4 py-3">
            <span className="text-muted-foreground">Min compaction for this zone:</span>
            <span className="font-mono font-semibold text-amber-700 dark:text-amber-300">{selectedZone.specMinCompactionPct}%</span>
            <span className="text-muted-foreground">({selectedZone.specProctorType ?? "standard"} Proctor)</span>
          </div>
        </div>
      )}
    </form>
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
