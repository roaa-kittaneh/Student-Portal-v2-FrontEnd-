import { useCallback, useMemo, useState, type ChangeEvent } from 'react';
import { Link } from 'react-router-dom';
import { useStudents } from '../hooks/useStudents';
import { useDebounce } from '../hooks/useDebounce';
import { useLocalStorage } from '../hooks/useLocalStorage';
import StudentList from '../components/StudentList';
import ConfirmDialog from '../components/ConfirmDialog';
import Loader from '../components/Loader';
import type { Student, StudentStatus } from '../types';

/**
 * PERFORMANCE NOTES — read this with React DevTools Profiler open:
 *
 *  1. `debouncedSearch` collapses rapid keystrokes into a single recompute.
 *  2. `filterArgs` is memoized so useStudents() doesn't see a fresh object
 *     every render (would defeat its internal memo).
 *  3. `handleDelete` is wrapped in useCallback so <StudentList> (memo'd)
 *     gets a stable function reference and skips re-rendering when only
 *     local state (e.g. `pendingDelete`) changes.
 *  4. <StudentList> + <StudentCard> are both wrapped in React.memo. With
 *     stable `students` (memoized in useStudents) and stable `onDelete`,
 *     typing in the search box no longer reconciles the entire grid on
 *     every keystroke.
 *
 * To verify in DevTools:
 *   - Profile a session of typing into the search input.
 *   - Without memoization: every keystroke shows N card commits.
 *   - With memoization: only the toolbar/header commit; the list bails out
 *     until the debounced search updates.
 */
export default function StudentsPage() {
  const [search, setSearch] = useState<string>('');
  const debouncedSearch = useDebounce(search, 200);

  const [statusFilter, setStatusFilter] = useLocalStorage<StudentStatus | 'all'>(
    'sp.filter.status',
    'all'
  );
  const [majorFilter, setMajorFilter] = useLocalStorage<string>('sp.filter.major', 'all');
  const [sortBy, setSortBy] = useLocalStorage<keyof Student>('sp.sort', 'lastName');

  const filterArgs = useMemo(
    () => ({
      search: debouncedSearch,
      status: statusFilter,
      major: majorFilter,
      sortBy,
    }),
    [debouncedSearch, statusFilter, majorFilter, sortBy]
  );

  const { filtered, majors, items, status, error, deleteStudent, refresh } =
    useStudents(filterArgs);

  const [pendingDelete, setPendingDelete] = useState<Student | null>(null);
  const [deleting, setDeleting] = useState<boolean>(false);
  const [opError, setOpError] = useState<string | null>(null);

  // Stable: handed to <StudentList>; only changes if its closure deps change (none).
  const handleDelete = useCallback((s: Student) => setPendingDelete(s), []);

  const confirmDelete = useCallback(async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    setOpError(null);
    try {
      await deleteStudent(pendingDelete.id);
      setPendingDelete(null);
    } catch (err) {
      setOpError((err as Error).message || 'Failed to delete');
    } finally {
      setDeleting(false);
    }
  }, [pendingDelete, deleteStudent]);

  const cancelDelete = useCallback(() => {
    if (!deleting) setPendingDelete(null);
  }, [deleting]);

  return (
    <section>
      <header className="page-header">
        <div>
          <h1>Students</h1>
          <p className="muted">
            {status === 'succeeded'
              ? `${filtered.length} of ${items.length} shown`
              : 'Loading...'}
          </p>
        </div>
        <Link to="/students/new" className="btn btn--primary">
          + Add a student
        </Link>
      </header>

      <div className="toolbar card">
        <input
          className="toolbar__search"
          placeholder="Search by name, email, or major..."
          value={search}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StudentStatus | 'all')}
        >
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="graduated">Graduated</option>
          <option value="suspended">Suspended</option>
        </select>
        <select value={majorFilter} onChange={(e) => setMajorFilter(e.target.value)}>
          <option value="all">All majors</option>
          {majors.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as keyof Student)}
        >
          <option value="lastName">Sort: Last name</option>
          <option value="firstName">Sort: First name</option>
          <option value="gpa">Sort: GPA</option>
          <option value="enrollmentYear">Sort: Year</option>
        </select>
        <button className="btn btn--ghost" onClick={() => void refresh()}>
          Refresh
        </button>
      </div>

      {opError && <div className="alert alert--error">{opError}</div>}

      {status === 'loading' && <Loader label="Pouring the list..." />}
      {status === 'failed' && (
        <div className="alert alert--error">
          {error}{' '}
          <button className="btn btn--ghost btn--sm" onClick={() => void refresh()}>
            Retry
          </button>
        </div>
      )}

      {status === 'succeeded' && filtered.length === 0 && (
        <div className="empty card">
          <p>No students match your filters yet.</p>
          <Link to="/students/new" className="btn btn--primary">
            + Add the first one
          </Link>
        </div>
      )}

      {/* Memoized list — bails out unless `filtered` ref or `handleDelete` ref changes. */}
      <StudentList students={filtered} onDelete={handleDelete} />

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete this student?"
        message={
          pendingDelete
            ? `This will permanently remove ${pendingDelete.firstName} ${pendingDelete.lastName}.`
            : ''
        }
        confirmLabel={deleting ? 'Deleting...' : 'Yes, delete'}
        cancelLabel="Keep them"
        danger
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />
    </section>
  );
}
