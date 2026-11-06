import {createHash, randomInt} from 'node:crypto';
import {appendStoreLine, readStoreLines, withStoreLock, writeStoreLines} from '@/lib/durableStore';
import {getPurchaseOffer, isSpecialPayment, type PurchaseSource} from '@/lib/purchaseCatalog';
import {checkoutQuote} from '@/lib/checkoutQuote';
import {INVENTORY_HOLD_MS, ORDER_WRITE_LOCK, ORDER_WRITE_OPTIONS} from '@/lib/inventory';
import {shippingEstimateFor} from '@/lib/shipping';
import {checkoutProductSlugs, oneTimePaymentSlug, products, type CheckoutProductSlug} from '@/lib/site';
import type {AttributionSnapshot} from '@/lib/trafficAttribution';
import {classifyTrafficQuality} from '@/lib/analyticsGovernance';
import {normalizeBrandValue} from '@/lib/brand';

const ORDERS_FILE = 'orders.jsonl';
const EVENTS_FILE = 'analytics-events.jsonl';
const EMAIL_LOGS_FILE = 'email-logs.jsonl';
const REFUNDS_FILE = 'refunds.jsonl';
const SHIPMENTS_FILE = 'shipments.jsonl';
const AUTHORIZATIONS_FILE = 'payment-authorizations.jsonl';
const PAYMENT_NOTIFICATIONS_FILE = 'payment-notifications.jsonl';

export type OrderStatus =
  | 'pending_payment'
  | 'paid'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'completed'
  | 'cancelled'
  | 'refunded'
  | 'partial_refunded'
  | 'failed';

export type GatewayStatus = 'not_submitted' | 'pending' | 'processing' | 'success' | 'failed' | 'refunded' | 'partial_refunded';
export type ShipmentStatus = 'unshipped' | 'shipped' | 'in_transit' | 'delivered' | 'returned';

export type PaymentMethod =
  | 'qianhai_card'
  | 'bank_transfer'
  | 'manual_quote'
  | 'oceanpayment_card'
  | 'oceanpayment_google_pay'
  | 'oceanpayment_apple_pay';

export type StoreOrder = {
  id: string;
  productSlug: string;
  productName: string;
  productImage?: string;
  quantity: number;
  unitPrice: number;
  currency: 'USD';
  subtotal: number;
  shippingEstimate: number;
  discount?: number;
  total: number;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentGateway: string;
  gatewayStatus: GatewayStatus;
  idempotencyKey: string;
  requestFingerprint?: string;
  paymentHoldUntil?: string;
  inventory?: {productId: string; reservedUntil: string; committedAt?: string};
  paymentId: string;
  transactionId: string;
  refundStatus: string;
  trackingNumber: string;
  logisticsStatus: string;
  shipmentStatus: ShipmentStatus;
  logisticsProvider: string;
  trackingUrl: string;
  shippedAt: string;
  estimatedDeliveryAt: string;
  deliveredAt: string;
  customerVisibleNote: string;
  userId: string;
  customer: {
    name: string;
    email: string;
    phone: string;
    company: string;
    country: string;
    address: string;
    message: string;
  };
  checkout: {
    contact: string;
    firstName: string;
    lastName: string;
    apartment: string;
    city: string;
    state: string;
    zip: string;
    shippingMethod: string;
    couponCode: string;
    marketingOptIn: boolean;
    billingSameAsShipping: boolean;
    billingAddress: string;
    cardBrand: string;
    cardLast4: string;
    cardholderName: string;
  };
  createdAt: string;
  updatedAt: string;
  attribution?: AttributionSnapshot | null;
};

export type AnalyticsEvent = {
  id: string;
  type: string;
  visitorId: string;
  sessionId: string;
  page: string;
  pageTitle: string;
  referrer: string;
  country: string;
  city: string;
  device: string;
  browser: string;
  os: string;
  ip?: string;
  ipHash?: string;
  trafficQuality?: 'real' | 'test' | 'bot' | 'internal' | 'system';
  exclusionReason?: string;
  timestamp: string;
  payload: Record<string, unknown>;
  attribution?: AttributionSnapshot | null;
};

export type EmailLog = {
  id: string;
  orderId: string;
  customerEmail: string;
  templateType:
    | 'order_success'
    | 'account_activation'
    | 'password_reset'
    | 'account_registration'
    | 'contact_inquiry'
    | 'admin_order_notice'
    | 'admin_payment_notice';
  status: 'pending' | 'sent' | 'failed' | 'skipped';
  providerMessageId: string;
  errorMessage: string;
  sentAt: string;
  createdAt: string;
};

export type PaymentNotification = {
  id: string;
  orderId: string;
  provider: 'oceanpayment';
  verified: boolean;
  paymentStatus: string;
  paymentId: string;
  raw: Record<string, string>;
  eventKey?: string;
  createdAt: string;
};

export type RefundRecord = {
  id: string;
  orderId: string;
  paymentId: string;
  refundNo: string;
  oceanpaymentRefundId: string;
  amount: number;
  currency: 'USD';
  status: 'pending' | 'submitted' | 'success' | 'failed';
  reason: string;
  requestPayload: Record<string, unknown>;
  responsePayload: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type ShipmentRecord = {
  id: string;
  orderId: string;
  logisticsProvider: string;
  trackingNumber: string;
  trackingUrl: string;
  shipmentStatus: ShipmentStatus;
  shippedAt: string;
  estimatedDeliveryAt: string;
  deliveredAt: string;
  customerVisibleNote: string;
  internalNote: string;
  uploadStatus: 'not_required' | 'pending' | 'submitted' | 'success' | 'failed';
  uploadResponse: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type AuthorizationRecord = {
  id: string;
  orderId: string;
  authorizationNo: string;
  amount: number;
  currency: 'USD';
  status: 'disabled' | 'created' | 'captured' | 'cancelled' | 'failed';
  capturedAmount: number;
  requestPayload: Record<string, unknown>;
  responsePayload: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type CommerceSnapshotFilter = {
  from?: Date;
  to?: Date;
};

function withOrderDefaults(order: StoreOrder): StoreOrder {
  return {
    ...order,
    idempotencyKey: order.idempotencyKey || '',
    paymentId: order.paymentId || '',
    transactionId: order.transactionId || '',
    refundStatus: order.refundStatus || '',
    shipmentStatus: order.shipmentStatus || (order.status === 'shipped' || order.status === 'delivered' ? order.status : 'unshipped'),
    logisticsProvider: order.logisticsProvider || '',
    trackingUrl: order.trackingUrl || '',
    shippedAt: order.shippedAt || '',
    estimatedDeliveryAt: order.estimatedDeliveryAt || '',
    deliveredAt: order.deliveredAt || '',
    customerVisibleNote: order.customerVisibleNote || '',
    userId: order.userId || ''
  };
}

function compactTimestamp(date: Date) {
  const pad = (value: number) => String(value).padStart(2, '0');
  return [
    date.getUTCFullYear(),
    pad(date.getUTCMonth() + 1),
    pad(date.getUTCDate()),
    pad(date.getUTCHours()),
    pad(date.getUTCMinutes()),
    pad(date.getUTCSeconds())
  ].join('');
}

function generateStoreOrderId(orders: StoreOrder[]) {
  const existing = new Set(orders.map((order) => order.id));
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const random = randomInt(100000, 1000000);
    const candidate = `CM${compactTimestamp(new Date())}${random}`;
    if (!existing.has(candidate)) return candidate;
  }
  throw new Error('Could not allocate a unique order number');
}

export const paymentMethods = ['qianhai_card', 'bank_transfer', 'manual_quote', 'oceanpayment_card', 'oceanpayment_google_pay', 'oceanpayment_apple_pay'] as const satisfies readonly PaymentMethod[];

export async function createStoreOrder(input: {
  productSlug: string;
  quantity: number;
  paymentMethod: PaymentMethod;
  purchaseSource: PurchaseSource;
  cartAuthorized: boolean;
  expectedPriceCents?: number;
  expectedShippingCents?: number;
  customer: StoreOrder['customer'];
  checkout?: Partial<StoreOrder['checkout']>;
  idempotencyKey?: string;
  userId?: string;
  attribution?: AttributionSnapshot | null;
}): Promise<{order: StoreOrder; created: boolean}> {
  const quantity = input.productSlug === oneTimePaymentSlug ? 1 : input.quantity;
  if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 99) throw new Error('INVALID_QUANTITY');
  const idempotencyKey = input.idempotencyKey || '';
  const requestFingerprint = createHash('sha256').update(JSON.stringify([
    input.productSlug, quantity, input.paymentMethod, input.purchaseSource,
    input.customer, input.checkout, input.expectedPriceCents, input.expectedShippingCents
  ])).digest('hex');
  return withStoreLock(ORDER_WRITE_LOCK, async () => {
    const orders = await readStoreOrders();
    if (idempotencyKey) {
      const prior = orders.find((order) => order.idempotencyKey === idempotencyKey);
      if (prior) {
        // Legacy keys lacked a matching payload digest. Their receipts remain available through ownership.
        if (prior.requestFingerprint !== requestFingerprint) throw new Error('IDEMPOTENCY_CONFLICT');
        return {order: prior, created: false};
      }
    }
    if (input.productSlug === oneTimePaymentSlug && oneTimePaymentUnavailable(orders)) throw new Error('ONE_TIME_PAYMENT_UNAVAILABLE');
    const product = await getPurchaseOffer(input.productSlug, orders);
    if (!product || !(input.purchaseSource === 'cart' ? product.canCart && input.cartAuthorized : product.canDirectOrder)) {
      throw new Error('PRODUCT_UNAVAILABLE');
    }
    if (quantity > product.available) throw new Error('INSUFFICIENT_STOCK');
    const shippingEstimate = shippingEstimateFor(input.productSlug, input.customer.country, input.checkout?.state);
    if (
      (input.expectedPriceCents !== undefined && input.expectedPriceCents !== product.priceCents) ||
      (input.expectedShippingCents !== undefined && input.expectedShippingCents !== Math.round(shippingEstimate * 100))
    ) throw new Error('QUOTE_CHANGED');
    const quote = checkoutQuote(product.priceCents, quantity, shippingEstimate, input.checkout?.couponCode || '', isSpecialPayment(input.productSlug));
    const order = await persistNewOrder({input, product, orders, quantity, idempotencyKey, requestFingerprint, quote});
    return {order, created: true};
  }, ORDER_WRITE_OPTIONS);
}

async function persistNewOrder({input, product, orders, quantity, idempotencyKey, requestFingerprint, quote}: {
  input: Parameters<typeof createStoreOrder>[0];
  product: NonNullable<Awaited<ReturnType<typeof getPurchaseOffer>>>;
  orders: StoreOrder[];
  quantity: number;
  idempotencyKey: string;
  requestFingerprint: string;
  quote: ReturnType<typeof checkoutQuote>;
}) {
  const now = new Date().toISOString();
  const order: StoreOrder = {
    id: generateStoreOrderId(orders),
    productSlug: input.productSlug,
    productName: product.name,
    productImage: product.image,
    quantity,
    unitPrice: product.priceCents / 100,
    currency: 'USD',
    subtotal: quote.subtotalCents / 100,
    shippingEstimate: quote.shippingCents / 100,
    discount: quote.discountCents / 100,
    total: quote.totalCents / 100,
    status: 'pending_payment',
    paymentMethod: input.paymentMethod,
    paymentGateway: input.paymentMethod.startsWith('oceanpayment') ? 'oceanpayment' : input.paymentMethod === 'qianhai_card' ? 'qianhai' : 'manual',
    gatewayStatus: 'not_submitted',
    idempotencyKey,
    requestFingerprint,
    ...(input.productSlug === oneTimePaymentSlug ? {paymentHoldUntil: new Date(Date.now() + INVENTORY_HOLD_MS).toISOString()} : {}),
    ...(product.id ? {inventory: {productId: product.id, reservedUntil: new Date(Date.now() + INVENTORY_HOLD_MS).toISOString()}} : {}),
    paymentId: '',
    transactionId: '',
    refundStatus: '',
    trackingNumber: '',
    logisticsStatus: 'Order received. Waiting for payment confirmation.',
    shipmentStatus: 'unshipped',
    logisticsProvider: '',
    trackingUrl: '',
    shippedAt: '',
    estimatedDeliveryAt: '',
    deliveredAt: '',
    customerVisibleNote: '',
    userId: input.userId || '',
    customer: input.customer,
    checkout: {
      contact: input.checkout?.contact || input.customer.email,
      firstName: input.checkout?.firstName || '',
      lastName: input.checkout?.lastName || '',
      apartment: input.checkout?.apartment || '',
      city: input.checkout?.city || '',
      state: input.checkout?.state || '',
      zip: input.checkout?.zip || '',
      shippingMethod: input.checkout?.shippingMethod || 'standard_ocean_air_quote',
      couponCode: input.checkout?.couponCode || '',
      marketingOptIn: Boolean(input.checkout?.marketingOptIn),
      billingSameAsShipping: input.checkout?.billingSameAsShipping !== false,
      billingAddress: input.checkout?.billingAddress || '',
      cardBrand: input.checkout?.cardBrand || '',
      cardLast4: input.checkout?.cardLast4 || '',
      cardholderName: input.checkout?.cardholderName || ''
    },
    createdAt: now,
    updatedAt: now,
    attribution: input.attribution || null
  };
  await appendStoreLine(ORDERS_FILE, order);
  return order;
}

export async function readStoreOrders() {
  return (await readStoreLines<StoreOrder>(ORDERS_FILE)).map((order) => normalizeBrandValue(withOrderDefaults(order)));
}

function oneTimePaymentUnavailable(orders: StoreOrder[]) {
  const unavailableStatuses = new Set<OrderStatus>(['paid', 'processing', 'shipped', 'delivered', 'completed']);
  return orders.some((order) => (
    order.productSlug === oneTimePaymentSlug &&
    (unavailableStatuses.has(order.status) || (order.status === 'pending_payment' && Date.parse(order.paymentHoldUntil || '') > Date.now())) &&
    order.gatewayStatus !== 'failed'
  ));
}

export async function isOneTimePaymentUnavailable(productSlug: string) {
  return productSlug === oneTimePaymentSlug && oneTimePaymentUnavailable(await readStoreOrders());
}

export function orderImage(order: StoreOrder) {
  return order.productImage || (checkoutProductSlugs.includes(order.productSlug as CheckoutProductSlug) ? products[order.productSlug as CheckoutProductSlug].image : '');
}

export async function findStoreOrder(orderId: string) {
  const orders = await readStoreOrders();
  return orders.find((order) => order.id === orderId) || null;
}

export async function updateStoreOrderPayment(
  orderId: string,
  patch: Partial<Pick<StoreOrder, 'status' | 'paymentMethod' | 'paymentGateway' | 'gatewayStatus' | 'logisticsStatus' | 'paymentId' | 'transactionId' | 'refundStatus' | 'trackingNumber' | 'trackingUrl' | 'shipmentStatus' | 'logisticsProvider' | 'shippedAt' | 'estimatedDeliveryAt' | 'deliveredAt' | 'customerVisibleNote' | 'userId'>> & {
    checkout?: Partial<StoreOrder['checkout']>;
  },
  options: {preparePayment?: boolean; browserReturn?: boolean} = {}
): Promise<StoreOrder | null> {
  return withStoreLock(ORDER_WRITE_LOCK, async () => {
    const orders = await readStoreOrders();
    const index = orders.findIndex((order) => order.id === orderId);
    if (index === -1) return null;
    const order = orders[index];
    if (options.preparePayment) {
      if (order.status !== 'pending_payment' || !['not_submitted', 'pending'].includes(order.gatewayStatus)) throw new Error('PAYMENT_STATE_CHANGED');
      const holdUntil = order.inventory?.reservedUntil || order.paymentHoldUntil;
      if (holdUntil && Date.parse(holdUntil) <= Date.now()) throw new Error('PAYMENT_HOLD_EXPIRED');
    }
    if (options.browserReturn && (order.status !== 'pending_payment' || order.gatewayStatus !== 'pending')) return order;
    const protectedPatch = protectFinalPaymentState(order, patch);
    const reference = protectedPatch.paymentId || protectedPatch.transactionId;
    if (reference && orders.some((candidate) => candidate.id !== order.id && (candidate.paymentId === reference || candidate.transactionId === reference))) {
      throw new Error('DUPLICATE_PAYMENT_ID');
    }
    const now = new Date().toISOString();
    const inventory = order.inventory && !order.inventory.committedAt && protectedPatch.status === 'paid'
      ? {...order.inventory, committedAt: now}
      : order.inventory;
    const updated = {
      ...order,
      ...protectedPatch,
      inventory,
      checkout: {...order.checkout, ...(patch.checkout || {})},
      updatedAt: now
    };
    orders[index] = updated;
    await writeStoreLines(ORDERS_FILE, orders);
    return updated;
  }, ORDER_WRITE_OPTIONS);
}

function protectFinalPaymentState(
  order: StoreOrder,
  patch: Partial<Pick<StoreOrder, 'status' | 'gatewayStatus' | 'logisticsStatus' | 'paymentId' | 'transactionId'>>
) {
  const next = {...patch};
  const paidLike = new Set<OrderStatus>(['paid', 'processing', 'shipped', 'delivered', 'completed']);
  const refundLike = new Set<OrderStatus>(['refunded', 'partial_refunded']);
  const downgradeLike = new Set<OrderStatus>(['pending_payment', 'failed']);
  const paid = order.gatewayStatus === 'success' || paidLike.has(order.status) && order.status !== 'processing';
  if (next.status && (
    refundLike.has(order.status) && (paidLike.has(next.status) || downgradeLike.has(next.status)) ||
    paid && (downgradeLike.has(next.status) || next.status === 'processing' && next.gatewayStatus === 'processing' ||
      ['shipped', 'delivered', 'completed'].includes(order.status) && next.status === 'paid')
  )) {
    delete next.status;
    delete next.gatewayStatus;
    delete next.logisticsStatus;
    delete next.paymentId;
    delete next.transactionId;
  }
  return next;
}

export async function appendAnalyticsEvent(event: AnalyticsEvent) {
  await appendStoreLine(EVENTS_FILE, event);
}

export async function readAnalyticsEvents() {
  return readStoreLines<AnalyticsEvent>(EVENTS_FILE);
}

export async function appendEmailLog(log: Omit<EmailLog, 'id' | 'createdAt'> & {id?: string; createdAt?: string}) {
  const now = new Date().toISOString();
  const next: EmailLog = {
    id: log.id || `email-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    createdAt: log.createdAt || now,
    ...log
  };
  await appendStoreLine(EMAIL_LOGS_FILE, next);
  return next;
}

export async function readEmailLogs() {
  return readStoreLines<EmailLog>(EMAIL_LOGS_FILE);
}

export async function hasSentEmail(orderId: string, templateType: EmailLog['templateType']) {
  const logs = await readEmailLogs();
  return logs.some((log) => log.orderId === orderId && log.templateType === templateType && log.status === 'sent');
}

export async function appendPaymentNotification(notification: Omit<PaymentNotification, 'id' | 'createdAt'>) {
  const next: PaymentNotification = {
    id: `paynotice-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    ...notification
  };
  await appendStoreLine(PAYMENT_NOTIFICATIONS_FILE, next);
  return next;
}

export async function readPaymentNotifications() {
  return readStoreLines<PaymentNotification>(PAYMENT_NOTIFICATIONS_FILE);
}

export async function appendRefundRecord(input: Omit<RefundRecord, 'id' | 'refundNo' | 'createdAt' | 'updatedAt'> & {id?: string; refundNo?: string}) {
  const now = new Date().toISOString();
  const next: RefundRecord = {
    id: input.id || `refund-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    refundNo: input.refundNo || `RF-${Date.now()}-${Math.random().toString(16).slice(2, 6).toUpperCase()}`,
    createdAt: now,
    updatedAt: now,
    ...input
  };
  await appendStoreLine(REFUNDS_FILE, next);
  return next;
}

export async function readRefundRecords() {
  return readStoreLines<RefundRecord>(REFUNDS_FILE);
}

export async function upsertShipmentRecord(input: Omit<ShipmentRecord, 'id' | 'createdAt' | 'updatedAt'>) {
  const shipments = await readShipmentRecords();
  const now = new Date().toISOString();
  let nextRecord: ShipmentRecord | null = null;
  const next = shipments.map((shipment) => {
    if (shipment.orderId !== input.orderId) return shipment;
    nextRecord = {...shipment, ...input, updatedAt: now};
    return nextRecord;
  });
  if (!nextRecord) {
    nextRecord = {
      id: `ship-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
      createdAt: now,
      updatedAt: now,
      ...input
    };
    next.push(nextRecord);
  }
  await writeStoreLines(SHIPMENTS_FILE, next);
  return nextRecord;
}

export async function readShipmentRecords() {
  return (await readStoreLines<ShipmentRecord>(SHIPMENTS_FILE)).map((shipment) => ({
    ...shipment,
    trackingUrl: shipment.trackingUrl || '',
    estimatedDeliveryAt: shipment.estimatedDeliveryAt || '',
    customerVisibleNote: shipment.customerVisibleNote || (shipment as ShipmentRecord & {note?: string}).note || '',
    internalNote: shipment.internalNote || ''
  }));
}

export async function appendAuthorizationRecord(input: Omit<AuthorizationRecord, 'id' | 'authorizationNo' | 'createdAt' | 'updatedAt'> & {authorizationNo?: string}) {
  const now = new Date().toISOString();
  const next: AuthorizationRecord = {
    id: `auth-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    authorizationNo: input.authorizationNo || `AUTH-${Date.now()}-${Math.random().toString(16).slice(2, 6).toUpperCase()}`,
    createdAt: now,
    updatedAt: now,
    ...input
  };
  await appendStoreLine(AUTHORIZATIONS_FILE, next);
  return next;
}

export async function readAuthorizationRecords() {
  return readStoreLines<AuthorizationRecord>(AUTHORIZATIONS_FILE);
}

function isInsideRange(value: string, filter?: CommerceSnapshotFilter) {
  if (!filter?.from && !filter?.to) return true;
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return false;
  if (filter.from && time < filter.from.getTime()) return false;
  if (filter.to && time > filter.to.getTime()) return false;
  return true;
}

export async function getCommerceSnapshot(filter?: CommerceSnapshotFilter) {
  const [orders, events] = await Promise.all([readStoreOrders(), readAnalyticsEvents()]);
  const filteredOrders = orders.filter((order) => isInsideRange(order.createdAt, filter));
  const filteredEvents = events.filter((event) => isInsideRange(event.timestamp, filter) && classifyTrafficQuality(event).include);
  const paidOrders = filteredOrders.filter((order) => ['paid', 'processing', 'shipped', 'delivered', 'completed'].includes(order.status));
  const pendingOrders = filteredOrders.filter((order) => order.status === 'pending_payment');
  const shippedOrders = filteredOrders.filter((order) => order.status === 'shipped' || order.status === 'delivered');
  const revenue = paidOrders.reduce((sum, order) => sum + order.total, 0);
  const checkoutEvents = filteredEvents.filter((event) => event.type === 'checkout_start' || event.type === 'checkout_submit');
  const countries = countBy([...filteredOrders.map((order) => order.customer.country), ...filteredEvents.map((event) => event.country)]);
  const productDemand = countBy(filteredOrders.map((order) => order.productName));

  return {
    generatedAt: new Date().toISOString(),
    filter: {
      from: filter?.from?.toISOString() || '',
      to: filter?.to?.toISOString() || ''
    },
    paymentGateway: {
      provider: 'Oceanpayment embedded gateway',
      status:
        process.env.OCEANPAYMENT_ACCOUNT &&
        (process.env.OCEANPAYMENT_CARD_TERMINAL || process.env.OCEANPAYMENT_TERMINAL) &&
        (process.env.OCEANPAYMENT_CARD_SECURE_CODE || process.env.OCEANPAYMENT_SECURE_CODE) &&
        (process.env.OCEANPAYMENT_CARD_PUBLIC_KEY || process.env.OCEANPAYMENT_PUBLIC_KEY) &&
        (process.env.OCEANPAYMENT_WALLET_TERMINAL || process.env.OCEANPAYMENT_TERMINAL) &&
        (process.env.OCEANPAYMENT_WALLET_SECURE_CODE || process.env.OCEANPAYMENT_SECURE_CODE)
          ? 'env_ready'
          : 'waiting_for_credentials',
      createEndpoint: '/api/payments/oceanpayment/create',
      notifyEndpoint: '/api/payments/oceanpayment/notice'
    },
    metrics: {
      orders: filteredOrders.length,
      pendingPayment: pendingOrders.length,
      shipped: shippedOrders.length,
      revenue,
      visitors: new Set(filteredEvents.map((event) => event.visitorId)).size,
      checkoutEvents: checkoutEvents.length
    },
    countries,
    productDemand,
    recentOrders: filteredOrders.slice(-12).reverse(),
    recentEvents: filteredEvents.slice(-18).reverse()
  };
}

function countBy(values: string[]) {
  const map = new Map<string, number>();
  values.filter(Boolean).forEach((value) => map.set(value, (map.get(value) || 0) + 1));
  return [...map.entries()].map(([label, value]) => ({label, value})).sort((a, b) => b.value - a.value).slice(0, 8);
}
