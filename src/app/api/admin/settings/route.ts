import {requireAdminApiSession} from '@/lib/adminAuth';
import {readAdminStore, writeAdminStore} from '@/lib/backendStore';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function text(formData: FormData, key: string, limit = 600) {
  return String(formData.get(key) || '').trim().slice(0, limit);
}

export async function GET() {
  const {response} = await requireAdminApiSession();
  if (response) return response;
  const store = await readAdminStore();
  return Response.json({settings: store.settings});
}

export async function POST(request: Request) {
  const {response} = await requireAdminApiSession();
  if (response) return response;
  const formData = await request.formData();
  await writeAdminStore((store) => ({
    ...store,
    settings: {
      ...store.settings,
      companyName: text(formData, 'companyName', 160),
      contactEmail: text(formData, 'contactEmail', 160),
      adminNotificationEmail: text(formData, 'adminNotificationEmail', 160),
      whatsapp: text(formData, 'whatsapp', 80),
      address: text(formData, 'address', 600),
      paymentCurrency: text(formData, 'paymentCurrency', 12) || 'USD',
      updatedAt: new Date().toISOString()
    }
  }));
  return Response.redirect(new URL('/admin/settings', request.url), 303);
}
