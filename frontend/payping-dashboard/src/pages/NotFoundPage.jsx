import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <main className="not-found">
      <h1>404</h1>
      <p>That page doesn&apos;t exist.</p>
      <Link to="/">Go home</Link>
    </main>
  );
}
