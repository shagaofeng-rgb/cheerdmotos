import {classifyTrafficQuality, analyticsGovernanceStatus} from '@/lib/analyticsGovernance';
import {readAnalyticsEvents, type AnalyticsEvent} from '@/lib/commerceStore';
import {readStoreLines} from '@/lib/durableStore';
import {classifyTraffic, type AttributionSnapshot} from '@/lib/trafficAttribution';

type Filter = {from?: Date; to?: Date};
type CountRow = {label: string; value: number};

function inRange(timestamp: string, filter: Filter) {
  const time = new Date(timestamp).getTime();
  return !Number.isNaN(time) && (!filter.from || time >= filter.from.getTime()) && (!filter.to || time <= filter.to.getTime());
}

function count(values: string[], limit = 8): CountRow[] {
  const result = new Map<string, number>();
  values.filter(Boolean).forEach((value) => result.set(value, (result.get(value) || 0) + 1));
  return [...result.entries()].map(([label, value]) => ({label, value})).sort((a, b) => b.value - a.value).slice(0, limit);
}

function touch(event: AnalyticsEvent) {
  const attribution = event.attribution as AttributionSnapshot | null | undefined;
  return attribution?.lastTouch || classifyTraffic({url: event.page, referrer: event.referrer, countryCode: event.country, deviceType: event.device, browser: event.browser, now: event.timestamp});
}

function visitorSegment(events: AnalyticsEvent[]) {
  if (events.some((event) => /contact_inquiry|form_submit/i.test(event.type))) return '已留资';
  if (events.some((event) => /checkout|add_to_cart|commerce_click/i.test(event.type))) return '高意向';
  const days = new Set(events.map((event) => event.timestamp.slice(0, 10)));
  return days.size > 1 ? '回访' : '新访客';
}

export async function getAnalyticsOperationsReport(filter: Filter = {}) {
  const [allEvents, exclusions] = await Promise.all([readAnalyticsEvents(), readStoreLines<{at: string; reason: string}>('analytics-exclusions.jsonl')]);
  const windowEvents = allEvents.filter((event) => inRange(event.timestamp, filter));
  const events = windowEvents.filter((event) => classifyTrafficQuality(event).include);
  const byVisitor = new Map<string, AnalyticsEvent[]>();
  events.forEach((event) => byVisitor.set(event.visitorId, [...(byVisitor.get(event.visitorId) || []), event]));
  const visitors = [...byVisitor.entries()].map(([visitorId, rows]) => {
    const ordered = rows.slice().sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    const last = ordered.at(-1)!;
    const lastTouch = touch(last);
    return {visitorId, lastSeen: last.timestamp, country: last.country || 'Unknown', source: lastTouch.channel || 'unknown', page: last.page, events: ordered.length, sessions: new Set(ordered.map((event) => event.sessionId)).size, segment: visitorSegment(ordered)};
  }).sort((a, b) => b.lastSeen.localeCompare(a.lastSeen));
  const filteredExclusions = exclusions.filter((item) => inRange(item.at, filter));
  const pageViews = events.filter((event) => event.type === 'page_view');
  const now = Date.now();
  return {
    generatedAt: new Date().toISOString(),
    metrics: {
      visitors: visitors.length,
      sessions: new Set(events.map((event) => event.sessionId)).size,
      pageViews: pageViews.length,
      returningVisitors: visitors.filter((visitor) => visitor.segment === '回访').length,
      highIntentVisitors: visitors.filter((visitor) => visitor.segment === '高意向' || visitor.segment === '已留资').length,
      activeNow: visitors.filter((visitor) => now - new Date(visitor.lastSeen).getTime() <= 30 * 60 * 1000).length,
      excluded: filteredExclusions.length
    },
    countries: count(events.map((event) => event.country || 'Unknown')),
    channels: count(events.map((event) => touch(event).channel || 'unknown')),
    landingPages: count(pageViews.map((event) => touch(event).landingPage || event.page)),
    pages: count(pageViews.map((event) => event.page)),
    devices: count(events.map((event) => event.device || 'Unknown')),
    segments: count(visitors.map((visitor) => visitor.segment)),
    liveVisitors: visitors.slice(0, 12),
    exclusions: count(filteredExclusions.map((item) => item.reason)),
    governance: analyticsGovernanceStatus()
  };
}
