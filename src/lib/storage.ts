type Area = "session" | "local";

function area(which: Area): Storage | null {
  try {
    return which === "session" ? window.sessionStorage : window.localStorage;
  } catch {
    return null;
  }
}

/** Reads JSON from storage. Corrupt or invalid data is discarded and the fallback returned. */
export function load<T>(which: Area, key: string, fallback: T, isValid: (v: unknown) => v is T): T {
  const store = area(which);
  if (!store) return fallback;
  try {
    const raw = store.getItem(key);
    if (raw == null) return fallback;
    const parsed: unknown = JSON.parse(raw);
    if (isValid(parsed)) return parsed;
  } catch {
    // fall through to cleanup
  }
  try {
    store.removeItem(key);
  } catch {
    // storage unavailable
  }
  return fallback;
}

export function save(which: Area, key: string, value: unknown): void {
  const store = area(which);
  if (!store) return;
  try {
    store.setItem(key, JSON.stringify(value));
  } catch {
    // quota exceeded or storage disabled: persistence is best-effort
  }
}

export function remove(which: Area, key: string): void {
  try {
    area(which)?.removeItem(key);
  } catch {
    // storage unavailable
  }
}
