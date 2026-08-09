// Best-effort localStorage persistence for in-progress form input (client-only,
// never sent to the server until the user actually submits). Falls back to a
// no-op when storage is unavailable (SSR, private browsing, quota exceeded).
const isBrowser = typeof window !== "undefined";

export function saveDraft<T>(key: string, values: T) {
  if (!isBrowser) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(values));
  } catch {
    // ignore — draft persistence is a UX nicety, not a requirement
  }
}

export function loadDraft<T>(key: string): T | null {
  if (!isBrowser) return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
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
