import { memo } from 'react';
import { Link } from 'react-router-dom';
import type { Student } from '../types';

/**
 * PERFORMANCE: wrapped in React.memo at the bottom of this file.
 *
 * Why: StudentCard is rendered N times inside <StudentList>. When the parent
 * re-renders (e.g., user types in the search box), every card would otherwise
 * reconcile. With memo + stable props (student object identity from the
 * reducer; onDelete wrapped in useCallback), only cards whose `student`
 * actually changed will reconcile.
 *
 * Caveat: memo uses Object.is shallow comparison. If you ever pass an inline
 * object/array/function as a prop, memo becomes a no-op. The list always
 * passes the same `onDelete` callback reference and the same student
 * reference — that's why this works.
 */

interface Props {
  student: Student;
  onDelete: (s: Student) => void;
}

const initials = (s: Student): string =>
  `${s.firstName?.[0] ?? ''}${s.lastName?.[0] ?? ''}`.toUpperCase();

function StudentCard({ student, onDelete }: Props) {
  return (
    <article className="card student-card">
      <div className="student-card__avatar" aria-hidden="true">
        {initials(student)}
      </div>

      <div className="student-card__body">
        <h3 className="student-card__name">
          <Link to={`/students/${student.id}`}>
            {student.firstName} {student.lastName}
          </Link>
        </h3>
        <p className="student-card__meta">
          <span>{student.major}</span>
          <span className="dot" />
          <span>GPA {Number(student.gpa).toFixed(2)}</span>
          <span className="dot" />
          <span className={`pill pill--${student.status}`}>{student.status}</span>
        </p>
        <p className="student-card__email">{student.email}</p>
      </div>

      <div className="student-card__actions">
        <Link to={`/students/${student.id}/edit`} className="btn btn--ghost btn--sm">
          Edit
        </Link>
        <button
          className="btn btn--danger btn--sm"
          onClick={() => onDelete(student)}
          aria-label={`Delete ${student.firstName} ${student.lastName}`}
        >
          Delete
        </button>
      </div>
    </article>
  );
}

// Display name helps a lot when reading flame graphs in React DevTools Profiler.
StudentCard.displayName = 'StudentCard';

export default memo(StudentCard);
