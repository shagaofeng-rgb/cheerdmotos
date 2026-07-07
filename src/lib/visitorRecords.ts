import {readAnalyticsEvents, readStoreOrders, type AnalyticsEvent} from '@/lib/commerceStore';
import {durableStoreStatus} from '@/lib/durableStore';
import {zhCountry, zhTrafficPlatform, zhTrafficSource} from '@/lib/adminLabels';
import {classifyTraffic, type AttributionSnapshot, type TrafficTouch} from '@/lib/trafficAttribution';

export type VisitorRecord = {
  time: string;
  customerNo: string;
  visitorId: string;
  country: string;
  device: string;
  browser: string;
  source: string;
  sourcePlatform: string;
  sourceDetail: string;
  page: string;
  customerTag: string;
  visitDay: string;
  ip: string;
};

type Filter = {
  from?: Date;
  to?: Date;
  q?: string;
  country?: string;
  source?: string;
  limit?: number;
  page?: number;
  perPage?: number;
};

const GATEWAY_EVENTS = new Set(['payment_notice', 'payment_return']);
const INTERNAL_VISITORS = new Set(['payment-gateway', 'admin', 'local-test', 'checkout']);

function inRange(timestamp: string, filter: Filter) {
  const time = new Date(timestamp).getTime();
  if (Number.isNaN(time)) return false;
  if (filter.from && time < filter.from.getTime()) return false;
  if (filter.to && time > filter.to.getTime()) return false;
  return true;
}

function stableVisitorId(event: AnalyticsEvent) {
  const attribution = event.attribution as AttributionSnapshot | null | undefined;
  return attribution?.visitorId || event.visitorId || event.sessionId || 'anonymous';
}

function touchFor(event: AnalyticsEvent): TrafficTouch {
  const attribution = event.attribution as AttributionSnapshot | null | undefined;
  return attribution?.lastTouch || attribution?.sessionTouch || classifyTraffic({
    url: event.page,
    referrer: event.referrer,
    locale: String(event.payload?.language || ''),
    countryCode: event.country,
    deviceType: event.device,
    browser: event.browser,
    now: event.timestamp
  });
}

function isRealVisitorEvent(event: AnalyticsEvent) {
  if (GATEWAY_EVENTS.has(event.type)) return false;
  if (event.type.startsWith('admin_')) return false;
  const visitorId = stableVisitorId(event);
  if (INTERNAL_VISITORS.has(visitorId) || INTERNAL_VISITORS.has(event.visitorId)) return false;
  if (event.device === 'Gateway' || event.browser === 'Gateway') return false;
  return true;
}

function platformLabel(touch: TrafficTouch) {
  const source = (touch.source || '').toLowerCase();
  const click = (touch.clickIdType || '').toLowerCase();
  if (source.includes('google') || click === 'gclid' || click === 'gbraid' || click === 'wbraid') return 'Google Ads';
  if (source === 'meta' || source.includes('facebook') || source.includes('instagram') || click === 'fbclid') return 'Meta Ads';
  if (source.includes('linkedin') || click === 'li_fat_id') return 'LinkedIn';
  if (source.includes('tiktok') || click === 'ttclid') return 'TikTok';
  if (source.includes('bing') || click === 'msclkid') return 'Microsoft Ads';
  if (source === 'direct') return 'Direct';
  if (touch.referrerDomain) return touch.referrerDomain;
  return touch.source || 'Unknown';
}

function sourceDetail(touch: TrafficTouch) {
  const parts = [
    touch.source ? `source=${touch.source}` : '',
    touch.medium ? `medium=${touch.medium}` : '',
    touch.campaign ? `campaign=${touch.campaign}` : '',
    touch.term ? `term=${touch.term}` : '',
    touch.content ? `content=${touch.content}` : '',
    touch.clickIdType ? `click_id=${touch.clickIdType}` : '',
    touch.referrerDomain ? `referrer=${touch.referrerDomain}` : ''
  ].filter(Boolean);
  return parts.join(' / ') || 'direct';
}

function shortCustomerNo(index: number) {
  return `C${String(index + 1).padStart(5, '0')}`;
}

function dayKey(timestamp: string) {
  return timestamp.slice(0, 10);
}

function csvCell(value: unknown) {
  const text = String(value ?? '');
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function customerTag(visitorId: string, event: AnalyticsEvent, leadVisitors: Set<string>, orderVisitors: Set<string>, firstSeen: Map<string, string>) {
  if (orderVisitors.has(visitorId)) return '已下单客户';
  if (leadVisitors.has(visitorId)) return '已留资客户';
  if (event.type.includes('checkout')) return '结账意向客户';
  return firstSeen.get(visitorId) === event.id ? '新访客' : '回访访客';
}

export async function getVisitorRecords(filter: Filter = {}) {
  const [events, orders] = await Promise.all([readAnalyticsEvents(), readStoreOrders()]);
  const realEvents = events
    .filter((event) => inRange(event.timestamp, filter))
    .filter(isRealVisitorEvent)
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  const customerNumbers = new Map<string, string>();
  const firstSeen = new Map<string, string>();
  const visitDaysByVisitor = new Map<string, Map<string, number>>();
  const leadVisitors = new Set(realEvents.filter((event) => /contact_inquiry|form_submit|submit/i.test(event.type)).map(stableVisitorId));
  const orderVisitors = new Set(orders.map((order) => order.attribution?.visitorId || order.userId || '').filter(Boolean));

  realEvents.forEach((event) => {
    const visitorId = stableVisitorId(event);
    if (!customerNumbers.has(visitorId)) customerNumbers.set(visitorId, shortCustomerNo(customerNumbers.size));
    if (!firstSeen.has(visitorId)) firstSeen.set(visitorId, event.id);
    const date = dayKey(event.timestamp);
    const days = visitDaysByVisitor.get(visitorId) || new Map<string, number>();
    if (!days.has(date)) days.set(date, days.size + 1);
    visitDaysByVisitor.set(visitorId, days);
  });

  const records: VisitorRecord[] = realEvents.map((event) => {
    const visitorId = stableVisitorId(event);
    const touch = touchFor(event);
    const visitIndex = visitDaysByVisitor.get(visitorId)?.get(dayKey(event.timestamp)) || 1;
    return {
      time: event.timestamp,
      customerNo: customerNumbers.get(visitorId) || shortCustomerNo(0),
      visitorId,
      country: event.country || touch.countryCode || 'Unknown',
      device: event.device || touch.deviceType || 'Unknown',
      browser: event.browser || 'Unknown',
      source: touch.channel || 'unknown',
      sourcePlatform: platformLabel(touch),
      sourceDetail: sourceDetail(touch),
      page: event.page || touch.currentUrl || touch.landingPage || '/',
      customerTag: customerTag(visitorId, event, leadVisitors, orderVisitors, firstSeen),
      visitDay: `第 ${visitIndex} 个访问日`,
      ip: event.ip || ''
    };
  }).reverse();

  const q = (filter.q || '').trim().toLowerCase();
  const country = (filter.country || '').trim().toLowerCase();
  const source = (filter.source || '').trim().toLowerCase();
  const filtered = records.filter((record) => {
    if (country && !`${record.country} ${zhCountry(record.country)}`.toLowerCase().includes(country)) return false;
    if (source && !`${record.source} ${zhTrafficSource(record.source)} ${record.sourcePlatform} ${zhTrafficPlatform(record.sourcePlatform)}`.toLowerCase().includes(source)) return false;
    if (!q) return true;
    return Object.values(record).some((value) => String(value).toLowerCase().includes(q));
  });

  const perPage = Math.max(1, filter.perPage || filter.limit || 10);
  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const page = Math.min(Math.max(1, filter.page || 1), totalPages);
  const start = (page - 1) * perPage;

  return {
    generatedAt: new Date().toISOString(),
    store: durableStoreStatus(),
    total: filtered.length,
    page,
    perPage,
    totalPages,
    records: filtered.slice(start, start + perPage)
  };
}

export function visitorRecordsCsv(records: VisitorRecord[]) {
  const headers = ['时间', '客户编号', '国家', '设备', '浏览器', '来源', '来源平台', '来源详情', '页面', '客户标签', '访问日', 'IP'];
  const rows = records.map((record) => [
    record.time,
    record.customerNo,
    record.country,
    record.device,
    record.browser,
    record.source,
    record.sourcePlatform,
    record.sourceDetail,
    record.page,
    record.customerTag,
    record.visitDay,
    record.ip
  ]);
  return [headers, ...rows].map((row) => row.map(csvCell).join(',')).join('\n');
}
