import { z } from "zod";

/** Zod schema for the concrete field test form.
 *
 *  All fields are optional so the form can be saved as an incremental
 *  draft. The "submit for review" action validates required fields
 *  separately before transitioning the status.
 */
export const concreteFieldSchema = z.object({
  // Report-level fields
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

  // Concrete detail fields
  mixDesignNumber: z.string().optional(),
  designStrengthPsi: z.number().optional(),
  supplier: z.string().optional(),
  ticketNumber: z.string().optional(),
  truckNumber: z.string().optional(),
  cubicYards: z.number().optional(),
  placementLocation: z.string().optional(),
  slumpInches: z.number().optional(),
  airContentPct: z.number().optional(),
  airMethod: z.enum(["pressure", "volumetric"]).optional(),
  concreteTempF: z.number().optional(),
  ambientTempF: z.number().optional(),
  unitWeightPcf: z.number().optional(),
  admixtureNotes: z.string().optional(),
});

export type ConcreteFieldFormValues = z.infer<typeof concreteFieldSchema>;

/** Fields that must be non-empty to submit for review. */
export const REQUIRED_FOR_SUBMIT = [
  "mixDesignNumber",
  "supplier",
  "ticketNumber",
  "placementLocation",
] as const;

export function validateForSubmit(
  values: ConcreteFieldFormValues,
): string[] {
  const missing: string[] = [];
  for (const field of REQUIRED_FOR_SUBMIT) {
    const v = values[field];
    if (v === undefined || v === "") missing.push(field);
  }
  return missing;
}
