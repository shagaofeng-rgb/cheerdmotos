import {requirePricingAdminApiSession} from '@/lib/pricingAdminAuth';
import {writePricingStore} from '@/lib/pricingStore';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const {response} = await requirePricingAdminApiSession();
  if (response) return response;
  const formData = await request.formData();
  const rawRate = String(formData.get('manualExchangeRate') || '').trim();
  const manualExchangeRate = rawRate ? Number(rawRate) : null;
  await writePricingStore((store) => ({
    ...store,
    manualExchangeRate: manualExchangeRate && Number.isFinite(manualExchangeRate) && manualExchangeRate > 0 ? manualExchangeRate : null,
    updatedAt: new Date().toISOString()
  }));
  return Response.redirect(new URL('/pricing-admin?settings=1', request.url), 303);
}
