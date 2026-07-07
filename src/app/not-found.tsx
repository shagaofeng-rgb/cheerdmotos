import Link from "next/link";

export default function NotFound() {
  return (
    <main className="not-found">
      <p className="eyebrow">404</p>
      <h1>Page not found</h1>
      <p>The migrated local site does not have this route yet.</p>
      <Link className="button primary" href="/">
        Back to home
      </Link>
    </main>
  );
}
