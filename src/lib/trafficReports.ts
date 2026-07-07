import {readAnalyticsEvents, readStoreOrders, type AnalyticsEvent} from '@/lib/commerceStore';
import {durableStoreStatus} from '@/lib/durableStore';
import {classifyTraffic, type AttributionSnapshot, type TrafficTouch} from '@/lib/trafficAttribution';

type Filter = {from?: Date; to?: Date; model?: 'first' | 'last' | 'session'};

function inRange(timestamp: string, filter: Filter) {
  const time = new Date(timestamp).getTime();
  if (Number.isNaN(time)) return false;
  if (filter.from && time < filter.from.getTime()) return false;
  if (filter.to && time > filter.to.getTime()) return false;
  return true;
}

function fallbackTouch(event: AnalyticsEvent): TrafficTouch {
  return classifyTraffic({
    url: event.page,
    referrer: event.referrer,
    locale: String(event.payload?.language || ''),
    countryCode: event.country,
    deviceType: event.device,
    browser: event.browser,
    now: event.timestamp
  });
}

function touchFor(event: AnalyticsEvent, model: Filter['model']) {
  const attribution = event.attribution as AttributionSnapshot | null | undefined;
  if (!attribution) return fallbackTouch(event);
  if (model === 'first') return attribution.firstTouch || fallbackTouch(event);
  if (model === 'session') return attribution.sessionTouch || fallbackTouch(event);
  return attribution.lastTouch || fallbackTouch(event);
}

function row(label: string) {
  return {
    label,
    visitors: new Set<string>(),
    sessions: new Set<string>(),
    pageViews: 0,
    leads: 0,
    purchases: 0,
    value: 0,
    campaigns: new Map<string, number>(),
    landings: new Map<string, number>()
  };
}

function inc(map: Map<string, number>, key: string) {
  if (key) map.set(key, (map.get(key) || 0) + 1);
}

function top(map: Map<string, number>) {
  return [...map.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || '-';
}

function serialize(item: ReturnType<typeof row>) {
  return {
    label: item.label,
    visitors: item.visitors.size,
    sessions: item.sessions.size,
    pageViews: item.pageViews,
    leads: item.leads,
    purchases: item.purchases,
    value: item.value,
    conversionRate: item.visitors.size ? Math.round(((item.leads + item.purchases) / item.visitors.size) * 1000) / 10 : 0,
    topCampaign: top(item.campaigns),
    topLandingPage: top(item.landings)
  };
}

function group(events: AnalyticsEvent[], filter: Filter, keyOf: (touch: TrafficTouch) => string) {
  const map = new Map<string, ReturnType<typeof row>>();
  events.forEach((event) => {
    const touch = touchFor(event, filter.model || 'last');
    const key = keyOf(touch) || 'unknown';
    const item = map.get(key) || row(key);
    item.visitors.add(event.visitorId);
    item.sessions.add(event.sessionId);
    if (event.type === 'page_view') item.pageViews += 1;
    if (/contact_inquiry|submit_inquiry|form_success/i.test(event.type)) item.leads += 1;
    if (/purchase|payment_notice/i.test(event.type)) item.purchases += 1;
    const value = Number(event.payload?.total || event.payload?.value || 0);
    if (Number.isFinite(value)) item.value += value;
    inc(item.campaigns, touch.campaign);
    inc(item.landings, touch.landingPage || event.page);
    map.set(key, item);
  });
  return [...map.values()].map(serialize).sort((a, b) => b.visitors - a.visitors || b.pageViews - a.pageViews);
}

export async function getAcquisitionReport(filter: Filter = {}) {
  const [events, orders] = await Promise.all([readAnalyticsEvents(), readStoreOrders()]);
  const filteredOrders = orders.filter((order) => inRange(order.createdAt, filter));
  const purchaseEvents: AnalyticsEvent[] = filteredOrders
    .filter((order) => ['paid', 'processing', 'shipped', 'delivered', 'completed'].includes(order.status))
    .map((order) => ({
      id: `purchase-${order.id}`,
      type: 'purchase',
      visitorId: order.attribution?.visitorId || order.userId || order.id,
      sessionId: order.attribution?.sessionId || order.id,
      page: '/checkout',
      pageTitle: 'Purchase',
      referrer: order.attribution?.lastTouch?.referrer || '',
      country: order.customer.country || 'Unknown',
      city: '',
      device: order.attribution?.lastTouch?.deviceType || 'Unknown',
      browser: order.attribution?.lastTouch?.browser || 'Unknown',
      os: 'Unknown',
      timestamp: order.createdAt,
      payload: {orderId: order.id, total: order.total, value: order.total, productSlug: order.productSlug},
      attribution: order.attribution || null
    }));
  const filteredEvents = [...events.filter((event) => inRange(event.timestamp, filter)), ...purchaseEvents];
  const visitors = new Set(filteredEvents.map((event) => event.visitorId));
  const sessions = new Set(filteredEvents.map((event) => event.sessionId));
  const pageViews = filteredEvents.filter((event) => event.type === 'page_view').length;
  const leads = filteredEvents.filter((event) => /contact_inquiry|submit_inquiry|form_success/i.test(event.type)).length;
  const purchases = filteredOrders.filter((order) => ['paid', 'processing', 'shipped', 'delivered', 'completed'].includes(order.status)).length;
  const bySource = group(filteredEvents, filter, (touch) => touch.source);
  const byCampaign = group(filteredEvents, filter, (touch) => touch.campaign || '(none)');
  const latestEvent = filteredEvents.map((event) => event.timestamp).sort().at(-1) || '';
  return {
    generatedAt: new Date().toISOString(),
    lastSyncedAt: latestEvent,
    store: durableStoreStatus(),
    model: filter.model || 'last',
    metrics: {
      visitors: visitors.size,
      sessions: sessions.size,
      pageViews,
      leads,
      purchases,
      conversionRate: visitors.size ? Math.round(((leads + purchases) / visitors.size) * 1000) / 10 : 0,
      topSource: bySource[0]?.label || '-',
      topCampaign: byCampaign[0]?.label || '-',
      topLandingPage: group(filteredEvents, filter, (touch) => touch.landingPage)[0]?.label || '-'
    },
    channels: group(filteredEvents, filter, (touch) => touch.channel),
    platforms: bySource,
    campaigns: byCampaign,
    recentEvents: filteredEvents.slice(-20).reverse()
  };
}
