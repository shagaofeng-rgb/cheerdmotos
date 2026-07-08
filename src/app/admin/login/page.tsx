import AdminLoginForm from '@/components/AdminLoginForm';

export default async function AdminLoginPage({searchParams}: {searchParams: Promise<{error?: string; reset?: string}>}) {
  const query = await searchParams;

  return (
    <main className="admin-login-page">
      <AdminLoginForm hasError={Boolean(query.error)} hasResetNotice={Boolean(query.reset)} />
    </main>
  );
}
