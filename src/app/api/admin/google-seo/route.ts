import {requireAdminApiSession} from '@/lib/adminAuth';
import {googleSeoConfigStatus, readGoogleSeoSnapshot} from '@/lib/googleSeo';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const {response} = await requireAdminApiSession();
  if (response) return response;
  return Response.json({
    config: googleSeoConfigStatus(),
    snapshot: await readGoogleSeoSnapshot()
  });
}
