import {requireAdminApiSession} from '@/lib/adminAuth';
import {readAdminStore, writeAdminStore} from '@/lib/backendStore';
import {appendAuditLog} from '@/lib/adminAudit';
import {clientIp} from '@/lib/rateLimit';

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
  const {session, response} = await requireAdminApiSession();
  if (response) return response;
  const formData = await request.formData();
  await writeAdminStore((store) => ({
    ...store,
    settings: {
      ...store.settings,
      companyName: text(formData, 'companyName', 160),
      contactEmail: 'info@cheerdmotos.com',
      adminNotificationEmail: 'info@cheerdmotos.com',
      whatsapp: text(formData, 'whatsapp', 80),
      address: text(formData, 'address', 600),
      paymentCurrency: text(formData, 'paymentCurrency', 12) || 'USD',
      updatedAt: new Date().toISOString()
    }
  }));
  await appendAuditLog({actor: session.email, action: '更新网站设置', module: '系统设置', result: 'success',
    ip: clientIp(request), userAgent: request.headers.get('user-agent') || '', detail: '公司资料与网站设置'});
  return Response.redirect(new URL('/admin/settings', request.url), 303);
}
