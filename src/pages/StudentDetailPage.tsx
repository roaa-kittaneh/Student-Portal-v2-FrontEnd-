import { Link, useNavigate, useParams } from 'react-router-dom';
import { useFetch } from '../hooks/useFetch';
import { useStudentsContext } from '../context/StudentsContext';
import Loader from '../components/Loader';
import { useCallback, useState, type ReactNode } from 'react';
import ConfirmDialog from '../components/ConfirmDialog';
import type { Student } from '../types';

export default function StudentDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // useFetch is independent of the global store — useful for deep-links.
  const { data: student, loading, error, refetch } = useFetch<Student>(`/students/${id}`);
  const { deleteStudent } = useStudentsContext();

  const [confirming, setConfirming] = useState<boolean>(false);
  const [deleting, setDeleting] = useState<boolean>(false);

  const handleDelete = useCallback(async () => {
    setDeleting(true);
    try {
      await deleteStudent(id);
      navigate('/students', { replace: true });
    } catch (err) {
      alert((err as Error).message);
      setDeleting(false);
      setConfirming(false);
    }
  }, [deleteStudent, id, navigate]);

  if (loading) return <Loader label="Looking them up..." />;
  if (error) {
    return (
      <div className="alert alert--error">
        {error}{' '}
        <button className="btn btn--ghost btn--sm" onClick={() => void refetch()}>
          Retry
        </button>
      </div>
    );
  }
  if (!student) return null;

  return (
    <section>
      <Link to="/students" className="back-link">← Back to students</Link>

      <article className="detail card">
        <header className="detail__header">
          <h1>
            {student.firstName} {student.lastName}
          </h1>
          <span className={`pill pill--${student.status}`}>{student.status}</span>
        </header>

        <dl className="detail__grid">
          <DetailRow label="Email" value={student.email} />
          <DetailRow label="Major" value={student.major} />
          <DetailRow label="GPA" value={Number(student.gpa).toFixed(2)} />
          <DetailRow label="Enrolled" value={student.enrollmentYear} />
          <DetailRow label="ID" value={student.id} mono />
        </dl>

        <footer className="detail__actions">
          <Link to={`/students/${student.id}/edit`} className="btn btn--primary">
            Edit
          </Link>
          <button className="btn btn--danger" onClick={() => setConfirming(true)}>
            Delete
          </button>
        </footer>
      </article>

      <ConfirmDialog
        open={confirming}
        title="Delete this student?"
        message={`Permanently remove ${student.firstName} ${student.lastName}?`}
        confirmLabel={deleting ? 'Deleting...' : 'Yes, delete'}
        cancelLabel="Keep them"
        danger
        onConfirm={handleDelete}
        onCancel={() => !deleting && setConfirming(false)}
      />
    </section>
  );
}

interface DetailRowProps {
  label: string;
  value: ReactNode;
  mono?: boolean;
}

function DetailRow({ label, value, mono }: DetailRowProps) {
  return (
    <>
      <dt>{label}</dt>
      <dd className={mono ? 'mono' : ''}>{value}</dd>
    </>
  );
}
