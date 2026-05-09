import { useMemo } from 'react';
import { useStudentsContext, type StudentsContextValue } from '../context/StudentsContext';
import type { Student, StudentFilters } from '../types';

export interface UseStudentsResult extends StudentsContextValue {
  filtered: Student[];
  majors: string[];
  getById: (id: string) => Student | undefined;
}

/**
 * Domain hook on top of StudentsContext.
 *
 * Performance notes:
 *   - `filtered` is wrapped in useMemo so the O(N log N) sort + filter only
 *     re-runs when items or filter inputs actually change. Without this, every
 *     parent re-render would redo the whole pipeline.
 *   - The filter object is destructured into primitive deps so React's shallow
 *     compare doesn't trip on a new {} every render — even if the parent forgets
 *     to memoize the `filters` arg.
 */
export function useStudents(filters: StudentFilters = {}): UseStudentsResult {
  const ctx = useStudentsContext();
  const { items } = ctx;

  const { search = '', status = 'all', major = 'all', sortBy = 'lastName' } = filters;

  const filtered = useMemo<Student[]>(() => {
    const q = search.trim().toLowerCase();

    let out = items;

    if (status !== 'all') {
      out = out.filter((s) => s.status === status);
    }
    if (major !== 'all') {
      out = out.filter((s) => s.major === major);
    }
    if (q) {
      out = out.filter((s) =>
        [s.firstName, s.lastName, s.email, s.major].some((f) =>
          String(f).toLowerCase().includes(q)
        )
      );
    }

    return [...out].sort((a, b) => {
      const av = a[sortBy];
      const bv = b[sortBy];
      if (typeof av === 'number' && typeof bv === 'number') return bv - av; // numbers desc
      return String(av).localeCompare(String(bv));
    });
    // Primitive deps keep this hot — no churn from referential equality of `filters`.
  }, [items, search, status, major, sortBy]);

  const majors = useMemo<string[]>(
    () => Array.from(new Set(items.map((s) => s.major))).sort(),
    [items]
  );

  const getById = (id: string): Student | undefined =>
    items.find((s) => String(s.id) === String(id));

  return { ...ctx, filtered, majors, getById };
}
