import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import StudentForm from '../components/StudentForm';
import Loader from '../components/Loader';
import { useStudents } from '../hooks/useStudents';
import type { StudentDraft } from '../types';

interface Props {
  mode: 'create' | 'edit';
}

export default function StudentFormPage({ mode }: Props) {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getById, items, status, createStudent, updateStudent } = useStudents();

  const [busy, setBusy] = useState<boolean>(false);
  const isEdit = mode === 'edit';
  const existing = isEdit ? getById(id) : undefined;

  // Edge case: deep-link to /students/:id/edit before context loaded.
  useEffect(() => {
    if (!isEdit) return;
    if (status === 'succeeded' && !existing) {
      navigate('/404', { replace: true });
    }
  }, [isEdit, status, existing, navigate]);

  const handleSubmit = useCallback(
    async (values: StudentDraft) => {
      setBusy(true);
      try {
        if (isEdit) {
          await updateStudent(id, values);
          navigate(`/students/${id}`);
        } else {
          const created = await createStudent(values);
          navigate(`/students/${created.id}`);
        }
      } finally {
        setBusy(false);
      }
    },
    [isEdit, id, updateStudent, createStudent, navigate]
  );

  if (isEdit && status === 'loading' && items.length === 0) {
    return <Loader label="Looking them up..." />;
  }
  if (isEdit && !existing) return null;

  return (
    <section>
      <Link to={isEdit ? `/students/${id}` : '/students'} className="back-link">
        ← Back
      </Link>
      <h1>{isEdit ? 'Edit student' : 'Add a new student'}</h1>
      <p className="muted">
        {isEdit
          ? 'Tweak whatever needs tweaking, then save.'
          : 'Fill in their details below — only takes a minute.'}
      </p>
      <StudentForm
        initialValue={existing}
        onSubmit={handleSubmit}
        submitLabel={isEdit ? 'Save changes' : 'Create student'}
        onCancel={() => navigate(-1)}
        busy={busy}
      />
    </section>
  );
}
