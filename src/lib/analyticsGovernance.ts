import crypto from 'node:crypto';
import type {AnalyticsEvent} from '@/lib/commerceStore';

const TEST_QUERY_KEYS = new Set(['__test', '_test', 'test', 'test_mode', 'form_health_check', 'collect', 'collects', 'preview']);
const EXCLUDED_EVENT_TYPES = new Set(['payment_notice', 'payment_return', 'admin_order_shipment', 'admin_order_refund', 'admin_order_authorization']);

export type TrafficDecision = {include: boolean; reason: string};

function envList(name: string) {
  return new Set((process.env[name] || '').split(',').map((value) => value.trim()).filter(Boolean));
}

function queryHasTestMarker(page: string) {
  try {
    const params = new URL(page, 'https://analytics.local').searchParams;
    return [...params.keys()].some((key) => TEST_QUERY_KEYS.has(key.toLowerCase()));
  } catch {
    return false;
  }
}

export function maskIp(ip = '') {
  if (!ip) return '';
  if (ip.includes(':')) return `${ip.split(':').slice(0, 3).join(':')}::*`;
  const parts = ip.split('.');
  return parts.length === 4 ? `${parts[0]}.${parts[1]}.${parts[2]}.*` : '';
}

export function fingerprintIp(ip = '') {
  if (!ip) return '';
  const salt = process.env.ANALYTICS_IP_SALT || process.env.ADMIN_JWT_SECRET || 'cheerdmoto-analytics-fallback';
  return crypto.createHash('sha256').update(`${salt}:${ip}`).digest('hex').slice(0, 24);
}

export function classifyTrafficQuality(input: Pick<AnalyticsEvent, 'type' | 'visitorId' | 'page' | 'device' | 'browser' | 'payload' | 'ipHash'>): TrafficDecision {
  const internalIps = envList('ANALYTICS_INTERNAL_IP_HASHES');
  const testVisitors = envList('ANALYTICS_TEST_VISITOR_PREFIXES');
  const ipHash = String(input.ipHash || input.payload?.ipHash || '');
  if (EXCLUDED_EVENT_TYPES.has(input.type) || input.type.startsWith('admin_')) return {include: false, reason: 'system_event'};
  if (/^(admin|local-test|checkout|payment-gateway|test[_-])/i.test(input.visitorId) || [...testVisitors].some((prefix) => input.visitorId.startsWith(prefix))) return {include: false, reason: 'test_visitor'};
  if (queryHasTestMarker(input.page)) return {include: false, reason: 'test_query'};
  if (input.device === 'Gateway' || input.browser === 'Gateway') return {include: false, reason: 'gateway'};
  if (ipHash && internalIps.has(ipHash)) return {include: false, reason: 'internal_ip'};
  if (input.payload?.trafficQuality === 'test' || input.payload?.trafficQuality === 'bot') return {include: false, reason: String(input.payload.trafficQuality)};
  return {include: true, reason: 'real'};
}

export function analyticsGovernanceStatus() {
  return {
    internalIpRules: envList('ANALYTICS_INTERNAL_IP_HASHES').size,
    visitorPrefixRules: envList('ANALYTICS_TEST_VISITOR_PREFIXES').size,
    excludedQueryKeys: [...TEST_QUERY_KEYS]
  };
}
