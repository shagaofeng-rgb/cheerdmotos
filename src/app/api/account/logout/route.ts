import {cookies} from 'next/headers';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const cookieStore = await cookies();
  cookieStore.set('cheerdmoto_customer_session', '', {path: '/', maxAge: 0});
  return Response.redirect(new URL('/account/login', request.url), 303);
}
