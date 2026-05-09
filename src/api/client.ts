/**
 * Thin fetch wrapper.
 * - Centralized base URL (proxied by Vite to the local mock API).
 * - Throws ApiError with `kind` so the UI can branch on `network` vs `http`.
 * - Accepts AbortSignal for cancellation.
 *
 * Why a discriminated `kind`:
 *   A 500 from the API and an unreachable backend look identical to a
 *   naive `fetch().then()` chain - both reject - but the user-facing message
 *   should differ. Network errors mean "the server isn't running"; HTTP 5xx
 *   means "the server is running but rejected this request."
 */

const BASE_URL = '/api';

export type ApiErrorKind = 'network' | 'http' | 'aborted' | 'unknown';

export interface ApiErrorOptions {
  kind?: ApiErrorKind;
  status?: number;
  payload?: unknown;
}

export class ApiError extends Error {
  kind: ApiErrorKind;
  status?: number;
  payload?: unknown;

  constructor(message: string, { kind = 'unknown', status, payload }: ApiErrorOptions = {}) {
    super(message);
    this.name = 'ApiError';
    this.kind = kind;
    this.status = status;
    this.payload = payload;
  }
}

export function isAbortError(err: unknown): boolean {
  if (err instanceof ApiError && err.kind === 'aborted') return true;
  return err instanceof Error && err.name === 'AbortError';
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  signal?: AbortSignal;
  headers?: Record<string, string>;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, signal, headers } = options;

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method,
      signal,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    if ((err as Error).name === 'AbortError') {
      throw new ApiError('Request aborted', { kind: 'aborted' });
    }
    throw new ApiError(
      'Cannot reach the API server. Is `npm run server` running on port 4001?',
      { kind: 'network' }
    );
  }

  let payload: unknown = null;
  const text = await res.text();
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = text;
    }
  }

  if (!res.ok) {
    const serverMsg =
      typeof payload === 'string'
        ? payload
        : (payload as { message?: string } | null)?.message;
    const message =
      serverMsg ??
      (res.status === 500
        ? 'Server error (500). Check the mock API console - db.json may be invalid or the API may have crashed.'
        : `Request failed (${res.status})`);
    throw new ApiError(message, { kind: 'http', status: res.status, payload });
  }

  return payload as T;
}

export const api = {
  get: <T>(path: string, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...options, method: 'GET' }),
  post: <T>(path: string, body: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...options, method: 'POST', body }),
  put: <T>(path: string, body: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...options, method: 'PUT', body }),
  patch: <T>(path: string, body: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...options, method: 'PATCH', body }),
  delete: <T>(path: string, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...options, method: 'DELETE' }),
};
