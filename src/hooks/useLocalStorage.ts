import { useCallback, useEffect, useState } from 'react';

type Updater<T> = T | ((prev: T) => T);

/**
 * Synchronizes React state with `localStorage`.
 *
 * - Reads lazily on first render (avoids SSR `window` traps).
 * - Survives JSON parse failures (returns initialValue).
 * - Cross-tab sync via the `storage` event.
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (next: Updater<T>) => void] {
  const read = useCallback((): T => {
    if (typeof window === 'undefined') return initialValue;
    try {
      const raw = window.localStorage.getItem(key);
      return raw === null ? initialValue : (JSON.parse(raw) as T);
    } catch {
      return initialValue;
    }
  }, [key, initialValue]);

  const [value, setValue] = useState<T>(read);

  // Stable per-key writer; consumers can pass it to memoized children safely.
  const update = useCallback(
    (next: Updater<T>) => {
      setValue((prev) => {
        const resolved =
          typeof next === 'function' ? (next as (p: T) => T)(prev) : next;
        try {
          window.localStorage.setItem(key, JSON.stringify(resolved));
        } catch {
          /* quota exceeded — silently ignore */
        }
        return resolved;
      });
    },
    [key]
  );

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === key) setValue(read());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [key, read]);

  return [value, update];
}
