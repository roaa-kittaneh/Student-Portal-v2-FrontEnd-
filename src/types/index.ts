/**
 * Domain types — single source of truth for what a "Student" is.
 * Importing components/hooks should always use these instead of inlining shapes.
 */

export type StudentStatus = 'active' | 'graduated' | 'suspended';

export interface Student {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  major: string;
  gpa: number;
  enrollmentYear: number;
  status: StudentStatus;
}

/** Shape submitted from the form — server assigns the id. */
export type StudentDraft = Omit<Student, 'id'>;

/** Shape used for partial updates (PUT body still needs an id). */
export type StudentInput = StudentDraft;

export type FetchStatus = 'idle' | 'loading' | 'succeeded' | 'failed';

export interface StudentFilters {
  search?: string;
  status?: StudentStatus | 'all';
  major?: string | 'all';
  sortBy?: keyof Student;
}
