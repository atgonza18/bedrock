/**
 * Local-storage backed draft recovery for custom report forms.
 *
 * Purpose: if the user's save fails (offline, flaky network, tab closed
 * mid-flight), we retain their latest typed values on the device. On next
 * mount we can detect a stale server copy and offer to restore.
 *
 * Why localStorage not IndexedDB: the payload is a small JSON blob
 * (valuesJson) keyed by reportId. localStorage is synchronous, has no
 * upgrade/transaction surface, and is ~5MB per origin — plenty for drafts.
 *
 * Photos are a separate concern (large Blobs, Convex storage uploads);
 * they're not handled here.
 */

const NAMESPACE = "bedrock.draft";
const MAX_ENTRIES = 50;

type StoredDraft = {
  reportId: string;
  valuesJson: string;
  savedAt: number;
};

function storageAvailable(): boolean {
  try {
    const k = "__bedrock_probe__";
    localStorage.setItem(k, "1");
    localStorage.removeItem(k);
    return true;
  } catch {
    return false;
  }
}

function key(reportId: string): string {
  return `${NAMESPACE}:${reportId}`;
}

export function stashDraft(reportId: string, valuesJson: string): void {
  if (!storageAvailable()) return;
  try {
    const payload: StoredDraft = {
      reportId,
      valuesJson,
      savedAt: Date.now(),
    };
    localStorage.setItem(key(reportId), JSON.stringify(payload));
    pruneIfOverflowing();
  } catch {
    // Storage full or blocked — silently skip. We'll retry on next edit.
  }
}

export function readDraft(reportId: string): StoredDraft | null {
  if (!storageAvailable()) return null;
  try {
    const raw = localStorage.getItem(key(reportId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredDraft;
    if (!parsed || typeof parsed.valuesJson !== "string") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearDraft(reportId: string): void {
  if (!storageAvailable()) return;
  try {
    localStorage.removeItem(key(reportId));
  } catch {
    // ignore
  }
}

/**
 * Cap total stashed drafts. Oldest first out. Runs on every stash so
 * we don't balloon over time (e.g. if a user drafts 200 reports).
 */
function pruneIfOverflowing() {
  try {
    const entries: Array<{ k: string; at: number }> = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k || !k.startsWith(`${NAMESPACE}:`)) continue;
      try {
        const raw = localStorage.getItem(k);
        if (!raw) continue;
        const parsed = JSON.parse(raw) as StoredDraft;
        entries.push({ k, at: parsed.savedAt ?? 0 });
      } catch {
        // corrupted — toss it
        localStorage.removeItem(k);
      }
    }
    if (entries.length <= MAX_ENTRIES) return;
    entries.sort((a, b) => a.at - b.at);
    const toRemove = entries.slice(0, entries.length - MAX_ENTRIES);
    for (const e of toRemove) localStorage.removeItem(e.k);
  } catch {
    // ignore
  }
}
