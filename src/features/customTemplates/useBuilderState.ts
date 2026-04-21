/**
 * Unified builder state: name, description, fields — plus undo/redo history
 * and debounced auto-save.
 *
 * History model: we snapshot on every meaningful user action (add/remove/
 * reorder/label edit), coalescing rapid-fire changes to the same field
 * within 400ms into a single undo step. This is the Figma / Notion pattern —
 * users don't want to undo one keystroke at a time.
 *
 * Auto-save is debounced at 1200ms. Each auto-save also snapshots to history
 * so manual Cmd-Z doesn't resurrect already-saved state out of order.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import type { TemplateField } from "../../../convex/lib/customTemplates";

export type BuilderSnapshot = {
  name: string;
  description: string;
  fields: TemplateField[];
};

export type SaveStatus = "idle" | "dirty" | "saving" | "saved" | "error";

export type BuilderStateApi = {
  name: string;
  description: string;
  fields: TemplateField[];
  selectedId: string | null;
  collapsedSectionIds: Set<string>;
  saveStatus: SaveStatus;
  lastSavedAt: number | null;
  canUndo: boolean;
  canRedo: boolean;
  setName: (v: string) => void;
  setDescription: (v: string) => void;
  setFields: (next: TemplateField[] | ((prev: TemplateField[]) => TemplateField[])) => void;
  replaceAll: (snap: BuilderSnapshot) => void;
  setSelectedId: (id: string | null) => void;
  toggleSectionCollapse: (id: string) => void;
  undo: () => void;
  redo: () => void;
  forceFlush: () => Promise<void>;
  markSaved: () => void;
  markError: () => void;
};

const COALESCE_WINDOW_MS = 400;
const AUTOSAVE_DEBOUNCE_MS = 1200;
const HISTORY_LIMIT = 80;

export function useBuilderState(
  initial: BuilderSnapshot,
  saveFn: (snap: BuilderSnapshot) => Promise<void>,
): BuilderStateApi {
  const [name, setNameState] = useState(initial.name);
  const [description, setDescriptionState] = useState(initial.description);
  const [fields, setFieldsState] = useState<TemplateField[]>(initial.fields);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [collapsedSectionIds, setCollapsedSectionIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);

  // Refs for the history stack. We use refs (not state) because history
  // mutations shouldn't trigger re-renders on their own — only the canUndo/
  // canRedo booleans need to be mirrored to state for the UI.
  const pastRef = useRef<BuilderSnapshot[]>([]);
  const futureRef = useRef<BuilderSnapshot[]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const lastPushAtRef = useRef<number>(0);
  const lastPushKeyRef = useRef<string>("");

  const savedSnapshotRef = useRef<BuilderSnapshot>(initial);
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refreshHistoryFlags = () => {
    setCanUndo(pastRef.current.length > 0);
    setCanRedo(futureRef.current.length > 0);
  };

  const currentSnapshot = useCallback(
    (): BuilderSnapshot => ({ name, description, fields }),
    [name, description, fields],
  );

  const pushHistory = useCallback(
    (prev: BuilderSnapshot, coalesceKey?: string) => {
      const now = Date.now();
      const canCoalesce =
        coalesceKey &&
        coalesceKey === lastPushKeyRef.current &&
        now - lastPushAtRef.current < COALESCE_WINDOW_MS;
      if (canCoalesce) {
        // Keep the existing history entry — don't push.
        lastPushAtRef.current = now;
        return;
      }
      pastRef.current.push(prev);
      if (pastRef.current.length > HISTORY_LIMIT) pastRef.current.shift();
      futureRef.current.length = 0;
      lastPushAtRef.current = now;
      lastPushKeyRef.current = coalesceKey ?? "";
      refreshHistoryFlags();
    },
    [],
  );

  const scheduleAutoSave = useCallback(() => {
    setSaveStatus("dirty");
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = setTimeout(() => {
      void flush();
    }, AUTOSAVE_DEBOUNCE_MS);
  }, []);

  const flush = useCallback(async () => {
    const snap = currentSnapshot();
    // Skip if nothing changed since last successful save.
    if (
      savedSnapshotRef.current.name === snap.name &&
      savedSnapshotRef.current.description === snap.description &&
      JSON.stringify(savedSnapshotRef.current.fields) ===
        JSON.stringify(snap.fields)
    ) {
      if (saveStatus !== "saved" && saveStatus !== "idle") setSaveStatus("idle");
      return;
    }
    setSaveStatus("saving");
    try {
      await saveFn(snap);
      savedSnapshotRef.current = snap;
      setLastSavedAt(Date.now());
      setSaveStatus("saved");
    } catch {
      setSaveStatus("error");
    }
  }, [currentSnapshot, saveFn, saveStatus]);

  const setName = useCallback(
    (v: string) => {
      pushHistory(currentSnapshot(), "name");
      setNameState(v);
      scheduleAutoSave();
    },
    [currentSnapshot, pushHistory, scheduleAutoSave],
  );

  const setDescription = useCallback(
    (v: string) => {
      pushHistory(currentSnapshot(), "description");
      setDescriptionState(v);
      scheduleAutoSave();
    },
    [currentSnapshot, pushHistory, scheduleAutoSave],
  );

  const setFields = useCallback(
    (next: TemplateField[] | ((prev: TemplateField[]) => TemplateField[])) => {
      pushHistory(currentSnapshot(), "fields");
      setFieldsState((prev) =>
        typeof next === "function"
          ? (next as (p: TemplateField[]) => TemplateField[])(prev)
          : next,
      );
      scheduleAutoSave();
    },
    [currentSnapshot, pushHistory, scheduleAutoSave],
  );

  const replaceAll = useCallback(
    (snap: BuilderSnapshot) => {
      pushHistory(currentSnapshot(), "replaceAll");
      setNameState(snap.name);
      setDescriptionState(snap.description);
      setFieldsState(snap.fields);
      scheduleAutoSave();
    },
    [currentSnapshot, pushHistory, scheduleAutoSave],
  );

  const undo = useCallback(() => {
    const prev = pastRef.current.pop();
    if (!prev) return;
    futureRef.current.push(currentSnapshot());
    setNameState(prev.name);
    setDescriptionState(prev.description);
    setFieldsState(prev.fields);
    refreshHistoryFlags();
    scheduleAutoSave();
  }, [currentSnapshot, scheduleAutoSave]);

  const redo = useCallback(() => {
    const next = futureRef.current.pop();
    if (!next) return;
    pastRef.current.push(currentSnapshot());
    setNameState(next.name);
    setDescriptionState(next.description);
    setFieldsState(next.fields);
    refreshHistoryFlags();
    scheduleAutoSave();
  }, [currentSnapshot, scheduleAutoSave]);

  const toggleSectionCollapse = useCallback((id: string) => {
    setCollapsedSectionIds((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const forceFlush = useCallback(async () => {
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    await flush();
  }, [flush]);

  const markSaved = useCallback(() => setSaveStatus("saved"), []);
  const markError = useCallback(() => setSaveStatus("error"), []);

  // Clear the autosave timer on unmount.
  useEffect(() => {
    return () => {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    };
  }, []);

  return {
    name,
    description,
    fields,
    selectedId,
    collapsedSectionIds,
    saveStatus,
    lastSavedAt,
    canUndo,
    canRedo,
    setName,
    setDescription,
    setFields,
    replaceAll,
    setSelectedId,
    toggleSectionCollapse,
    undo,
    redo,
    forceFlush,
    markSaved,
    markError,
  };
}
