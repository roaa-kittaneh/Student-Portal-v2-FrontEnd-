import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type ReactNode,
} from 'react';
import { api, ApiError, isAbortError } from '../api/client';
import type { FetchStatus, Student, StudentDraft } from '../types';

/**
 * Global students store.
 *
 * Why useReducer over useState:
 *   - Multiple, related state slices (list, status, error).
 *   - Discrete, named transitions are easier to reason about than ad-hoc setState chains.
 *   - Reducer is pure - trivially unit-testable.
 *
 * Why expose memoized callbacks via useMemo on the context value:
 *   - Consumer components that rely on these handlers (e.g. memoized lists) won't
 *     re-render unnecessarily because the function references stay stable across
 *     re-renders.
 */

type State = {
  items: Student[];
  status: FetchStatus;
  error: string | null;
};

type Action =
  | { type: 'fetch/pending' }
  | { type: 'fetch/fulfilled'; payload: Student[] }
  | { type: 'fetch/rejected'; error: string }
  | { type: 'create/fulfilled'; payload: Student }
  | { type: 'update/fulfilled'; payload: Student }
  | { type: 'delete/fulfilled'; id: string };

const initialState: State = {
  items: [],
  status: 'idle',
  error: null,
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'fetch/pending':
      return { ...state, status: 'loading', error: null };
    case 'fetch/fulfilled':
      return { items: action.payload, status: 'succeeded', error: null };
    case 'fetch/rejected':
      return { ...state, status: 'failed', error: action.error };
    case 'create/fulfilled':
      return { ...state, items: [...state.items, action.payload] };
    case 'update/fulfilled':
      return {
        ...state,
        items: state.items.map((s) =>
          s.id === action.payload.id ? action.payload : s
        ),
      };
    case 'delete/fulfilled':
      return { ...state, items: state.items.filter((s) => s.id !== action.id) };
    default:
      return state;
  }
}

export interface StudentsContextValue extends State {
  refresh: () => Promise<void>;
  createStudent: (draft: StudentDraft) => Promise<Student>;
  updateStudent: (id: string, patch: StudentDraft) => Promise<Student>;
  deleteStudent: (id: string) => Promise<void>;
}

const StudentsContext = createContext<StudentsContextValue | null>(null);

export function StudentsProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const abortRef = useRef<AbortController | null>(null);

  const fetchStudents = useCallback(async () => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    dispatch({ type: 'fetch/pending' });
    try {
      const data = await api.get<Student[]>('/students', { signal: ctrl.signal });
      dispatch({ type: 'fetch/fulfilled', payload: data });
    } catch (err) {
      if (isAbortError(err)) return;
      dispatch({
        type: 'fetch/rejected',
        error: err instanceof ApiError ? err.message : 'Failed to load students',
      });
    }
  }, []);

  useEffect(() => {
    void fetchStudents();
    return () => abortRef.current?.abort();
  }, [fetchStudents]);

  const createStudent = useCallback(async (draft: StudentDraft) => {
    // Generate the id client-side to bypass a JSON Server quirk:
    // when the existing collection contains non-numeric ids (e.g. "nmw5caZ"),
    // its auto-increment strategy can throw 500. Sending an explicit id
    // sidesteps the issue entirely - lowdb just stores what we send.
    const id =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `s_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

    const created = await api.post<Student>('/students', { id, ...draft });
    dispatch({ type: 'create/fulfilled', payload: created });
    return created;
  }, []);

  const updateStudent = useCallback(async (id: string, patch: StudentDraft) => {
    const updated = await api.put<Student>(`/students/${id}`, { id, ...patch });
    dispatch({ type: 'update/fulfilled', payload: updated });
    return updated;
  }, []);

  const deleteStudent = useCallback(async (id: string) => {
    await api.delete<void>(`/students/${id}`);
    dispatch({ type: 'delete/fulfilled', id });
  }, []);

  const value = useMemo<StudentsContextValue>(
    () => ({
      ...state,
      refresh: fetchStudents,
      createStudent,
      updateStudent,
      deleteStudent,
    }),
    [state, fetchStudents, createStudent, updateStudent, deleteStudent]
  );

  return <StudentsContext.Provider value={value}>{children}</StudentsContext.Provider>;
}

export function useStudentsContext(): StudentsContextValue {
  const ctx = useContext(StudentsContext);
  if (!ctx) {
    throw new Error('useStudentsContext must be used within <StudentsProvider>.');
  }
  return ctx;
}
