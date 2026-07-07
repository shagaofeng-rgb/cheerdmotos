import {requirePricingAdminApiSession} from '@/lib/pricingAdminAuth';
import {calculatePricing, readPricingStore, writePricingStore, type PricingOrder} from '@/lib/pricingStore';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function text(formData: FormData, key: string, limit = 240) {
  return String(formData.get(key) || '').trim().slice(0, limit);
}

function numberValue(formData: FormData, key: string, fallback = 0) {
  const value = Number(text(formData, key, 32));
  return Number.isFinite(value) ? value : fallback;
}

export async function POST(request: Request) {
  const {response} = await requirePricingAdminApiSession();
  if (response) return response;
  const formData = await request.formData();
  const store = await readPricingStore();
  const productId = text(formData, 'productId', 80);
  const product = store.products.find((item) => item.id === productId);
  if (!product) {
    return Response.json({success: false, error: 'Invalid product'}, {status: 400});
  }
  const quantity = Math.max(1, Math.floor(numberValue(formData, 'quantity', 1)));
  const saleUnitUsd = Math.max(0, numberValue(formData, 'saleUnitUsd', product.retailUsd));
  const costUnitUsd = Math.max(0, numberValue(formData, 'costUnitUsd', 0));
  const extraCostUsd = Math.max(0, numberValue(formData, 'extraCostUsd', 0));
  const exchangeRate = Math.max(0.0001, numberValue(formData, 'exchangeRate', 7.2));
  const calculated = calculatePricing({
    productId,
    quantity,
    saleUnitUsd,
    costUnitUsd,
    extraCostUsd,
    exchangeRate,
    floorUnitUsd: product.tiers.tier4,
    fivePlusUnitUsd: product.tiers.tier2
  });
  const now = new Date().toISOString();
  const order: PricingOrder = {
    id: `price-${Date.now()}`,
    createdAt: now,
    customerName: text(formData, 'customerName', 160),
    country: text(formData, 'country', 100),
    salesperson: text(formData, 'salesperson', 100),
    productId,
    productName: text(formData, 'productName', 160) || product.name,
    quantity,
    retailUnitUsd: product.retailUsd,
    saleUnitUsd,
    costUnitUsd,
    extraCostUsd,
    commissionRate: calculated.baseRate,
    commissionFloorUnitUsd: calculated.floorUnitUsd,
    commissionFivePlusUnitUsd: calculated.fivePlusUnitUsd,
    commissionPerUnitUsd: calculated.commissionPerUnit,
    baseCommissionPerUnitUsd: calculated.baseCommissionPerUnit,
    midCommissionPerUnitUsd: calculated.midCommissionPerUnit,
    topCommissionPerUnitUsd: calculated.topCommissionPerUnit,
    exchangeRate,
    grossProfitUsd: calculated.grossProfitUsd,
    grossProfitCny: calculated.grossProfitCny,
    salespersonCommissionUsd: calculated.salespersonCommissionUsd,
    salespersonCommissionCny: calculated.salespersonCommissionCny,
    note: text(formData, 'note', 1000)
  };
  await writePricingStore((current) => ({
    ...current,
    orders: [...current.orders, order].slice(-500),
    updatedAt: now
  }));
  return Response.redirect(new URL('/pricing-admin?saved=1', request.url), 303);
}
