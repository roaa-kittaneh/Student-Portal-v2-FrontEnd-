import { useEffect, useRef, useState, useCallback } from 'react';
import { api, isAbortError } from '../api/client';

/**
 * Generic GET hook with abort + manual refetch.
 *
 * Use this for ad-hoc reads (e.g., fetching a single resource on a detail page)
 * where you don't want to pollute global context.
 */
export interface UseFetchOptions {
  enabled?: boolean;
}

export interface UseFetchResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useFetch<T>(path: string, options: UseFetchOptions = {}): UseFetchResult<T> {
  const { enabled = true } = options;
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(enabled);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Stable identity per `path`. The closure only captures `path`, so the
  // dependency array contains exactly that — no missed updates, no stale closures.
  const run = useCallback(async () => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setLoading(true);
    setError(null);
    try {
      const result = await api.get<T>(path, { signal: ctrl.signal });
      setData(result);
    } catch (err) {
      if (isAbortError(err)) return;
      setError((err as Error).message || 'Request failed');
    } finally {
      setLoading(false);
    }
  }, [path]);

  // Re-runs when the URL changes or `enabled` flips on. Cleanup aborts inflight.
  useEffect(() => {
    if (!enabled) return undefined;
    void run();
    return () => abortRef.current?.abort();
  }, [enabled, run]);

  return { data, loading, error, refetch: run };
}
