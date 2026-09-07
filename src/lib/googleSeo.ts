import crypto from 'node:crypto';
import {appendStoreLine, readStoreLines, readStoreObject, writeStoreObject} from '@/lib/durableStore';

const STORE_FILE = 'google-seo-snapshot.json';
const RUN_LOG_FILE = 'google-seo-runs.jsonl';
const SUBMISSION_STATE_FILE = 'google-seo-submission-state.json';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const WEBMASTERS_READONLY_SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly';
const WEBMASTERS_WRITE_SCOPE = 'https://www.googleapis.com/auth/webmasters';
const DEFAULT_SITE_PROPERTY = 'sc-domain:cheerdmotos.com';

export const GOOGLE_SITEMAP_PATHS = ['/sitemap.xml', '/news-sitemap.xml', '/image-sitemap.xml'] as const;

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
  indexed: number;
};

export type GoogleSeoSnapshot = {
  status: 'ok' | 'not_configured' | 'error';
  siteUrl: string;
  syncedAt: string;
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
    syncedAt: new Date().toISOString(),
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
    cache: 'no-store'
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
    cache: 'no-store'
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
    cache: 'no-store'
  });
  const payload = await response.json().catch(() => ({})) as {
    sitemap?: Array<{
      path?: string;
      lastSubmitted?: string;
      lastDownloaded?: string;
      isPending?: boolean;
      warnings?: string;
      errors?: string;
      contents?: Array<{submitted?: string; indexed?: string}>;
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
    submitted: (item.contents || []).reduce((total, content) => total + Number(content.submitted || 0), 0),
    indexed: (item.contents || []).reduce((total, content) => total + Number(content.indexed || 0), 0)
  }));
}

function nextDueAt(lastSuccessfulAt: string, intervalHours = 72) {
  const last = new Date(lastSuccessfulAt).getTime();
  if (!last || Number.isNaN(last)) return new Date().toISOString();
  return new Date(last + intervalHours * 60 * 60 * 1000).toISOString();
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

async function submissionIsDue(intervalHours = 72) {
  const state = await submissionState();
  const dueAt = nextDueAt(state.lastSuccessfulAt, intervalHours);
  return {state, due: Date.now() >= new Date(dueAt).getTime(), dueAt};
}

export async function submitSitemapToGoogle(sitemapUrl: string) {
  const enabled = String(process.env.GOOGLE_SEARCH_CONSOLE_ENABLED || 'true').toLowerCase() !== 'false';
  if (!enabled) {
    return {ok: true, submitted: false, message: 'Google Search Console sitemap submission is disabled.'};
  }

  const credentials = readCredentials();
  if (!credentials) {
    return {ok: false, submitted: false, message: 'Missing Google Search Console service account credentials.'};
  }

  const siteUrl = getConfiguredSiteUrl();
  const configuredSitemapUrl = sitemapUrl.trim();
  if (!isValidSearchConsoleProperty(siteUrl) || !configuredSitemapUrl) {
    return {ok: false, submitted: false, message: 'Missing Google Search Console site URL or sitemap URL.'};
  }

  try {
    const sitemapResponse = await fetch(configuredSitemapUrl, {cache: 'no-store', signal: AbortSignal.timeout(12000)});
    if (!sitemapResponse.ok) {
      return {ok: false, submitted: false, message: `Sitemap URL is not reachable: ${sitemapResponse.status}`};
    }

    const token = await getAccessToken(credentials, WEBMASTERS_WRITE_SCOPE);
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
    return {ok: false, submitted: false, message: error instanceof Error ? error.message : 'Unknown Google sitemap submit error'};
  }
}

export async function submitSitemapsToGoogle(sitemapUrls: readonly string[]) {
  const results: Array<{sitemapUrl: string; ok: boolean; submitted: boolean; message: string}> = [];
  for (const sitemapUrl of [...new Set(sitemapUrls)]) {
    const result = await submitSitemapToGoogle(sitemapUrl);
    results.push({sitemapUrl, ...result});
  }
  return results;
}

export async function runGoogleSeoMaintenance(options: {trigger: string; sitemapUrls: readonly string[]; force?: boolean; intervalHours?: number}) {
  const startedAt = new Date().toISOString();
  const intervalHours = options.intervalHours || 72;
  const {due: automaticallyDue, dueAt} = await submissionIsDue(intervalHours);
  const due = Boolean(options.force || automaticallyDue);
  let snapshot = await syncGoogleSeoSnapshot();
  let results: GoogleSeoRun['results'] = [];
  let submitted = false;
  let error = '';

  if (due && snapshot.status === 'ok') {
    results = await submitSitemapsToGoogle(options.sitemapUrls);
    submitted = results.length > 0 && results.every((result) => result.ok && result.submitted);
    if (submitted) {
      await writeStoreObject(SUBMISSION_STATE_FILE, {
        lastSuccessfulAt: new Date().toISOString(),
        sitemapUrls: results.map((result) => result.sitemapUrl)
      } satisfies GoogleSeoSubmissionState);
      snapshot = await syncGoogleSeoSnapshot();
    } else {
      error = results.map((result) => `${result.sitemapUrl}: ${result.message}`).join('; ');
    }
  } else if (snapshot.status !== 'ok') {
    error = snapshot.error || 'Google Search Console is not configured or could not be queried.';
  }

  const state = await submissionState();
  const run: GoogleSeoRun = {
    id: `google-seo-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    trigger: options.trigger,
    startedAt,
    finishedAt: new Date().toISOString(),
    siteUrl: getConfiguredSiteUrl(),
    due,
    nextDueAt: nextDueAt(state.lastSuccessfulAt, intervalHours),
    snapshotStatus: snapshot.status,
    submitted,
    results,
    error
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
  try {
    const token = await getAccessToken(credentials);
    const [totalRows, pageRows, queryRows, countryRows, deviceRows, sitemaps] = await Promise.all([
      querySearchAnalytics(token, siteUrl, range, []),
      querySearchAnalytics(token, siteUrl, range, ['page']),
      querySearchAnalytics(token, siteUrl, range, ['query']),
      querySearchAnalytics(token, siteUrl, range, ['country']),
      querySearchAnalytics(token, siteUrl, range, ['device']),
      querySitemaps(token, siteUrl)
    ]);
    const snapshot: GoogleSeoSnapshot = {
      status: 'ok',
      siteUrl,
      syncedAt: new Date().toISOString(),
      range,
      totals: totalsFromRows(totalRows),
      pages: normalizeRows(pageRows),
      queries: normalizeRows(queryRows),
      countries: normalizeRows(countryRows),
      devices: normalizeRows(deviceRows),
      sitemaps,
      error: ''
    };
    await writeStoreObject(STORE_FILE, snapshot);
    return snapshot;
  } catch (error) {
    const previous = await readStoreObject<GoogleSeoSnapshot>(STORE_FILE);
    const snapshot: GoogleSeoSnapshot = {
      ...(previous || emptySnapshot('error')),
      status: 'error',
      siteUrl,
      syncedAt: new Date().toISOString(),
      range,
      sitemaps: previous?.sitemaps || [],
      error: error instanceof Error ? error.message : 'Unknown Google Search Console sync error'
    };
    await writeStoreObject(STORE_FILE, snapshot);
    return snapshot;
  }
}
