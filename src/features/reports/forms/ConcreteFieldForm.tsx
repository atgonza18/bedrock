import { useCallback, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id, Doc } from "../../../../convex/_generated/dataModel";
import {
  concreteFieldSchema,
  ConcreteFieldFormValues,
} from "@/lib/schemas/concreteField";
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

type Props = {
  reportId: Id<"reports">;
  report: Doc<"reports">;
  detail: Doc<"concreteFieldTests"> | null;
  readOnly?: boolean;
};

/**
 * RHF-powered concrete field form. Auto-saves on every change with a
 * 1-second debounce. All fields are optional to allow incremental drafts.
 */
export function ConcreteFieldForm({ reportId, report, detail, readOnly }: Props) {
  const updateDraft = useMutation(api.reports.mutations.updateDraft);
  const zones = useQuery(api.specZones.listByProject, { projectId: report.projectId });
  const selectedZone = zones?.find((z) => z._id === report.specZoneId) ?? null;
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initializedRef = useRef(false);

  const form = useForm<ConcreteFieldFormValues>({
    resolver: zodResolver(concreteFieldSchema),
    defaultValues: {
      fieldDate: tsToDateStr(report.fieldDate),
      weather: report.weather ?? {},
      locationNote: report.locationNote ?? "",
      stationFrom: report.stationFrom ?? "",
      stationTo: report.stationTo ?? "",
      mixDesignNumber: detail?.mixDesignNumber ?? "",
      designStrengthPsi: detail?.designStrengthPsi ?? undefined,
      supplier: detail?.supplier ?? "",
      ticketNumber: detail?.ticketNumber ?? "",
      truckNumber: detail?.truckNumber ?? "",
      cubicYards: detail?.cubicYards ?? undefined,
      placementLocation: detail?.placementLocation ?? "",
      slumpInches: detail?.slumpInches ?? undefined,
      airContentPct: detail?.airContentPct ?? undefined,
      airMethod: detail?.airMethod ?? undefined,
      concreteTempF: detail?.concreteTempF ?? undefined,
      ambientTempF: detail?.ambientTempF ?? undefined,
      unitWeightPcf: detail?.unitWeightPcf ?? undefined,
      admixtureNotes: detail?.admixtureNotes ?? "",
    },
  });

  // Populate form once on mount. We intentionally skip subsequent resets
  // because Convex reactivity creates new object refs for report/detail
  // every time *any* query data changes (e.g. after a photo upload),
  // which would wipe unsaved form input via form.reset().
  // The parent already uses key={report._id} to remount for different reports.
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    form.reset({
      fieldDate: tsToDateStr(report.fieldDate),
      weather: report.weather ?? {},
      locationNote: report.locationNote ?? "",
      stationFrom: report.stationFrom ?? "",
      stationTo: report.stationTo ?? "",
      mixDesignNumber: detail?.mixDesignNumber ?? "",
      designStrengthPsi: detail?.designStrengthPsi ?? undefined,
      supplier: detail?.supplier ?? "",
      ticketNumber: detail?.ticketNumber ?? "",
      truckNumber: detail?.truckNumber ?? "",
      cubicYards: detail?.cubicYards ?? undefined,
      placementLocation: detail?.placementLocation ?? "",
      slumpInches: detail?.slumpInches ?? undefined,
      airContentPct: detail?.airContentPct ?? undefined,
      airMethod: detail?.airMethod ?? undefined,
      concreteTempF: detail?.concreteTempF ?? undefined,
      ambientTempF: detail?.ambientTempF ?? undefined,
      unitWeightPcf: detail?.unitWeightPcf ?? undefined,
      admixtureNotes: detail?.admixtureNotes ?? "",
    });
  }, [report, detail, form]);

  const saveToServer = useCallback(
    (values: ConcreteFieldFormValues) => {
      if (readOnly) return;
      const {
        fieldDate,
        weather,
        locationNote,
        stationFrom,
        stationTo,
        ...detailFields
      } = values;

      // HTML inputs produce strings, but Convex schema expects numbers.
      // Coerce numeric fields to prevent the entire mutation from rolling back.
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
          mixDesignNumber: detailFields.mixDesignNumber || undefined,
          designStrengthPsi: toNum(detailFields.designStrengthPsi),
          supplier: detailFields.supplier || undefined,
          ticketNumber: detailFields.ticketNumber || undefined,
          truckNumber: detailFields.truckNumber || undefined,
          cubicYards: toNum(detailFields.cubicYards),
          placementLocation: detailFields.placementLocation || undefined,
          slumpInches: toNum(detailFields.slumpInches),
          airContentPct: toNum(detailFields.airContentPct),
          airMethod: detailFields.airMethod || undefined,
          concreteTempF: toNum(detailFields.concreteTempF),
          ambientTempF: toNum(detailFields.ambientTempF),
          unitWeightPcf: toNum(detailFields.unitWeightPcf),
          admixtureNotes: detailFields.admixtureNotes || undefined,
        },
      });
    },
    [reportId, updateDraft, readOnly],
  );

  const debouncedSave = useCallback(
    (values: ConcreteFieldFormValues) => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => saveToServer(values), 1000);
    },
    [saveToServer],
  );

  // Watch all fields and debounce save.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/incompatible-library -- RHF watch subscription is intentional for auto-save
    const sub = form.watch((values) => {
      debouncedSave(values as ConcreteFieldFormValues);
    });
    return () => {
      sub.unsubscribe();
      // Flush pending save immediately (critical for mobile wizard step switches)
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
        saveToServer(form.getValues() as ConcreteFieldFormValues);
      }
    };
  }, [form, debouncedSave, saveToServer]);

  const disabled = readOnly;

  return (
    <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
      {/* Section 1: Site Conditions */}
      <section className="space-y-4">
        <div>
          <h3 className="font-heading text-sm font-semibold text-foreground">
            Site Conditions
          </h3>
          <p className="text-sm text-muted-foreground">
            Record weather and location when you arrive at the pour site.
          </p>
        </div>
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

      {/* Section 2: Delivery Ticket */}
      <section className="space-y-4">
        <div>
          <h3 className="font-heading text-sm font-semibold text-foreground">
            Delivery Ticket
          </h3>
          <p className="text-sm text-muted-foreground">
            Copy from the batch ticket when the truck arrives.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Supplier (ready-mix)" disabled={disabled}>
            <Input {...form.register("supplier")} />
          </Field>
          <Field label="Mix design #" disabled={disabled}>
            <Input {...form.register("mixDesignNumber")} />
          </Field>
          <Field label="Ticket #" disabled={disabled}>
            <Input {...form.register("ticketNumber")} />
          </Field>
          <Field label="Truck #" disabled={disabled}>
            <Input {...form.register("truckNumber")} />
          </Field>
          <Field label="Design strength (psi)" disabled={disabled}>
            <Input
              {...form.register("designStrengthPsi")}
              inputMode="decimal"
              placeholder="0"
            />
          </Field>
          <Field label="Cubic yards" disabled={disabled}>
            <Input {...form.register("cubicYards")} inputMode="decimal" placeholder="0.0" />
          </Field>
        </div>
      </section>

      <div className="border-t-2 border-muted pt-2" />

      {/* Section 3: Placement */}
      <section className="space-y-4">
        <div>
          <h3 className="font-heading text-sm font-semibold text-foreground">
            Placement
          </h3>
          <p className="text-sm text-muted-foreground">
            Where the concrete is being placed.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Placement location" disabled={disabled} className="sm:col-span-2">
            <Input
              {...form.register("placementLocation")}
              placeholder="Column C-7, 3rd floor"
            />
          </Field>
        </div>
      </section>

      <div className="border-t-2 border-muted pt-2" />

      {/* Section 4: Fresh Concrete Tests */}
      <section className="space-y-4">
        <div>
          <h3 className="font-heading text-sm font-semibold text-foreground">
            Fresh Concrete Tests
          </h3>
          <p className="text-sm text-muted-foreground">
            Perform tests within 5 minutes of sampling (ASTM C172).
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Field label="Concrete temp (°F)" disabled={disabled}>
            <Input {...form.register("concreteTempF")} inputMode="decimal" placeholder="°F" />
          </Field>
          <Field label="Ambient temp (°F)" disabled={disabled}>
            <Input {...form.register("ambientTempF")} inputMode="decimal" placeholder="°F" />
          </Field>
          <Field label="Slump (in)" disabled={disabled}>
            <Input {...form.register("slumpInches")} inputMode="decimal" placeholder="0.0" />
          </Field>
          <Field label="Air content (%)" disabled={disabled}>
            <Input {...form.register("airContentPct")} inputMode="decimal" placeholder="0.0" />
          </Field>
          <Field label="Air method" disabled={disabled}>
            <Select
              value={form.watch("airMethod") ?? ""}
              onValueChange={(v) =>
                form.setValue(
                  "airMethod",
                  v as "pressure" | "volumetric",
                  { shouldDirty: true },
                )
              }
              disabled={disabled}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pressure">Pressure</SelectItem>
                <SelectItem value="volumetric">Volumetric</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Unit weight (pcf)" disabled={disabled}>
            <Input {...form.register("unitWeightPcf")} inputMode="decimal" placeholder="0.0" />
          </Field>
        </div>
        <Field label="Admixture notes" disabled={disabled}>
          <Textarea {...form.register("admixtureNotes")} rows={2} />
        </Field>
      </section>

      {/* Live spec check */}
      {selectedZone?.specMinConcreteStrengthPsi && (
        <div className="space-y-2">
          <h3 className="font-heading text-sm font-semibold text-foreground">Acceptance Check</h3>
          <p className="text-sm text-muted-foreground">Based on zone: {selectedZone.name}</p>
          <SpecCheckBanner
            label="Design strength"
            actual={toNum(form.watch("designStrengthPsi")) ?? null}
            required={selectedZone.specMinConcreteStrengthPsi}
            unit="psi"
            comparison="gte"
          />
        </div>
      )}
    </form>
  );
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

/** Coerce an input string to a number, or undefined if empty/NaN. */
function toNum(v: any): number | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const n = Number(v);
  return isNaN(n) ? undefined : n;
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
