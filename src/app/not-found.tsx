import Link from "next/link";

export default function NotFound() {
  return (
    <main className="not-found">
      <p className="eyebrow">404</p>
      <h1>Page not found</h1>
      <p>We could not find that CHEERDMOTO page. Use the homepage, search, or support links to continue.</p>
      <Link className="button primary" href="/">
        Back to home
      </Link>
    </main>
  );
}
