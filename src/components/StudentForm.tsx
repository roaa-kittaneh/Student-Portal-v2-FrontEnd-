import { useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react';
import type { Student, StudentDraft, StudentStatus } from '../types';

const EMPTY: StudentDraft = {
  firstName: '',
  lastName: '',
  email: '',
  major: '',
  gpa: 0,
  enrollmentYear: new Date().getFullYear(),
  status: 'active',
};

const MAJORS = [
  'Computer Science',
  'Software Engineering',
  'Artificial Intelligence',
  'Data Science',
  'Cybersecurity',
  'Information Systems',
] as const;

type FormValues = {
  firstName: string;
  lastName: string;
  email: string;
  major: string;
  gpa: string | number;
  enrollmentYear: string | number;
  status: StudentStatus;
};

type FieldErrors = Partial<Record<keyof FormValues, string>>;

/**
 * Normalize numeric input across digit systems.
 *
 * Some keyboards / locales emit Arabic-Indic, Eastern Arabic-Indic, or other
 * Unicode digits. Number(...) only understands ASCII 0-9, so we map them
 * down before parsing. Also normalizes Arabic decimal separator and full-width
 * comma to ASCII period.
 */
function toNumeric(input: unknown): number {
  if (typeof input === 'number') return input;
  if (input == null) return NaN;

  const s = String(input)
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06F0))
    .replace(/٫/g, '.')
    .replace(/٬/g, '')
    .replace(/,/g, '')
    .trim();

  return Number(s);
}

function validate(v: FormValues): FieldErrors {
  const errs: FieldErrors = {};
  if (!String(v.firstName).trim()) errs.firstName = 'Required';
  if (!String(v.lastName).trim()) errs.lastName = 'Required';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email)) errs.email = 'Looks off, try again';
  if (!v.major) errs.major = 'Pick a major';
  const gpa = toNumeric(v.gpa);
  if (Number.isNaN(gpa) || gpa < 0 || gpa > 4) errs.gpa = 'Between 0.0 and 4.0';
  const yr = toNumeric(v.enrollmentYear);
  if (!Number.isInteger(yr) || yr < 1990 || yr > 2100) errs.enrollmentYear = 'Invalid year';
  return errs;
}

interface Props {
  initialValue?: Student | StudentDraft;
  onSubmit: (draft: StudentDraft) => Promise<unknown>;
  submitLabel?: string;
  onCancel?: () => void;
  busy?: boolean;
}

export default function StudentForm({
  initialValue,
  onSubmit,
  submitLabel = 'Save',
  onCancel,
  busy,
}: Props) {
  const [values, setValues] = useState<FormValues>(() => ({
    ...EMPTY,
    ...(initialValue as Partial<FormValues> | undefined),
  }));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  const set =
    (k: keyof FormValues) =>
    (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setValues((v) => ({ ...v, [k]: e.target.value }));

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitError(null);
    const errs = validate(values);
    setErrors(errs);
    if (Object.keys(errs).length) return;

    try {
      await onSubmit({
        firstName: String(values.firstName).trim(),
        lastName: String(values.lastName).trim(),
        email: String(values.email).trim(),
        major: values.major,
        status: values.status,
        gpa: toNumeric(values.gpa),
        enrollmentYear: toNumeric(values.enrollmentYear),
      });
    } catch (err) {
      setSubmitError((err as Error).message || 'Submission failed');
    }
  };

  return (
    <form className="form card" onSubmit={handleSubmit} noValidate>
      <div className="form__row">
        <Field label="First name" error={errors.firstName}>
          <input value={values.firstName} onChange={set('firstName')} autoFocus />
        </Field>
        <Field label="Last name" error={errors.lastName}>
          <input value={values.lastName} onChange={set('lastName')} />
        </Field>
      </div>

      <Field label="Email" error={errors.email}>
        <input type="email" value={values.email} onChange={set('email')} />
      </Field>

      <div className="form__row">
        <Field label="Major" error={errors.major}>
          <select value={values.major} onChange={set('major')}>
            <option value="">Select</option>
            {MAJORS.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </Field>
        <Field label="Status">
          <select value={values.status} onChange={set('status')}>
            <option value="active">Active</option>
            <option value="graduated">Graduated</option>
            <option value="suspended">Suspended</option>
          </select>
        </Field>
      </div>

      <div className="form__row">
        <Field label="GPA" error={errors.gpa}>
          <input
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            max="4"
            value={values.gpa}
            onChange={set('gpa')}
          />
        </Field>
        <Field label="Enrollment year" error={errors.enrollmentYear}>
          <input
            type="number"
            inputMode="numeric"
            min="1990"
            max="2100"
            value={values.enrollmentYear}
            onChange={set('enrollmentYear')}
          />
        </Field>
      </div>

      {submitError && <div className="alert alert--error">{submitError}</div>}

      <div className="form__actions">
        {onCancel && (
          <button type="button" className="btn btn--ghost" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
        )}
        <button type="submit" className="btn btn--primary" disabled={busy}>
          {busy ? 'Saving...' : submitLabel}
        </button>
      </div>
    </form>
  );
}

interface FieldProps {
  label: string;
  error?: string;
  children: ReactNode;
}

function Field({ label, error, children }: FieldProps) {
  return (
    <label className={`field${error ? ' field--error' : ''}`}>
      <span className="field__label">{label}</span>
      {children}
      {error && <span className="field__error">{error}</span>}
    </label>
  );
}
