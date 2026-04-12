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

const dcpSchema = z.object({
  fieldDate: z.string().optional(),
  weather: z
    .object({
      tempF: z.coerce.number().optional(),
      conditions: z.string().optional(),
      windMph: z.coerce.number().optional(),
    })
    .optional(),
  locationNote: z.string().optional(),
  stationFrom: z.string().optional(),
  stationTo: z.string().optional(),
  testLocation: z.string().optional(),
  groundwaterDepthIn: z.coerce.number().optional(),
  hammerWeightLbs: z.coerce.number().optional(),
});

type DcpFormValues = z.infer<typeof dcpSchema>;

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
 * RHF-powered DCP form. Auto-saves on every change with a
 * 1-second debounce. All fields are optional to allow incremental drafts.
 */
export function DcpForm({ reportId, report, detail, readOnly }: Props) {
  const updateDraft = useMutation(api.reports.mutations.updateDraft);
  const zones = useQuery(api.specZones.listByProject, { projectId: report.projectId });
  const selectedZone = zones?.find((z) => z._id === report.specZoneId) ?? null;
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initializedRef = useRef(false);

  const form = useForm<DcpFormValues>({
    resolver: zodResolver(dcpSchema),
    defaultValues: {
      fieldDate: tsToDateStr(report.fieldDate),
      weather: report.weather ?? {},
      locationNote: report.locationNote ?? "",
      stationFrom: report.stationFrom ?? "",
      stationTo: report.stationTo ?? "",
      testLocation: detail?.testLocation ?? "",
      groundwaterDepthIn: detail?.groundwaterDepthIn ?? undefined,
      hammerWeightLbs: detail?.hammerWeightLbs ?? undefined,
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
      testLocation: detail?.testLocation ?? "",
      groundwaterDepthIn: detail?.groundwaterDepthIn ?? undefined,
      hammerWeightLbs: detail?.hammerWeightLbs ?? undefined,
    });
  }, [report, detail, form]);

  const saveToServer = useCallback(
    (values: DcpFormValues) => {
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
          testLocation: detailFields.testLocation || undefined,
          groundwaterDepthIn: toNum(detailFields.groundwaterDepthIn),
          hammerWeightLbs: toNum(detailFields.hammerWeightLbs),
        },
      });
    },
    [reportId, updateDraft, readOnly],
  );

  const debouncedSave = useCallback(
    (values: DcpFormValues) => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => saveToServer(values), 1000);
    },
    [saveToServer],
  );

  // Watch all fields and debounce save.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/incompatible-library -- RHF watch subscription is intentional for auto-save
    const sub = form.watch((values) => {
      debouncedSave(values as DcpFormValues);
    });
    return () => {
      sub.unsubscribe();
      // Flush pending save immediately (critical for mobile wizard step switches)
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
        saveToServer(form.getValues() as DcpFormValues);
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
          Record weather and location at the test point.
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

      {/* Section 2: Equipment */}
      <section className="space-y-4">
        <h3 className="font-heading text-sm font-semibold text-foreground">
          Equipment
        </h3>
        <p className="text-sm text-muted-foreground">
          DCP hammer configuration.
        </p>
        <Field label="Hammer weight (lbs)" disabled={disabled}>
          <Select
            value={form.watch("hammerWeightLbs")?.toString() ?? ""}
            onValueChange={(v) =>
              form.setValue(
                "hammerWeightLbs",
                parseFloat(v),
                { shouldDirty: true },
              )
            }
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="17.6">17.6 lbs (Standard)</SelectItem>
              <SelectItem value="10.1">10.1 lbs (Low-Mass)</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </section>

      <div className="border-t-2 border-muted pt-2" />

      {/* Section 3: Test Point */}
      <section className="space-y-4">
        <h3 className="font-heading text-sm font-semibold text-foreground">
          Test Point
        </h3>
        <p className="text-sm text-muted-foreground">
          Location and ground conditions at this test point.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Test location" disabled={disabled}>
            <Input {...form.register("testLocation")} />
          </Field>
          <Field label="Groundwater depth (in)" disabled={disabled}>
            <Input
              {...form.register("groundwaterDepthIn")}
              inputMode="decimal"
              placeholder="0.0"
            />
          </Field>
        </div>
      </section>

      <div className="border-t-2 border-muted pt-2" />

      {/* Section 4: DCP Layers */}
      <section className="space-y-4">
        <h3 className="font-heading text-sm font-semibold text-foreground">
          DCP Layers
        </h3>
        <p className="text-sm text-muted-foreground">
          Record penetration data layer by layer using the editor below.
        </p>
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
