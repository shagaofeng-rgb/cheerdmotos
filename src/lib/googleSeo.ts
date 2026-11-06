import crypto from 'node:crypto';
import {appendStoreLine, readStoreLines, readStoreObject, withStoreLock, writeStoreObject} from '@/lib/durableStore';
import {siteUrl as publicSiteUrl} from '@/lib/site';

const STORE_FILE = 'google-seo-snapshot.json';
const RUN_LOG_FILE = 'google-seo-runs.jsonl';
const SUBMISSION_STATE_FILE = 'google-seo-submission-state.json';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const WEBMASTERS_READONLY_SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly';
const WEBMASTERS_WRITE_SCOPE = 'https://www.googleapis.com/auth/webmasters';
const DEFAULT_SITE_PROPERTY = 'sc-domain:cheerdmotos.com';

export const GOOGLE_SITEMAP_PATHS = ['/sitemap.xml', '/news-sitemap.xml', '/image-sitemap.xml'] as const;
export const GOOGLE_INSPECTION_PATHS = ['/', '/products', '/products/xceed-electric-dirt-bike', '/dealer-program', '/blog', '/news'] as const;

export type GoogleSeoMetricRow = {
  key: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

export type GoogleSeoSitemap = {
  path: string;
  lastSubmitted: string;
  lastDownloaded: string;
  pending: boolean;
  warnings: number;
  errors: number;
  submitted: number;
};

export type GoogleUrlInspection = {
  url: string;
  inspectedAt: string;
  verdict: string;
  coverage: string;
  crawledAt: string;
  googleCanonical: string;
  error: string;
};

export type GoogleSeoSnapshot = {
  status: 'ok' | 'not_configured' | 'error';
  siteUrl: string;
  syncedAt: string;
  attemptedAt?: string;
  sitemapsSyncedAt?: string;
  range: {
    startDate: string;
    endDate: string;
  };
  totals: {
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
  };
  pages: GoogleSeoMetricRow[];
  queries: GoogleSeoMetricRow[];
  countries: GoogleSeoMetricRow[];
  devices: GoogleSeoMetricRow[];
  sitemaps: GoogleSeoSitemap[];
  inspections?: GoogleUrlInspection[];
  error: string;
};

export type GoogleSeoRun = {
  id: string;
  trigger: string;
  startedAt: string;
  finishedAt: string;
  siteUrl: string;
  due: boolean;
  nextDueAt: string;
  snapshotStatus: GoogleSeoSnapshot['status'];
  submitted: boolean;
  results: Array<{sitemapUrl: string; ok: boolean; submitted: boolean; message: string}>;
  error: string;
};

type GoogleSeoSubmissionState = {
  lastSuccessfulAt: string;
  sitemapUrls: string[];
};

type SearchAnalyticsRow = {
  keys?: string[];
  clicks?: number;
  impressions?: number;
  ctr?: number;
  position?: number;
};

type ServiceAccountCredentials = {
  client_email: string;
  private_key: string;
};

function emptySnapshot(status: GoogleSeoSnapshot['status'], message = ''): GoogleSeoSnapshot {
  const range = defaultDateRange();
  return {
    status,
    siteUrl: getConfiguredSiteUrl(),
    syncedAt: '',
    range,
    totals: {clicks: 0, impressions: 0, ctr: 0, position: 0},
    pages: [],
    queries: [],
    countries: [],
    devices: [],
    sitemaps: [],
    error: message
  };
}

function defaultDateRange() {
  const days = Math.max(3, Math.min(90, Number(process.env.GOOGLE_SEARCH_CONSOLE_SYNC_DAYS || 28)));
  const end = new Date();
  end.setUTCDate(end.getUTCDate() - 2);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - days + 1);
  return {
    startDate: toDateString(start),
    endDate: toDateString(end)
  };
}

function toDateString(date: Date) {
  return date.toISOString().slice(0, 10);
}

function getConfiguredSiteUrl() {
  return (
    process.env.GOOGLE_SEARCH_CONSOLE_SITE_URL ||
    process.env.GSC_SITE_URL ||
    process.env.SITE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    DEFAULT_SITE_PROPERTY
  ).trim();
}

function isValidSearchConsoleProperty(value: string) {
  if (value.startsWith('sc-domain:')) return Boolean(value.slice('sc-domain:'.length));
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

function readCredentials(): ServiceAccountCredentials | null {
  const rawJson = process.env.GOOGLE_SEARCH_CONSOLE_SERVICE_ACCOUNT_JSON || process.env.GSC_SERVICE_ACCOUNT_JSON || '';
  if (rawJson.trim()) {
    try {
      const parsed = JSON.parse(rawJson) as Partial<ServiceAccountCredentials>;
      if (parsed.client_email && parsed.private_key) {
        return {
          client_email: parsed.client_email,
          private_key: normalizePrivateKey(parsed.private_key)
        };
      }
    } catch {
      return null;
    }
  }

  const clientEmail = process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL || process.env.GSC_CLIENT_EMAIL || '';
  const privateKey = process.env.GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY || process.env.GSC_PRIVATE_KEY || '';
  if (!clientEmail || !privateKey) return null;
  return {
    client_email: clientEmail.trim(),
    private_key: normalizePrivateKey(privateKey)
  };
}

function normalizePrivateKey(value: string) {
  return value.replace(/\\n/g, '\n').trim();
}

function base64UrlJson(value: unknown) {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

async function getAccessToken(credentials: ServiceAccountCredentials, scope = WEBMASTERS_READONLY_SCOPE) {
  const now = Math.floor(Date.now() / 1000);
  const header = base64UrlJson({alg: 'RS256', typ: 'JWT'});
  const claim = base64UrlJson({
    iss: credentials.client_email,
    scope,
    aud: TOKEN_URL,
    exp: now + 3600,
    iat: now
  });
  const unsigned = `${header}.${claim}`;
  const signature = crypto.createSign('RSA-SHA256').update(unsigned).sign(credentials.private_key, 'base64url');
  const jwt = `${unsigned}.${signature}`;

  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {'Content-Type': 'application/x-www-form-urlencoded'},
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt
    }),
    cache: 'no-store',
    signal: AbortSignal.timeout(15000)
  });
  const payload = await response.json().catch(() => ({})) as {access_token?: string; error_description?: string; error?: string};
  if (!response.ok || !payload.access_token) {
    throw new Error(payload.error_description || payload.error || `Google token request failed: ${response.status}`);
  }
  return payload.access_token;
}

async function querySearchAnalytics(accessToken: string, siteUrl: string, range: {startDate: string; endDate: string}, dimensions: string[]) {
  const endpoint = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      startDate: range.startDate,
      endDate: range.endDate,
      dimensions,
      rowLimit: dimensions.length ? 50 : 1,
      dataState: 'final'
    }),
    cache: 'no-store',
    signal: AbortSignal.timeout(15000)
  });
  const payload = await response.json().catch(() => ({})) as {rows?: SearchAnalyticsRow[]; error?: {message?: string}};
  if (!response.ok) {
    throw new Error(payload.error?.message || `Google Search Console query failed: ${response.status}`);
  }
  return payload.rows || [];
}

function normalizeRows(rows: SearchAnalyticsRow[]) {
  return rows.map((row) => ({
    key: (row.keys || []).join(' / ') || 'Total',
    clicks: Number(row.clicks || 0),
    impressions: Number(row.impressions || 0),
    ctr: Number(row.ctr || 0),
    position: Number(row.position || 0)
  }));
}

function totalsFromRows(rows: SearchAnalyticsRow[]): GoogleSeoSnapshot['totals'] {
  const row = rows[0] || {};
  return {
    clicks: Number(row.clicks || 0),
    impressions: Number(row.impressions || 0),
    ctr: Number(row.ctr || 0),
    position: Number(row.position || 0)
  };
}

export function googleSeoConfigStatus() {
  const credentials = readCredentials();
  const siteUrl = getConfiguredSiteUrl();
  return {
    configured: Boolean(credentials && isValidSearchConsoleProperty(siteUrl)),
    siteUrl,
    propertyType: siteUrl.startsWith('sc-domain:') ? 'domain' : 'url-prefix',
    credentialSource: process.env.GOOGLE_SEARCH_CONSOLE_SERVICE_ACCOUNT_JSON || process.env.GSC_SERVICE_ACCOUNT_JSON
      ? 'service_account_json'
      : credentials
        ? 'client_email_private_key'
        : 'missing'
  };
}

async function querySitemaps(accessToken: string, siteUrl: string): Promise<GoogleSeoSitemap[]> {
  const endpoint = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/sitemaps`;
  const response = await fetch(endpoint, {
    headers: {Authorization: `Bearer ${accessToken}`},
    cache: 'no-store',
    signal: AbortSignal.timeout(15000)
  });
  const payload = await response.json().catch(() => ({})) as {
    sitemap?: Array<{
      path?: string;
      lastSubmitted?: string;
      lastDownloaded?: string;
      isPending?: boolean;
      warnings?: string;
      errors?: string;
      contents?: Array<{submitted?: string}>;
    }>;
    error?: {message?: string};
  };
  if (!response.ok) {
    throw new Error(payload.error?.message || `Google Search Console sitemap query failed: ${response.status}`);
  }
  return (payload.sitemap || []).map((item) => ({
    path: item.path || '',
    lastSubmitted: item.lastSubmitted || '',
    lastDownloaded: item.lastDownloaded || '',
    pending: Boolean(item.isPending),
    warnings: Number(item.warnings || 0),
    errors: Number(item.errors || 0),
    submitted: (item.contents || []).reduce((total, content) => total + Number(content.submitted || 0), 0)
  }));
}

async function inspectUrl(accessToken: string, siteUrl: string, url: string): Promise<GoogleUrlInspection> {
  const base = {url, inspectedAt: new Date().toISOString(), verdict: '', coverage: '', crawledAt: '', googleCanonical: ''};
  try {
    const response = await fetch('https://searchconsole.googleapis.com/v1/urlInspection/index:inspect', {
      method: 'POST',
      headers: {Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json'},
      body: JSON.stringify({inspectionUrl: url, siteUrl, languageCode: 'en-US'}),
      cache: 'no-store',
      signal: AbortSignal.timeout(15000)
    });
    const data = await response.json() as {inspectionResult?: {indexStatusResult?: {
      verdict?: string; coverageState?: string; lastCrawlTime?: string; googleCanonical?: string;
    }}; error?: {message?: string}};
    const status = data.inspectionResult?.indexStatusResult;
    if (!response.ok || !status) throw new Error(data.error?.message || `Google URL Inspection: ${response.status}`);
    return {...base, verdict: status.verdict || '', coverage: status.coverageState || '', crawledAt: status.lastCrawlTime || '', googleCanonical: status.googleCanonical || '', error: ''};
  } catch (error) {
    return {...base, error: errorMessage(error)};
  }
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export function googleWeeklySchedule(now = new Date()) {
  const monday = new Date(now);
  monday.setUTCHours(1, 0, 0, 0);
  monday.setUTCDate(monday.getUTCDate() - (monday.getUTCDay() + 6) % 7);
  if (monday > now) monday.setUTCDate(monday.getUTCDate() - 7);
  return {current: monday.toISOString(), next: new Date(monday.getTime() + WEEK_MS).toISOString()};
}

export async function readGoogleSeoRuns(limit = 20) {
  return (await readStoreLines<GoogleSeoRun>(RUN_LOG_FILE)).slice(-limit).reverse();
}

async function submissionState() {
  return (await readStoreObject<GoogleSeoSubmissionState>(SUBMISSION_STATE_FILE)) || {
    lastSuccessfulAt: '',
    sitemapUrls: []
  };
}

export async function submitSitemapsToGoogle(sitemapUrls: readonly string[]) {
  const urls = [...new Set(sitemapUrls)];
  const enabled = String(process.env.GOOGLE_SEARCH_CONSOLE_ENABLED || 'true').toLowerCase() !== 'false';
  const credentials = readCredentials();
  const siteUrl = getConfiguredSiteUrl();
  if (!enabled || !credentials || !isValidSearchConsoleProperty(siteUrl)) {
    const message = !enabled ? 'Google sitemap submission is disabled.' : 'Search Console property or credentials are missing.';
    return urls.map((sitemapUrl) => ({sitemapUrl, ok: false, submitted: false, message}));
  }
  let token: string;
  try {
    token = await getAccessToken(credentials, WEBMASTERS_WRITE_SCOPE);
  } catch (error) {
    return urls.map((sitemapUrl) => ({sitemapUrl, ok: false, submitted: false, message: errorMessage(error)}));
  }
  return Promise.all(urls.map(async (sitemapUrl) => ({sitemapUrl, ...await sendSitemap(siteUrl, sitemapUrl, token)})));
}

async function sendSitemap(siteUrl: string, configuredSitemapUrl: string, token: string) {
  try {
    const sitemapResponse = await fetch(configuredSitemapUrl, {cache: 'no-store', signal: AbortSignal.timeout(12000)});
    if (!sitemapResponse.ok || !/xml/i.test(sitemapResponse.headers.get('content-type') || '')) {
      return {ok: false, submitted: false, message: `Sitemap URL did not return XML: ${sitemapResponse.status}`};
    }

    const endpoint = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/sitemaps/${encodeURIComponent(configuredSitemapUrl)}`;
    const response = await fetch(endpoint, {
      method: 'PUT',
      headers: {Authorization: `Bearer ${token}`},
      cache: 'no-store',
      signal: AbortSignal.timeout(15000)
    });
    const payload = await response.json().catch(() => ({})) as {error?: {message?: string}};
    if (!response.ok) {
      return {ok: false, submitted: false, message: payload.error?.message || `Google sitemap submit failed: ${response.status}`};
    }
    return {ok: true, submitted: true, message: 'Google Search Console sitemap submit request accepted.'};
  } catch (error) {
    return {ok: false, submitted: false, message: errorMessage(error)};
  }
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Unknown Google Search Console error';
}

export async function runGoogleSeoMaintenance(options: {trigger: string; sitemapUrls: readonly string[]; force?: boolean}) {
  return withStoreLock('google-seo-maintenance', () => executeGoogleSeoMaintenance(options), {ttlSeconds: 150});
}

async function executeGoogleSeoMaintenance(options: Parameters<typeof runGoogleSeoMaintenance>[0]) {
  const startedAt = new Date().toISOString();
  const schedule = googleWeeklySchedule();
  const state = await submissionState();
  const due = Boolean(options.force || state.lastSuccessfulAt < schedule.current);
  const results = due ? await submitSitemapsToGoogle(options.sitemapUrls) : [];
  const submitted = results.length > 0 && results.every((result) => result.ok && result.submitted);
  if (submitted) {
    await writeStoreObject(SUBMISSION_STATE_FILE, {
      lastSuccessfulAt: new Date().toISOString(),
      sitemapUrls: results.map((result) => result.sitemapUrl)
    } satisfies GoogleSeoSubmissionState);
  }
  const snapshot = await syncGoogleSeoSnapshot();
  const errors = results.filter((result) => !result.ok).map((result) => `${result.sitemapUrl}: ${result.message}`);
  if (snapshot.status !== 'ok') errors.push(snapshot.error || 'Google Search Console could not be queried.');

  const run: GoogleSeoRun = {
    id: `google-seo-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    trigger: options.trigger,
    startedAt,
    finishedAt: new Date().toISOString(),
    siteUrl: getConfiguredSiteUrl(),
    due,
    nextDueAt: schedule.next,
    snapshotStatus: snapshot.status,
    submitted,
    results,
    error: errors.join('; ')
  };
  await appendStoreLine(RUN_LOG_FILE, run);
  return {run, snapshot};
}

export async function readGoogleSeoSnapshot() {
  const stored = await readStoreObject<GoogleSeoSnapshot>(STORE_FILE);
  if (stored) return stored;
  return emptySnapshot(googleSeoConfigStatus().configured ? 'error' : 'not_configured', googleSeoConfigStatus().configured ? 'Google SEO data has not been synced yet.' : 'Google Search Console credentials are not configured.');
}

export async function syncGoogleSeoSnapshot() {
  const credentials = readCredentials();
  if (!credentials) {
    const snapshot = emptySnapshot('not_configured', 'Missing Google Search Console service account credentials.');
    await writeStoreObject(STORE_FILE, snapshot);
    return snapshot;
  }

  const siteUrl = getConfiguredSiteUrl();
  const range = defaultDateRange();
  const attemptedAt = new Date().toISOString();
  const previous = await readStoreObject<GoogleSeoSnapshot>(STORE_FILE);
  try {
    const token = await getAccessToken(credentials);
    const [analytics, maps, inspections] = await Promise.all([
      Promise.all([
        querySearchAnalytics(token, siteUrl, range, []),
        querySearchAnalytics(token, siteUrl, range, ['page']),
        querySearchAnalytics(token, siteUrl, range, ['query']),
        querySearchAnalytics(token, siteUrl, range, ['country']),
        querySearchAnalytics(token, siteUrl, range, ['device'])
      ]).then(([total, pages, queries, countries, devices]) => ({
        totals: totalsFromRows(total), pages: normalizeRows(pages), queries: normalizeRows(queries),
        countries: normalizeRows(countries), devices: normalizeRows(devices), range, syncedAt: attemptedAt, error: ''
      })).catch((error: unknown) => ({
        ...(previous || emptySnapshot('error')), error: `Search Analytics: ${errorMessage(error)}`
      })),
      querySitemaps(token, siteUrl).then((sitemaps) => ({sitemaps, syncedAt: attemptedAt, error: ''})).catch((error: unknown) => ({
        sitemaps: previous?.sitemaps || [], syncedAt: previous?.sitemapsSyncedAt || '', error: `Sitemaps: ${errorMessage(error)}`
      })),
      Promise.all(GOOGLE_INSPECTION_PATHS.map((path) => inspectUrl(token, siteUrl, new URL(path, publicSiteUrl).href)))
    ]);
    const error = [analytics.error, maps.error].filter(Boolean).join(' · ');
    const snapshot: GoogleSeoSnapshot = {
      status: error ? 'error' : 'ok',
      siteUrl, attemptedAt, syncedAt: analytics.syncedAt, sitemapsSyncedAt: maps.syncedAt,
      range: analytics.range, totals: analytics.totals, pages: analytics.pages, queries: analytics.queries,
      countries: analytics.countries, devices: analytics.devices, sitemaps: maps.sitemaps, inspections, error
    };
    await writeStoreObject(STORE_FILE, snapshot);
    return snapshot;
  } catch (error) {
    const snapshot: GoogleSeoSnapshot = {
      ...(previous || emptySnapshot('error')),
      status: 'error',
      siteUrl,
      attemptedAt,
      sitemaps: previous?.sitemaps || [],
      error: error instanceof Error ? error.message : 'Unknown Google Search Console sync error'
    };
    await writeStoreObject(STORE_FILE, snapshot);
    return snapshot;
  }
}
