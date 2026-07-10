import crypto from 'node:crypto';
import {readStoreObject, writeStoreObject} from '@/lib/durableStore';

const STORE_FILE = 'google-seo-snapshot.json';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const WEBMASTERS_READONLY_SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly';
const WEBMASTERS_WRITE_SCOPE = 'https://www.googleapis.com/auth/webmasters';

export type GoogleSeoMetricRow = {
  key: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
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
  error: string;
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
    'https://www.cheerdmotos.com/'
  ).trim();
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
  return {
    configured: Boolean(credentials && getConfiguredSiteUrl()),
    siteUrl: getConfiguredSiteUrl(),
    credentialSource: process.env.GOOGLE_SEARCH_CONSOLE_SERVICE_ACCOUNT_JSON || process.env.GSC_SERVICE_ACCOUNT_JSON
      ? 'service_account_json'
      : credentials
        ? 'client_email_private_key'
        : 'missing'
  };
}

export async function submitSitemapToGoogle(sitemapUrl: string) {
  const enabled = String(process.env.GOOGLE_SEARCH_CONSOLE_ENABLED || '').toLowerCase() === 'true';
  if (!enabled) {
    return {ok: true, submitted: false, message: 'Google Search Console sitemap submission is disabled.'};
  }

  const credentials = readCredentials();
  if (!credentials) {
    return {ok: false, submitted: false, message: 'Missing Google Search Console service account credentials.'};
  }

  const siteUrl = getConfiguredSiteUrl();
  const configuredSitemapUrl = (process.env.GOOGLE_SEARCH_CONSOLE_SITEMAP_URL || sitemapUrl).trim();
  if (!siteUrl || !configuredSitemapUrl) {
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
    const [totalRows, pageRows, queryRows, countryRows, deviceRows] = await Promise.all([
      querySearchAnalytics(token, siteUrl, range, []),
      querySearchAnalytics(token, siteUrl, range, ['page']),
      querySearchAnalytics(token, siteUrl, range, ['query']),
      querySearchAnalytics(token, siteUrl, range, ['country']),
      querySearchAnalytics(token, siteUrl, range, ['device'])
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
      error: error instanceof Error ? error.message : 'Unknown Google Search Console sync error'
    };
    await writeStoreObject(STORE_FILE, snapshot);
    return snapshot;
  }
}
