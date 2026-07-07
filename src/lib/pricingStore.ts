import {readStoreObject, writeStoreObject} from '@/lib/durableStore';
import {calculatePricing, tierForQuantity, type PricingTierKey} from '@/lib/pricingMath';

const PRICING_STORE_FILE = 'pricing-admin-store.json';

export type PricingProduct = {
  id: string;
  name: string;
  retailUsd: number;
  tiers: Record<PricingTierKey, number>;
};

export type PricingOrder = {
  id: string;
  createdAt: string;
  customerName: string;
  country: string;
  salesperson: string;
  productId: string;
  productName: string;
  quantity: number;
  retailUnitUsd: number;
  saleUnitUsd: number;
  costUnitUsd: number;
  extraCostUsd: number;
  commissionRate: number;
  commissionFloorUnitUsd?: number;
  commissionFivePlusUnitUsd?: number;
  commissionPerUnitUsd?: number;
  baseCommissionPerUnitUsd?: number;
  midCommissionPerUnitUsd?: number;
  topCommissionPerUnitUsd?: number;
  exchangeRate: number;
  grossProfitUsd: number;
  grossProfitCny: number;
  salespersonCommissionUsd: number;
  salespersonCommissionCny: number;
  note: string;
};

export type PricingStore = {
  products: PricingProduct[];
  orders: PricingOrder[];
  manualExchangeRate: number | null;
  updatedAt: string;
};

export const defaultPricingProducts: PricingProduct[] = [
  {id: 'xceed-electric-dirt-bike', name: 'XCEED Electric Dirt Bike', retailUsd: 3099, tiers: {tier1: 2850, tier2: 2700, tier3: 2550, tier4: 2350}},
  {id: 'cheerdmoto-performance-96v-electric-dirtbike-xtreme', name: 'XTREME 96V Electric Dirt Bike', retailUsd: 4599, tiers: {tier1: 4300, tier2: 4100, tier3: 3900, tier4: 3600}},
  {id: 'grandeux-xplus-electric-moped-bike-1350w-fat-tire-e-bike', name: 'Grandeux Xplus Fat Tire E-Bike', retailUsd: 599, tiers: {tier1: 540, tier2: 510, tier3: 480, tier4: 450}},
  {id: 'grandeux-xplore-electric-bike-1350w-over-frame-fat-tire-ebike-cheerdmoto', name: 'Grandeux Xplore Fat Tire E-Bike', retailUsd: 499, tiers: {tier1: 450, tier2: 425, tier3: 399, tier4: 369}},
  {id: 'cheerdmoto-electric-wheelchair-smart-b02', name: 'Smart B02 Electric Wheelchair', retailUsd: 399, tiers: {tier1: 360, tier2: 340, tier3: 320, tier4: 299}}
];

function seedStore(): PricingStore {
  return {
    products: defaultPricingProducts,
    orders: [],
    manualExchangeRate: null,
    updatedAt: new Date().toISOString()
  };
}

function mergeProducts(products: PricingProduct[]) {
  const byId = new Map(products.map((product) => [product.id, product]));
  let changed = false;
  const merged = defaultPricingProducts.map((product) => {
    const existing = byId.get(product.id);
    if (!existing) {
      changed = true;
      return product;
    }
    const hasCurrentDefaults = existing.name === product.name && existing.retailUsd === product.retailUsd;
    if (!hasCurrentDefaults) changed = true;
    return {...existing, name: product.name, retailUsd: product.retailUsd};
  });
  return {changed, products: merged};
}

export async function readPricingStore() {
  const stored = await readStoreObject<PricingStore>(PRICING_STORE_FILE);
  if (!stored) {
    const seeded = seedStore();
    await writeStoreObject(PRICING_STORE_FILE, seeded);
    return seeded;
  }
  const merged = mergeProducts(stored.products || []);
  if (merged.changed) {
    const next = {...stored, products: merged.products, updatedAt: new Date().toISOString()};
    await writeStoreObject(PRICING_STORE_FILE, next);
    return next;
  }
  return {...stored, products: merged.products, orders: stored.orders || [], manualExchangeRate: stored.manualExchangeRate ?? null};
}

export async function writePricingStore(updater: (store: PricingStore) => PricingStore) {
  const current = await readPricingStore();
  const next = updater(current);
  await writeStoreObject(PRICING_STORE_FILE, next);
  return next;
}

export {calculatePricing, tierForQuantity};

export async function fetchUsdCnyRate(manualExchangeRate?: number | null) {
  if (manualExchangeRate && manualExchangeRate > 0) {
    return {rate: manualExchangeRate, source: '手动汇率', updatedAt: new Date().toISOString(), fallback: false};
  }
  try {
    const response = await fetch('https://open.er-api.com/v6/latest/USD', {cache: 'no-store'});
    if (!response.ok) throw new Error(`exchange api ${response.status}`);
    const payload = await response.json() as {rates?: Record<string, number>; time_last_update_utc?: string};
    const rate = Number(payload.rates?.CNY);
    if (Number.isFinite(rate) && rate > 0) {
      return {rate, source: 'open.er-api.com USD/CNY', updatedAt: payload.time_last_update_utc || new Date().toISOString(), fallback: false};
    }
  } catch {
    // Use a conservative fallback only when the public exchange endpoint is unreachable.
  }
  return {rate: 7.2, source: '临时备用汇率', updatedAt: new Date().toISOString(), fallback: true};
}
