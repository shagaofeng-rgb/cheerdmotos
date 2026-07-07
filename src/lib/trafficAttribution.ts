export type TrafficChannel =
  | 'direct'
  | 'organic_search'
  | 'paid_search'
  | 'organic_social'
  | 'paid_social'
  | 'referral'
  | 'email'
  | 'affiliate'
  | 'display'
  | 'unknown';

export type TrafficTouch = {
  source: string;
  medium: string;
  channel: TrafficChannel;
  campaign: string;
  term: string;
  content: string;
  clickId: string;
  clickIdType: string;
  referrer: string;
  referrerDomain: string;
  landingPage: string;
  currentUrl: string;
  locale: string;
  countryCode: string;
  deviceType: string;
  browser: string;
  createdAt: string;
};

export type AttributionSnapshot = {
  visitorId: string;
  sessionId: string;
  firstTouch: TrafficTouch;
  lastTouch: TrafficTouch;
  sessionTouch: TrafficTouch;
};

const SEARCH_DOMAINS: Record<string, string> = {
  google: 'google',
  bing: 'bing',
  yahoo: 'yahoo',
  baidu: 'baidu',
  yandex: 'yandex',
  duckduckgo: 'duckduckgo',
  naver: 'naver',
  sogou: 'sogou'
};

const SOCIAL_DOMAINS: Record<string, string> = {
  facebook: 'facebook',
  instagram: 'instagram',
  tiktok: 'tiktok',
  linkedin: 'linkedin',
  youtube: 'youtube',
  'youtu.be': 'youtube',
  twitter: 'x',
  'x.com': 'x',
  't.co': 'x',
  pinterest: 'pinterest',
  reddit: 'reddit',
  whatsapp: 'whatsapp',
  telegram: 'telegram',
  wechat: 'wechat'
};

const CLICK_ID_MAP: Record<string, {source: string; channel: TrafficChannel; medium: string}> = {
  gclid: {source: 'google_ads', channel: 'paid_search', medium: 'cpc'},
  gbraid: {source: 'google_ads', channel: 'paid_search', medium: 'cpc'},
  wbraid: {source: 'google_ads', channel: 'paid_search', medium: 'cpc'},
  fbclid: {source: 'meta', channel: 'paid_social', medium: 'paid_social'},
  ttclid: {source: 'tiktok_ads', channel: 'paid_social', medium: 'paid_social'},
  li_fat_id: {source: 'linkedin_ads', channel: 'paid_social', medium: 'paid_social'},
  msclkid: {source: 'microsoft_ads', channel: 'paid_search', medium: 'cpc'},
  twclid: {source: 'x_ads', channel: 'paid_social', medium: 'paid_social'},
  epik: {source: 'pinterest_ads', channel: 'paid_social', medium: 'paid_social'}
};

function clean(value: unknown, limit = 200) {
  return String(value || '').trim().replace(/[<>"'`]/g, '').replace(/\s+/g, ' ').slice(0, limit);
}

function domainFrom(referrer: string) {
  try {
    return new URL(referrer).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return '';
  }
}

function channelFromMedium(medium: string): TrafficChannel {
  const value = medium.toLowerCase();
  if (/cpc|ppc|paid_search|sem/.test(value)) return 'paid_search';
  if (/paid_social|social_paid/.test(value)) return 'paid_social';
  if (/social|organic_social/.test(value)) return 'organic_social';
  if (/email|newsletter/.test(value)) return 'email';
  if (/affiliate/.test(value)) return 'affiliate';
  if (/display|banner|programmatic/.test(value)) return 'display';
  if (/organic/.test(value)) return 'organic_search';
  if (/referral/.test(value)) return 'referral';
  if (/direct/.test(value)) return 'direct';
  return 'unknown';
}

function sourceFromReferrer(domain: string) {
  const social = Object.keys(SOCIAL_DOMAINS).find((key) => domain.includes(key));
  if (social) return {source: SOCIAL_DOMAINS[social], channel: 'organic_social' as const, medium: 'social'};
  const search = Object.keys(SEARCH_DOMAINS).find((key) => domain.includes(key));
  if (search) return {source: SEARCH_DOMAINS[search], channel: 'organic_search' as const, medium: 'organic'};
  return domain ? {source: domain, channel: 'referral' as const, medium: 'referral'} : null;
}

export function classifyTraffic(input: {
  url?: string;
  referrer?: string;
  locale?: string;
  countryCode?: string;
  deviceType?: string;
  browser?: string;
  now?: string;
}): TrafficTouch {
  const currentUrl = clean(input.url || '', 500);
  const params = new URLSearchParams(currentUrl.includes('?') ? currentUrl.split('?').slice(1).join('?') : '');
  const referrer = clean(input.referrer || '', 500);
  const referrerDomain = domainFrom(referrer);
  const utmSource = clean(params.get('utm_source'), 100).toLowerCase();
  const utmMedium = clean(params.get('utm_medium'), 100).toLowerCase();
  const utmCampaign = clean(params.get('utm_campaign'), 200);
  const term = clean(params.get('utm_term'), 200);
  const content = clean(params.get('utm_content'), 200);
  const clickEntry = Object.keys(CLICK_ID_MAP).find((key) => params.has(key));
  const landingPage = clean(currentUrl.split('#')[0], 500);
  const createdAt = input.now || new Date().toISOString();

  let source = '';
  let medium = '';
  let channel: TrafficChannel = 'unknown';
  if (utmSource || utmMedium || utmCampaign) {
    source = utmSource || 'unknown';
    medium = utmMedium || 'unknown';
    channel = channelFromMedium(medium);
  } else if (clickEntry) {
    const mapped = CLICK_ID_MAP[clickEntry];
    source = mapped.source;
    medium = mapped.medium;
    channel = mapped.channel;
  } else {
    const referred = sourceFromReferrer(referrerDomain);
    if (referred) {
      source = referred.source;
      medium = referred.medium;
      channel = referred.channel;
    } else {
      source = 'direct';
      medium = 'direct';
      channel = 'direct';
    }
  }

  if (utmSource === 'facebook' || utmSource === 'instagram') {
    source = utmSource;
    channel = utmMedium.includes('paid') || utmMedium === 'cpc' ? 'paid_social' : 'organic_social';
  } else if (clickEntry === 'fbclid' && referrerDomain.includes('instagram')) {
    source = 'instagram';
  } else if (clickEntry === 'fbclid' && referrerDomain.includes('facebook')) {
    source = 'facebook';
  }

  return {
    source,
    medium,
    channel,
    campaign: utmCampaign,
    term,
    content,
    clickId: clickEntry ? clean(params.get(clickEntry), 240) : '',
    clickIdType: clickEntry || '',
    referrer,
    referrerDomain,
    landingPage,
    currentUrl,
    locale: clean(input.locale || '', 20),
    countryCode: clean(input.countryCode || '', 20),
    deviceType: clean(input.deviceType || '', 40),
    browser: clean(input.browser || '', 40),
    createdAt
  };
}

export function isMeaningfulMarketingTouch(touch: TrafficTouch) {
  return touch.channel !== 'direct' && touch.channel !== 'unknown';
}

export function compactAttribution(input: unknown): AttributionSnapshot | null {
  if (!input || typeof input !== 'object') return null;
  const value = input as AttributionSnapshot;
  if (!value.visitorId || !value.sessionId || !value.firstTouch || !value.lastTouch || !value.sessionTouch) return null;
  return value;
}
