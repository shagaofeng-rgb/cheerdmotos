import {cookies} from 'next/headers';
import {appendAuditLog} from '@/lib/adminAudit';
import {adminCookieOptions, ADMIN_COOKIE_NAME, createAdminSession, verifyAdminCredentials} from '@/lib/adminAuth';
import {checkRateLimit, clientIp} from '@/lib/rateLimit';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const ip = clientIp(request);
  const userAgent = request.headers.get('user-agent') || '';
  if (!checkRateLimit(`admin-login:${clientIp(request)}`, 8, 10 * 60_000)) {
    await appendAuditLog({
      actor: 'unknown',
      action: '后台登录',
      module: '用户与权限',
      result: 'failed',
      ip,
      userAgent,
      detail: '登录频率过高，触发临时限制'
    });
    return Response.redirect(new URL('/admin/login?error=rate-limit', request.url), 303);
  }
  const contentType = request.headers.get('content-type') || '';
  let email = '';
  let password = '';

  if (contentType.includes('application/json')) {
    const payload = await request.json().catch(() => ({}));
    email = String(payload.email || '');
    password = String(payload.password || '');
  } else {
    const formData = await request.formData();
    email = String(formData.get('email') || '');
    password = String(formData.get('password') || '');
  }

  if (!verifyAdminCredentials(email, password)) {
    await appendAuditLog({
      actor: email || 'unknown',
      action: '后台登录',
      module: '用户与权限',
      result: 'failed',
      ip,
      userAgent,
      detail: '邮箱或密码验证失败'
    });
    return Response.redirect(new URL('/admin/login?error=1', request.url), 303);
  }
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE_NAME, createAdminSession(email), adminCookieOptions());
  await appendAuditLog({
    actor: email,
    action: '后台登录',
    module: '用户与权限',
    result: 'success',
    ip,
    userAgent,
    detail: '管理员登录成功'
  });
  return Response.redirect(new URL('/admin', request.url), 303);
}
