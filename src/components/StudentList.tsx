import { memo } from 'react';
import StudentCard from './StudentCard';
import type { Student } from '../types';

/**
 * Memoized list container. Wrapping the list itself (in addition to each card)
 * gives us two layers of bailout:
 *
 *   1. If only the search/filter UI rerenders (e.g. typing keystrokes that
 *      haven't yet triggered a debounce update), the list as a whole skips
 *      reconciliation because `students` and `onDelete` references are stable.
 *
 *   2. If the list does re-render but most students are unchanged, each
 *      memo'd <StudentCard> bails out individually.
 *
 * KEYS: we use `student.id` — a stable, unique, server-assigned identifier.
 * NEVER use the array index as a key here: indices shift when items are
 * inserted, removed, or sorted, which would force React to unmount and remount
 * cards instead of reordering them. Stable keys = stable component instances
 * = preserved internal state and minimal DOM mutations.
 */

interface Props {
  students: Student[];
  onDelete: (s: Student) => void;
}

function StudentList({ students, onDelete }: Props) {
  return (
    <div className="grid">
      {students.map((s) => (
        <StudentCard key={s.id} student={s} onDelete={onDelete} />
      ))}
    </div>
  );
}

StudentList.displayName = 'StudentList';

export default memo(StudentList);
