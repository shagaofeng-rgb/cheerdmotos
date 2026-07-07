import {requireAdminApiSession} from '@/lib/adminAuth';
import {syncGoogleSeoSnapshot} from '@/lib/googleSeo';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST() {
  const {response} = await requireAdminApiSession();
  if (response) return response;
  const snapshot = await syncGoogleSeoSnapshot();
  return Response.json({ok: snapshot.status === 'ok', snapshot}, {status: snapshot.status === 'ok' ? 200 : 500});
}
