export type PricingTierKey = 'tier1' | 'tier2' | 'tier3' | 'tier4';

export const tierLabels: Record<PricingTierKey, string> = {
  tier1: '1-5 units',
  tier2: '5-10 units',
  tier3: '10-30 units',
  tier4: '30+ units'
};

export function tierForQuantity(quantity: number): PricingTierKey {
  if (quantity >= 30) return 'tier4';
  if (quantity >= 10) return 'tier3';
  if (quantity >= 5) return 'tier2';
  return 'tier1';
}

export function baseCommissionRate(productId: string) {
  return /xtreme|dirtbike|dirt-bike/.test(productId) ? 2 : 1;
}

export function calculateSalesCommission(input: {
  productId: string;
  quantity: number;
  saleUnitUsd: number;
  floorUnitUsd: number;
  fivePlusUnitUsd: number;
}) {
  const quantity = Math.max(1, Math.floor(input.quantity || 1));
  const baseRate = baseCommissionRate(input.productId);
  const saleUnitUsd = Math.max(0, input.saleUnitUsd || 0);
  const floorUnitUsd = Math.max(0, input.floorUnitUsd || 0);
  const fivePlusUnitUsd = Math.max(floorUnitUsd, input.fivePlusUnitUsd || floorUnitUsd);

  const baseCommissionPerUnit = floorUnitUsd * baseRate / 100;
  const midSpreadPerUnit = Math.max(0, Math.min(saleUnitUsd, fivePlusUnitUsd) - floorUnitUsd);
  const topSpreadPerUnit = Math.max(0, saleUnitUsd - fivePlusUnitUsd);
  const midCommissionPerUnit = midSpreadPerUnit * 0.1;
  const topCommissionPerUnit = topSpreadPerUnit * 0.2;
  const commissionPerUnit = baseCommissionPerUnit + midCommissionPerUnit + topCommissionPerUnit;

  return {
    baseRate,
    floorUnitUsd,
    fivePlusUnitUsd,
    baseCommissionPerUnit: Number(baseCommissionPerUnit.toFixed(2)),
    midSpreadPerUnit: Number(midSpreadPerUnit.toFixed(2)),
    midCommissionPerUnit: Number(midCommissionPerUnit.toFixed(2)),
    topSpreadPerUnit: Number(topSpreadPerUnit.toFixed(2)),
    topCommissionPerUnit: Number(topCommissionPerUnit.toFixed(2)),
    commissionPerUnit: Number(commissionPerUnit.toFixed(2)),
    salespersonCommissionUsd: Number((commissionPerUnit * quantity).toFixed(2))
  };
}

export function calculatePricing(input: {
  productId: string;
  quantity: number;
  saleUnitUsd: number;
  costUnitUsd: number;
  extraCostUsd: number;
  exchangeRate: number;
  floorUnitUsd: number;
  fivePlusUnitUsd: number;
}) {
  const quantity = Math.max(1, Math.floor(input.quantity || 1));
  const grossProfitUsd = Number(((input.saleUnitUsd - input.costUnitUsd) * quantity - input.extraCostUsd).toFixed(2));
  const grossProfitCny = Number((grossProfitUsd * input.exchangeRate).toFixed(2));
  const commission = calculateSalesCommission({
    productId: input.productId,
    quantity,
    saleUnitUsd: input.saleUnitUsd,
    floorUnitUsd: input.floorUnitUsd,
    fivePlusUnitUsd: input.fivePlusUnitUsd
  });
  const salespersonCommissionCny = Number((commission.salespersonCommissionUsd * input.exchangeRate).toFixed(2));
  return {...commission, grossProfitUsd, grossProfitCny, salespersonCommissionCny};
}
