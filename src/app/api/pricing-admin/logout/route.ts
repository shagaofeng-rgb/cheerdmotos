import {cookies} from 'next/headers';
import {PRICING_ADMIN_COOKIE} from '@/lib/pricingAdminAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const cookieStore = await cookies();
  cookieStore.delete(PRICING_ADMIN_COOKIE);
  return Response.redirect(new URL('/pricing-admin/login', request.url), 303);
}
