import {cookies} from 'next/headers';
import {ADMIN_COOKIE_NAME} from '@/lib/adminAuth';

export async function POST(request: Request) {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_COOKIE_NAME);
  return Response.redirect(new URL('/admin/login', request.url), 303);
}
