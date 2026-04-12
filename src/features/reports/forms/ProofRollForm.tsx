import { useCallback, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "convex/react";
import { z } from "zod";
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

const proofRollSchema = z.object({
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
  equipmentUsed: z.string().optional(),
  numberOfPasses: z.number().optional(),
  areaDescription: z.string().optional(),
  result: z.enum(["pass", "fail", "conditional"]).optional(),
  failureZones: z.string().optional(),
  recommendations: z.string().optional(),
});

type ProofRollFormValues = z.infer<typeof proofRollSchema>;

type Props = {
  reportId: Id<"reports">;
  report: Doc<"reports">;
  detail: Record<string, any> | null;
  readOnly?: boolean;
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
 * RHF-powered proof roll form. Auto-saves on every change with a
 * 1-second debounce. All fields are optional to allow incremental drafts.
 */
export function ProofRollForm({ reportId, report, detail, readOnly }: Props) {
  const updateDraft = useMutation(api.reports.mutations.updateDraft);
  const zones = useQuery(api.specZones.listByProject, { projectId: report.projectId });
  const selectedZone = zones?.find((z) => z._id === report.specZoneId) ?? null;
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initializedRef = useRef(false);

  const form = useForm<ProofRollFormValues>({
    resolver: zodResolver(proofRollSchema),
    defaultValues: {
      fieldDate: tsToDateStr(report.fieldDate),
      weather: report.weather ?? {},
      locationNote: report.locationNote ?? "",
      stationFrom: report.stationFrom ?? "",
      stationTo: report.stationTo ?? "",
      equipmentUsed: detail?.equipmentUsed ?? "",
      numberOfPasses: detail?.numberOfPasses ?? undefined,
      areaDescription: detail?.areaDescription ?? "",
      result: detail?.result ?? undefined,
      failureZones: detail?.failureZones ?? "",
      recommendations: detail?.recommendations ?? "",
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
      equipmentUsed: detail?.equipmentUsed ?? "",
      numberOfPasses: detail?.numberOfPasses ?? undefined,
      areaDescription: detail?.areaDescription ?? "",
      result: detail?.result ?? undefined,
      failureZones: detail?.failureZones ?? "",
      recommendations: detail?.recommendations ?? "",
    });
  }, [report, detail, form]);

  const saveToServer = useCallback(
    (values: ProofRollFormValues) => {
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
          equipmentUsed: detailFields.equipmentUsed || undefined,
          numberOfPasses: toNum(detailFields.numberOfPasses),
          areaDescription: detailFields.areaDescription || undefined,
          result: detailFields.result || undefined,
          failureZones: detailFields.failureZones || undefined,
          recommendations: detailFields.recommendations || undefined,
        },
      });
    },
    [reportId, updateDraft, readOnly],
  );

  const debouncedSave = useCallback(
    (values: ProofRollFormValues) => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => saveToServer(values), 1000);
    },
    [saveToServer],
  );

  // Watch all fields and debounce save.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/incompatible-library -- RHF watch subscription is intentional for auto-save
    const sub = form.watch((values) => {
      debouncedSave(values as ProofRollFormValues);
    });
    return () => {
      sub.unsubscribe();
      // Flush pending save immediately (critical for mobile wizard step switches)
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
        saveToServer(form.getValues() as ProofRollFormValues);
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
          Record weather and location at the observation site.
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

      {/* Section 2: Equipment & Area */}
      <section className="space-y-4">
        <h3 className="font-heading text-sm font-semibold text-foreground">
          Equipment &amp; Area
        </h3>
        <p className="text-sm text-muted-foreground">
          Roller and test area details.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Equipment used" disabled={disabled}>
            <Input {...form.register("equipmentUsed")} />
          </Field>
          <Field label="Number of passes" disabled={disabled}>
            <Input
              {...form.register("numberOfPasses")}
              inputMode="decimal"
              placeholder="0"
            />
          </Field>
          <Field label="Area description" disabled={disabled} className="sm:col-span-2">
            <Input {...form.register("areaDescription")} />
          </Field>
        </div>
      </section>

      <div className="border-t-2 border-muted pt-2" />

      {/* Section 3: Assessment */}
      <section className="space-y-4">
        <h3 className="font-heading text-sm font-semibold text-foreground">
          Assessment
        </h3>
        <p className="text-sm text-muted-foreground">
          Your observation results. Complete after all passes.
        </p>
        <Field label="Result" disabled={disabled}>
          <Select
            value={form.watch("result") ?? ""}
            onValueChange={(v) =>
              form.setValue(
                "result",
                v as "pass" | "fail" | "conditional",
                { shouldDirty: true },
              )
            }
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pass">Pass</SelectItem>
              <SelectItem value="fail">Fail</SelectItem>
              <SelectItem value="conditional">Conditional</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Failure zones" disabled={disabled}>
          <Textarea {...form.register("failureZones")} rows={2} />
        </Field>
        <Field label="Recommendations" disabled={disabled}>
          <Textarea {...form.register("recommendations")} rows={2} />
        </Field>
      </section>

      {/* Zone context */}
      {selectedZone && (
        <div className="text-sm text-muted-foreground rounded-lg border px-4 py-2.5">
          Testing in zone: <span className="font-medium text-foreground">{selectedZone.name}</span>
          {selectedZone.specNotes && <span> — {selectedZone.specNotes}</span>}
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
