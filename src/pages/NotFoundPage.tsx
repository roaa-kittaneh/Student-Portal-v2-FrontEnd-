import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <section className="not-found">
      <h1>404</h1>
      <p>That page could not be found.</p>
      <Link to="/" className="btn btn--primary">Take me home</Link>
    </section>
  );
}
