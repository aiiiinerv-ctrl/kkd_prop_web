// Best-effort localStorage persistence for in-progress form input (client-only,
// never sent to the server until the user actually submits). Falls back to a
// no-op when storage is unavailable (SSR, private browsing, quota exceeded).
const isBrowser = typeof window !== "undefined";

// Drafts older than this are treated as if they don't exist and are removed
// on next read (#14 decision 2) — long enough to cover "closed the tab by
// accident" / "went to check the calculator and came back", short enough
// that a shared computer doesn't carry someone else's info across days.
const DRAFT_TTL_MS = 24 * 60 * 60 * 1000;

type StoredDraft<T> = { savedAt: number; values: T };

export function saveDraft<T>(key: string, values: T) {
  if (!isBrowser) return;
  try {
    const payload: StoredDraft<T> = { savedAt: Date.now(), values };
    window.localStorage.setItem(key, JSON.stringify(payload));
  } catch {
    // ignore — draft persistence is a UX nicety, not a requirement
  }
}

export function loadDraft<T>(key: string): T | null {
  if (!isBrowser) return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredDraft<T>>;
    if (!parsed || typeof parsed.savedAt !== "number" || !("values" in parsed)) {
      return null;
    }
    if (Date.now() - parsed.savedAt > DRAFT_TTL_MS) {
      window.localStorage.removeItem(key);
      return null;
    }
    return parsed.values as T;
  } catch {
    return null;
  }
}

export function clearDraft(key: string) {
  if (!isBrowser) return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

/** Clears every draft key in one call — used on successful submit (#14 decision 2). */
export function clearDrafts(keys: string[]) {
  for (const key of keys) clearDraft(key);
}

/**
 * The one place that decides what a field is worth when the same booking
 * form field can come from three sources at once (#14 decision 1):
 * cross-tab base draft, this tab's own draft, and a query param from the
 * link the user just clicked. Precedence is base -> tab draft -> URL param,
 * and a URL param only wins the fields it actually names — everything else
 * in the merged result still comes from the draft.
 */
export function mergeDraftForForm<T extends Record<string, unknown>>(
  base: Partial<T> | null,
  tabDraft: Partial<T> | null,
  urlParams: Partial<T>
): Partial<T> {
  const merged: Record<keyof T, unknown> = {
    ...(base ?? {}),
    ...(tabDraft ?? {}),
  } as Record<keyof T, unknown>;
  for (const key of Object.keys(urlParams) as (keyof T)[]) {
    const value = urlParams[key];
    if (value !== undefined && value !== "" && value !== null) {
      merged[key] = value;
    }
  }
  return merged as Partial<T>;
}
