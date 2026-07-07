import PricingDashboard from '@/components/PricingDashboard';
import {pricingAccountLabel, requirePricingAdminSession} from '@/lib/pricingAdminAuth';
import {fetchUsdCnyRate, readPricingStore} from '@/lib/pricingStore';

export const dynamic = 'force-dynamic';

export default async function PricingAdminPage() {
  const session = await requirePricingAdminSession();
  const store = await readPricingStore();
  const exchange = await fetchUsdCnyRate(store.manualExchangeRate);
  return (
    <PricingDashboard
      products={store.products}
      orders={store.orders.slice().reverse()}
      exchangeRate={exchange.rate}
      exchangeSource={exchange.source}
      exchangeUpdatedAt={exchange.updatedAt}
      exchangeFallback={exchange.fallback}
      currentAccount={pricingAccountLabel(session.email || '')}
    />
  );
}
