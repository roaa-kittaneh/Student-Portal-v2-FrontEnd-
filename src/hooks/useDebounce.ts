import { useEffect, useState } from 'react';

/**
 * Returns a debounced copy of `value` that only updates after `delay` ms
 * of stillness. Used to throttle search input → list filtering.
 *
 * Why this matters for performance:
 *   - Filtering N students on every keystroke causes O(N) recomputation per char.
 *   - Debouncing collapses bursts of input into one re-render.
 */
export function useDebounce<T>(value: T, delay: number = 250): T {
  const [debounced, setDebounced] = useState<T>(value);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);

  return debounced;
}
