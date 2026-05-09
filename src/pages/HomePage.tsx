import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useStudents } from '../hooks/useStudents';
import Loader from '../components/Loader';

/**
 * Stats are derived state — pure function of `items`. We memoize so the
 * reduce only re-runs when items reference changes, not when this component
 * re-renders for unrelated reasons (e.g. parent route transitions).
 */
export default function HomePage() {
  const { items, status, error } = useStudents();

  const stats = useMemo(() => {
    const acc = items.reduce(
      (a, s) => {
        a.total += 1;
        a[s.status] = (a[s.status] ?? 0) + 1;
        a.gpaSum += s.gpa;
        return a;
      },
      { total: 0, gpaSum: 0 } as Record<string, number>
    );
    return {
      total: acc.total,
      active: acc.active ?? 0,
      graduated: acc.graduated ?? 0,
      avgGpa: acc.total ? (acc.gpaSum / acc.total).toFixed(2) : '—',
    };
  }, [items]);

  return (
    <section className="home">
      <div className="hero">
        <p className="hero__greeting">Hey there</p>
        <h1>Welcome to your Student Portal.</h1>
        <p className="hero__sub">
          A calmer place to manage students. Browse the roster, jot down a new
          arrival, or peek at how things are going at a glance.
        </p>
        <div className="hero__cta">
          <Link to="/students" className="btn btn--primary">Browse students</Link>
          <Link to="/students/new" className="btn btn--ghost">+ Add a new one</Link>
        </div>
      </div>

      <div className="stats">
        {status === 'loading' && <Loader label="Counting heads..." />}
        {status === 'failed' && <div className="alert alert--error">{error}</div>}
        {status === 'succeeded' && (
          <>
            <Stat label="Total students" value={stats.total} />
            <Stat label="Active" value={stats.active} />
            <Stat label="Graduated" value={stats.graduated} />
            <Stat label="Avg GPA" value={stats.avgGpa} />
          </>
        )}
      </div>
    </section>
  );
}

interface StatProps {
  label: string;
  value: string | number;
}

function Stat({ label, value }: StatProps) {
  return (
    <div className="stat card">
      <div className="stat__value">{value}</div>
      <div className="stat__label">{label}</div>
    </div>
  );
}
