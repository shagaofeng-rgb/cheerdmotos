import type {AdminProduct} from '@/lib/backendStore';
import type {StoreOrder} from '@/lib/commerceStore';

export const ORDER_WRITE_LOCK = 'commerce-orders';
export const ORDER_WRITE_OPTIONS = {ttlSeconds: 90, attempts: 12, retryDelayMs: 100};
export const INVENTORY_HOLD_MS = 45 * 60_000;

export function stockBreakdown(product: AdminProduct, orders: readonly StoreOrder[], now = Date.now()) {
  let reserved = 0;
  let sold = 0;
  const countedAt = Date.parse(product.stockCountedAt || '') || 0;
  for (const order of orders) {
    const inventory = order.inventory;
    if (!inventory || inventory.productId !== product.id) continue;
    if (inventory.committedAt) {
      if (Date.parse(inventory.committedAt) > countedAt) sold += order.quantity;
    } else if (
      (order.status === 'pending_payment' || order.status === 'processing') &&
      order.gatewayStatus !== 'failed' && Date.parse(inventory.reservedUntil) > now
    ) {
      reserved += order.quantity;
    }
  }
  return {reserved, sold, available: Math.max(0, Math.trunc(product.stock) - reserved - sold)};
}
