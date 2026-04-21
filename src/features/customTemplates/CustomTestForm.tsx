/**
 * Tech-facing form for a custom test report.
 *
 * Responsibilities:
 *  - Render the snapshotted template fields via FormRenderer.
 *  - Debounce-save valuesJson back to the report's customTestResponse.
 *  - Handle photo uploads (Convex storage → storageIds in field values).
 *  - Surface validation issues on submit attempt (handled by the parent page).
 *
 * Save strategy: we auto-save on a 600ms debounce after any change, matching
 * the feel of existing report forms. The parent passes a single `onSave` so
 * the report detail page can wire it into its own save queue + toast system.
 */
import { useEffect, useRef, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import {
  parseTemplateFields,
  parseFieldValues,
  stringifyFieldValues,
  type TemplateField,
  type FieldValues,
  type FieldValue,
} from "../../../convex/lib/customTemplates";
import { FormRenderer, type PhotoUrlMap } from "./FormRenderer";
import { SaveIndicator } from "@/components/ui/save-indicator";
import { useSaveState } from "@/features/reports/useSaveState";
import { clearDraft, readDraft, stashDraft } from "@/lib/draftPersistence";
import { toast } from "sonner";

export type CustomTestFormProps = {
  reportId: Id<"reports">;
  detail: {
    _id: Id<"customTestResponses">;
    templateFieldsJson: string;
    templateNameAtCreation: string;
    valuesJson: string;
    photoUrls?: PhotoUrlMap;
  };
  readOnly?: boolean;
  /** Validation errors surfaced from the parent (on submit attempt). */
  errors?: string[];
};

export function CustomTestForm({
  reportId,
  detail,
  readOnly,
  errors,
}: CustomTestFormProps) {
  const updateDraft = useMutation(api.reports.mutations.updateDraft);
  const generateUploadUrl = useMutation(
    api.reports.attachments.generateUploadUrl,
  );
  const { state: saveState, savedAt, track } = useSaveState();

  let fields: TemplateField[] = [];
  try {
    fields = parseTemplateFields(detail.templateFieldsJson);
  } catch {
    fields = [];
  }

  const initial = parseFieldValues(detail.valuesJson);
  const [values, setValues] = useState<FieldValues>(initial);

  // Local recovery: if a previous session wrote a newer local copy (e.g.
  // the network failed and the tab was closed), offer to restore.
  const restoreCheckedRef = useRef(false);
  useEffect(() => {
    if (readOnly || restoreCheckedRef.current) return;
    restoreCheckedRef.current = true;
    const stashed = readDraft(reportId);
    if (!stashed) return;
    if (stashed.valuesJson === detail.valuesJson) {
      // Server already caught up — nothing to restore.
      clearDraft(reportId);
      return;
    }
    toast.message("Restore unsaved edits?", {
      description: "We found changes from a previous offline session.",
      duration: 20_000,
      action: {
        label: "Restore",
        onClick: () => {
          try {
            setValues(parseFieldValues(stashed.valuesJson));
          } catch {
            clearDraft(reportId);
          }
        },
      },
      cancel: {
        label: "Discard",
        onClick: () => clearDraft(reportId),
      },
    });
  }, [reportId, readOnly, detail.valuesJson]);

  // Debounced save queue — one outbound mutation at a time.
  const pendingRef = useRef<string | null>(null);
  const inflightRef = useRef(false);
  useEffect(() => {
    if (readOnly) return;
    const next = stringifyFieldValues(values);
    if (next === detail.valuesJson) return;
    pendingRef.current = next;
    // Always stash the latest pending locally so nothing is lost if the
    // save never lands (tab close, offline, etc.).
    stashDraft(reportId, next);
    const t = setTimeout(() => void flush(), 600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values]);

  async function flush() {
    if (inflightRef.current || pendingRef.current === null) return;
    const payload = pendingRef.current;
    pendingRef.current = null;
    inflightRef.current = true;
    try {
      await track(
        updateDraft({
          reportId,
          detail: { valuesJson: payload },
        }),
      );
      // Landed — safe to drop the local stash.
      clearDraft(reportId);
    } catch {
      // track() already flipped state to "error"; swallow so the form stays mounted.
      // The stashed copy stays in localStorage and will be restored next mount.
    } finally {
      inflightRef.current = false;
      // If newer changes queued during the save, fire again.
      if (pendingRef.current !== null) void flush();
    }
  }

  async function handleUploadPhotos(fieldId: string, files: File[]) {
    const newIds: string[] = [];
    for (const file of files) {
      const uploadUrl = await generateUploadUrl({});
      const res = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      const { storageId } = (await res.json()) as { storageId: string };
      newIds.push(storageId);
    }
    setValues((cur) => {
      const existing = cur[fieldId];
      const prev =
        existing && existing.kind === "photo" ? existing.storageIds : [];
      const next: FieldValue = {
        kind: "photo",
        storageIds: [...prev, ...newIds],
      };
      return { ...cur, [fieldId]: next };
    });
  }

  async function handleRemovePhoto(fieldId: string, storageId: string) {
    setValues((cur) => {
      const existing = cur[fieldId];
      if (!existing || existing.kind !== "photo") return cur;
      return {
        ...cur,
        [fieldId]: {
          kind: "photo",
          storageIds: existing.storageIds.filter((sid) => sid !== storageId),
        },
      };
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 rounded-sm border bg-muted/30 px-3 py-2">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Template
          </p>
          <p className="text-sm font-medium truncate">
            {detail.templateNameAtCreation}
          </p>
        </div>
        {!readOnly && (
          <SaveIndicator state={saveState} savedAt={savedAt} />
        )}
      </div>
      <FormRenderer
        fields={fields}
        values={values}
        onChange={setValues}
        readOnly={readOnly}
        photoUrls={detail.photoUrls}
        onUploadPhotos={readOnly ? undefined : handleUploadPhotos}
        onRemovePhoto={readOnly ? undefined : handleRemovePhoto}
        errors={errors}
      />
    </div>
  );
}
