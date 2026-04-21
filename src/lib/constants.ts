/** Human-readable labels for report kinds. */
export const KIND_LABELS: Record<string, string> = {
  concrete_field: "Concrete Field Test",
  nuclear_density: "Nuclear Density",
  proof_roll: "Proof Roll",
  dcp: "DCP",
  pile_load: "Pile Load Test",
  custom: "Custom Test",
};

/**
 * Display label for a report. For `custom` reports we prefer the template
 * name (snapshotted at creation) so the UI shows e.g. "Sieve Analysis"
 * rather than the generic "Custom Test".
 */
export function reportKindLabel(
  kind: string,
  templateName?: string | null,
): string {
  if (kind === "custom" && templateName) return templateName;
  return KIND_LABELS[kind] ?? kind;
}
