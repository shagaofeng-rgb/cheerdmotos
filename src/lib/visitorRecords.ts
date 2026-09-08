import {createHash} from 'node:crypto';
import {readAnalyticsEvents, readStoreOrders, type AnalyticsEvent} from '@/lib/commerceStore';
import {durableStoreStatus} from '@/lib/durableStore';
import {zhCountry, zhTrafficPlatform, zhTrafficSource} from '@/lib/adminLabels';
import {classifyTraffic, type AttributionSnapshot, type TrafficTouch} from '@/lib/trafficAttribution';
import {classifyTrafficQuality, maskIp} from '@/lib/analyticsGovernance';

export type VisitorRecord = {
  customerNo: string;
  visitorId: string;
  firstSeen: string;
  lastSeen: string;
  country: string;
  device: string;
  browser: string;
  source: string;
  sourcePlatform: string;
  sourceDetail: string;
  lastPage: string;
  customerTag: string;
  sessions: number;
  pageViews: number;
  visitDays: number;
  ip: string;
};

export type VisitorJourney = VisitorRecord & {
  events: Array<Pick<AnalyticsEvent, 'id' | 'type' | 'page' | 'pageTitle' | 'timestamp'>>;
  journeys: Array<{
    sessionId: string;
    startedAt: string;
    endedAt: string;
    source: string;
    pages: string[];
    events: Array<Pick<AnalyticsEvent, 'id' | 'type' | 'page' | 'pageTitle' | 'timestamp'>>;
  }>;
};

type Filter = {from?: Date; to?: Date; q?: string; country?: string; source?: string; device?: string; tag?: string; limit?: number; page?: number; perPage?: number;};
type VisitorAggregate = Omit<VisitorRecord, 'customerNo' | 'sessions' | 'pageViews' | 'visitDays' | 'lastSeen'> & {visitorId: string; events: AnalyticsEvent[]; lastSeen: string;};

const GATEWAY_EVENTS = new Set(['payment_notice', 'payment_return']);
const INTERNAL_VISITORS = new Set(['payment-gateway', 'admin', 'local-test', 'checkout']);

function inRange(timestamp: string, filter: Filter) {
  const time = new Date(timestamp).getTime();
  return !Number.isNaN(time) && (!filter.from || time >= filter.from.getTime()) && (!filter.to || time <= filter.to.getTime());
}

function stableVisitorId(event: AnalyticsEvent) {
  const attribution = event.attribution as AttributionSnapshot | null | undefined;
  return attribution?.visitorId || event.visitorId || event.sessionId || 'anonymous';
}

function stableCustomerNo(visitorId: string) {
  const salt = process.env.ANALYTICS_VISITOR_SALT || process.env.ADMIN_JWT_SECRET || 'cheerdmoto-visitor-profile';
  return `V-${createHash('sha256').update(`${salt}:${visitorId}`).digest('hex').slice(0, 10).toUpperCase()}`;
}

function touchFor(event: AnalyticsEvent): TrafficTouch {
  const attribution = event.attribution as AttributionSnapshot | null | undefined;
  return attribution?.lastTouch || attribution?.sessionTouch || classifyTraffic({url: event.page, referrer: event.referrer, locale: String(event.payload?.language || ''), countryCode: event.country, deviceType: event.device, browser: event.browser, now: event.timestamp});
}

function isRealVisitorEvent(event: AnalyticsEvent) {
  if (!classifyTrafficQuality(event).include || GATEWAY_EVENTS.has(event.type) || event.type.startsWith('admin_')) return false;
  const visitorId = stableVisitorId(event);
  return !INTERNAL_VISITORS.has(visitorId) && !INTERNAL_VISITORS.has(event.visitorId) && event.device !== 'Gateway' && event.browser !== 'Gateway';
}

function platformLabel(touch: TrafficTouch) {
  const source = (touch.source || '').toLowerCase();
  const click = (touch.clickIdType || '').toLowerCase();
  if (source.includes('google') || ['gclid', 'gbraid', 'wbraid'].includes(click)) return 'Google Ads';
  if (source === 'meta' || source.includes('facebook') || source.includes('instagram') || click === 'fbclid') return 'Meta Ads';
  if (source.includes('linkedin') || click === 'li_fat_id') return 'LinkedIn';
  if (source.includes('tiktok') || click === 'ttclid') return 'TikTok';
  if (source.includes('bing') || click === 'msclkid') return 'Microsoft Ads';
  if (source === 'direct') return 'Direct';
  return touch.referrerDomain || touch.source || 'Unknown';
}

function sourceDetail(touch: TrafficTouch) {
  return [touch.source ? `source=${touch.source}` : '', touch.medium ? `medium=${touch.medium}` : '', touch.campaign ? `campaign=${touch.campaign}` : '', touch.term ? `term=${touch.term}` : '', touch.clickIdType ? `click_id=${touch.clickIdType}` : '', touch.referrerDomain ? `referrer=${touch.referrerDomain}` : ''].filter(Boolean).join(' / ') || 'direct';
}

function customerTag(visitorId: string, events: AnalyticsEvent[], orderVisitors: Set<string>) {
  if (orderVisitors.has(visitorId)) return '已下单客户';
  if (events.some((event) => /contact_inquiry|form_submit|submit/i.test(event.type))) return '已留资客户';
  if (events.some((event) => /checkout|add_to_cart|begin_checkout/i.test(event.type))) return '高意向客户';
  return new Set(events.map((event) => event.sessionId)).size > 1 ? '回访访客' : '新访客';
}

function aggregate(events: AnalyticsEvent[], orderVisitors: Set<string>) {
  const groups = new Map<string, AnalyticsEvent[]>();
  events.filter(isRealVisitorEvent).sort((a, b) => a.timestamp.localeCompare(b.timestamp)).forEach((event) => {
    const id = stableVisitorId(event);
    groups.set(id, [...(groups.get(id) || []), event]);
  });
  return [...groups.entries()].map(([visitorId, profileEvents]) => {
    const latest = profileEvents.at(-1)!;
    const touch = touchFor(latest);
    return {
      visitorId,
      events: profileEvents,
      firstSeen: profileEvents[0].timestamp,
      lastSeen: latest.timestamp,
      country: latest.country || touch.countryCode || 'Unknown',
      device: latest.device || touch.deviceType || 'Unknown',
      browser: latest.browser || 'Unknown',
      source: touch.channel || 'unknown',
      sourcePlatform: platformLabel(touch),
      sourceDetail: sourceDetail(touch),
      lastPage: latest.page || touch.currentUrl || touch.landingPage || '/',
      customerTag: customerTag(visitorId, profileEvents, orderVisitors),
      ip: maskIp(latest.ip || '')
    } satisfies VisitorAggregate;
  });
}

function recordFrom(profile: VisitorAggregate, scopedEvents: AnalyticsEvent[]): VisitorRecord {
  const latest = scopedEvents.at(-1);
  return {
    customerNo: stableCustomerNo(profile.visitorId), visitorId: profile.visitorId, firstSeen: profile.firstSeen, lastSeen: latest?.timestamp || profile.lastSeen,
    country: latest?.country || profile.country, device: latest?.device || profile.device, browser: latest?.browser || profile.browser,
    source: profile.source, sourcePlatform: profile.sourcePlatform, sourceDetail: profile.sourceDetail, lastPage: latest?.page || profile.lastPage,
    customerTag: profile.customerTag, sessions: new Set(scopedEvents.map((event) => event.sessionId)).size,
    pageViews: scopedEvents.filter((event) => event.type === 'page_view').length, visitDays: new Set(scopedEvents.map((event) => event.timestamp.slice(0, 10))).size, ip: profile.ip
  };
}

function matches(record: VisitorRecord, filter: Filter) {
  const q = (filter.q || '').trim().toLowerCase();
  const country = (filter.country || '').trim().toLowerCase();
  const source = (filter.source || '').trim().toLowerCase();
  const device = (filter.device || '').trim().toLowerCase();
  const tag = (filter.tag || '').trim().toLowerCase();
  if (country && !`${record.country} ${zhCountry(record.country)}`.toLowerCase().includes(country)) return false;
  if (source && !`${record.source} ${zhTrafficSource(record.source)} ${record.sourcePlatform} ${zhTrafficPlatform(record.sourcePlatform)}`.toLowerCase().includes(source)) return false;
  if (device && !record.device.toLowerCase().includes(device)) return false;
  if (tag && !record.customerTag.toLowerCase().includes(tag)) return false;
  return !q || Object.values(record).some((value) => String(value).toLowerCase().includes(q));
}

async function readProfiles() {
  const [events, orders] = await Promise.all([readAnalyticsEvents(), readStoreOrders()]);
  const orderVisitors = new Set(orders.map((order) => order.attribution?.visitorId || order.userId || '').filter(Boolean));
  return aggregate(events, orderVisitors);
}

export async function getVisitorRecords(filter: Filter = {}) {
  const records = (await readProfiles()).map((profile) => recordFrom(profile, profile.events.filter((event) => inRange(event.timestamp, filter)))).filter((record) => record.sessions > 0).filter((record) => matches(record, filter)).sort((a, b) => b.lastSeen.localeCompare(a.lastSeen));
  const perPage = Math.max(1, filter.perPage || filter.limit || 20);
  const totalPages = Math.max(1, Math.ceil(records.length / perPage));
  const page = Math.min(Math.max(1, filter.page || 1), totalPages);
  return {generatedAt: new Date().toISOString(), store: durableStoreStatus(), total: records.length, page, perPage, totalPages, records: records.slice((page - 1) * perPage, page * perPage)};
}

export async function getVisitorJourney(customerNo: string, filter: Filter = {}) {
  const profile = (await readProfiles()).find((item) => stableCustomerNo(item.visitorId) === customerNo);
  if (!profile) return null;
  const scopedEvents = profile.events.filter((event) => inRange(event.timestamp, filter));
  const selected = scopedEvents.length ? scopedEvents : profile.events;
  const bySession = new Map<string, AnalyticsEvent[]>();
  selected.forEach((event) => bySession.set(event.sessionId, [...(bySession.get(event.sessionId) || []), event]));
  const journeys = [...bySession.entries()].map(([sessionId, events]) => ({
    sessionId, startedAt: events[0].timestamp, endedAt: events.at(-1)!.timestamp, source: platformLabel(touchFor(events[0])),
    pages: events.filter((event) => event.type === 'page_view').map((event) => event.page).filter((page, index, all) => index === 0 || all[index - 1] !== page),
    events: events.map(({id, type, page, pageTitle, timestamp}) => ({id, type, page, pageTitle, timestamp}))
  })).sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  return {...recordFrom(profile, selected), events: selected.map(({id, type, page, pageTitle, timestamp}) => ({id, type, page, pageTitle, timestamp})), journeys} satisfies VisitorJourney;
}

function csvCell(value: unknown) { const text = String(value ?? ''); return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text; }

export function visitorRecordsCsv(records: VisitorRecord[]) {
  const headers = ['客户编号', '首次访问', '最近访问', '国家', '设备', '浏览器', '来源', '来源平台', '来源详情', '最后页面', '客户标签', '会话数', '浏览量', '访问天数', 'IP'];
  const rows = records.map((record) => [record.customerNo, record.firstSeen, record.lastSeen, record.country, record.device, record.browser, record.source, record.sourcePlatform, record.sourceDetail, record.lastPage, record.customerTag, record.sessions, record.pageViews, record.visitDays, record.ip]);
  return [headers, ...rows].map((row) => row.map(csvCell).join(',')).join('\n');
}
