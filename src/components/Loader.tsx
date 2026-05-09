interface LoaderProps {
  label?: string;
  inline?: boolean;
}

export default function Loader({ label = 'One moment...', inline = false }: LoaderProps) {
  return (
    <div
      className={`loader ${inline ? 'loader--inline' : ''}`}
      role="status"
      aria-live="polite"
    >
      <span className="loader__spinner" aria-hidden="true" />
      <span className="loader__label">{label}</span>
    </div>
  );
}
