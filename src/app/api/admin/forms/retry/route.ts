import {requireAdminApiSession} from '@/lib/adminAuth';
import {appendAuditLog} from '@/lib/adminAudit';
import {deliverContactInquiry} from '@/lib/contactInquiries';
import {persistentWritesAvailable} from '@/lib/durableStore';
import {clientIp} from '@/lib/rateLimit';

export async function POST(request: Request) {
  const {session, response} = await requireAdminApiSession('inquiries.retry');
  if (response) return response;
  if (!persistentWritesAvailable()) return Response.json({message: '持久化存储未配置'}, {status: 503});
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) return Response.json({message: '请求来源无效'}, {status: 403});
  const id = String((await request.formData()).get('id') || '');
  if (!/^contact-[a-f0-9-]{36}$/.test(id)) return Response.json({message: '询盘编号无效'}, {status: 400});
  const inquiry = await deliverContactInquiry(id).catch(() => null);
  const ok = inquiry?.delivery.status === 'sent';
  await appendAuditLog({
    actor: session.email, action: '重试询盘通知', module: '客户表单', result: ok ? 'success' : 'failed',
    ip: clientIp(request), userAgent: request.headers.get('user-agent') || '', detail: `${id} ${inquiry?.delivery.status || 'unknown'}`
  });
  return Response.redirect(new URL(`/admin/forms?retry=${ok ? 'sent' : 'failed'}`, request.url), 303);
}
