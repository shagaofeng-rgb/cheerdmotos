import {getAllBlogArticles} from '@/lib/blogFeed';
import {readAdminStore} from '@/lib/backendStore';
import {readStoreLines, readStoreObject, writeStoreObject, appendStoreLine} from '@/lib/durableStore';
import {getAllNewsArticles} from '@/lib/newsFeed';
import {siteData, siteUrl} from '@/lib/site';
import {submitSitemapToGoogle} from '@/lib/googleSeo';

export type SitemapKind = 'products' | 'posts' | 'categories' | 'pages';

export type SitemapEntry = {
  loc: string;
  lastmod: string;
};

export type SitemapRunLog = {
  id: string;
  trigger: string;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  files: string[];
  urlCount: number;
  successCount: number;
  skippedCount: number;
  errorCount: number;
  fileBytes: number;
  split: boolean;
  added: string[];
  removed: string[];
  changed: string[];
  googleSubmitted: boolean;
  googleResult: string;
  errors: string[];
};

type SitemapSnapshot = {
  generatedAt: string;
  entries: Record<string, string>;
};

const LOG_FILE = 'sitemap-runs.jsonl';
const SNAPSHOT_FILE = 'sitemap-snapshot.json';
const MAX_URLS_PER_FILE = 50000;
const SITEMAP_FILES: Record<SitemapKind, string> = {
  products: 'sitemap-products.xml',
  posts: 'sitemap-posts.xml',
  categories: 'sitemap-categories.xml',
  pages: 'sitemap-pages.xml'
};

function dateOnly(value: string | Date | undefined) {
  if (!value) return siteData.generatedAt?.slice(0, 10) || '2026-07-07';
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
  return date.toISOString().slice(0, 10);
}

function escapeXml(value: string) {
  return value.replace(/[<>&'"]/g, (char) => ({'<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;'}[char] || char));
}

function absolute(path: string) {
  if (path.startsWith('http://') || path.startsWith('https://')) return path.replace(/^http:\/\//, 'https://');
  return `${siteUrl}${path.startsWith('/') ? path : `/${path}`}`;
}

function dedupe(entries: SitemapEntry[]) {
  const seen = new Set<string>();
  return entries
    .filter((entry) => {
      if (!entry.loc.startsWith('https://')) return false;
      if (entry.loc.includes('?') || entry.loc.includes('#')) return false;
      if (seen.has(entry.loc)) return false;
      seen.add(entry.loc);
      return true;
    })
    .sort((a, b) => a.loc.localeCompare(b.loc));
}

function maxLastmod(entries: SitemapEntry[]) {
  return entries.reduce((max, entry) => entry.lastmod > max ? entry.lastmod : max, entries[0]?.lastmod || dateOnly(siteData.generatedAt));
}

export async function getSitemapGroups() {
  const [news, blogs] = await Promise.all([getAllNewsArticles(), getAllBlogArticles()]);
  const listPagesLastmod = maxLastmod([...news, ...blogs].map((article) => ({loc: article.slug, lastmod: dateOnly(article.updatedAt || article.date)})));
  const products = dedupe(siteData.products.map((item) => ({
    loc: absolute(item.route),
    lastmod: dateOnly(item.publishedAt || siteData.generatedAt)
  })));
  const categories = dedupe(siteData.collections.map((item) => ({
    loc: absolute(item.route),
    lastmod: dateOnly(item.publishedAt || siteData.generatedAt)
  })));
  const pages = dedupe([
    {
      loc: absolute('/'),
      lastmod: dateOnly(siteData.home?.publishedAt || siteData.generatedAt)
    },
    ...siteData.pages.map((item) => ({
      loc: absolute(item.route),
      lastmod: dateOnly(item.publishedAt || siteData.generatedAt)
    }))
  ]);
  const posts = dedupe([
    {loc: absolute('/news'), lastmod: listPagesLastmod},
    {loc: absolute('/blog'), lastmod: listPagesLastmod},
    ...news.map((article) => ({
      loc: absolute(`/news/${article.slug}`),
      lastmod: dateOnly(article.updatedAt || article.date)
    })),
    ...blogs.map((article) => ({
      loc: absolute(`/blog/${article.slug}`),
      lastmod: dateOnly(article.updatedAt || article.date)
    }))
  ]);

  return {products, posts, categories, pages} satisfies Record<SitemapKind, SitemapEntry[]>;
}

export async function getSitemapIndexEntries() {
  const groups = await getSitemapGroups();
  return (Object.keys(SITEMAP_FILES) as SitemapKind[]).map((kind) => ({
    loc: absolute(`/${SITEMAP_FILES[kind]}`),
    lastmod: maxLastmod(groups[kind])
  }));
}

export function sitemapXml(entries: SitemapEntry[]) {
  const body = entries.map((entry) => `  <url>\n    <loc>${escapeXml(entry.loc)}</loc>\n    <lastmod>${escapeXml(entry.lastmod)}</lastmod>\n  </url>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>`;
}

export function sitemapIndexXml(entries: SitemapEntry[]) {
  const body = entries.map((entry) => `  <sitemap>\n    <loc>${escapeXml(entry.loc)}</loc>\n    <lastmod>${escapeXml(entry.lastmod)}</lastmod>\n  </sitemap>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</sitemapindex>`;
}

function snapshotFrom(groups: Record<SitemapKind, SitemapEntry[]>): SitemapSnapshot {
  return {
    generatedAt: new Date().toISOString(),
    entries: Object.fromEntries(Object.values(groups).flat().map((entry) => [entry.loc, entry.lastmod]))
  };
}

function diffSnapshots(previous: SitemapSnapshot | null, next: SitemapSnapshot) {
  const before = previous?.entries || {};
  const after = next.entries;
  const added = Object.keys(after).filter((loc) => !(loc in before));
  const removed = Object.keys(before).filter((loc) => !(loc in after));
  const changed = Object.keys(after).filter((loc) => loc in before && before[loc] !== after[loc]);
  return {added, removed, changed};
}

export async function readSitemapLogs(limit = 50) {
  return (await readStoreLines<SitemapRunLog>(LOG_FILE)).slice(-limit).reverse();
}

export async function recordSitemapContentChange(input: {type: string; action: string; slug: string; title?: string}) {
  await appendStoreLine('sitemap-content-events.jsonl', {
    id: `sitemap-event-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    ...input
  });
}

export async function runSitemapMaintenance(options: {trigger: string; dryRun?: boolean; submit?: boolean; verbose?: boolean}) {
  const startedAt = new Date().toISOString();
  const started = Date.now();
  const errors: string[] = [];
  const groups = await getSitemapGroups();
  const indexEntries = await getSitemapIndexEntries();
  const snapshot = snapshotFrom(groups);
  const previous = await readStoreObject<SitemapSnapshot>(SNAPSHOT_FILE);
  const diff = diffSnapshots(previous, snapshot);
  const xmlFiles = [
    sitemapIndexXml(indexEntries),
    ...Object.values(groups).map((entries) => sitemapXml(entries))
  ];
  const urlCount = Object.values(groups).reduce((total, entries) => total + entries.length, 0);
  const fileBytes = xmlFiles.reduce((total, xml) => total + Buffer.byteLength(xml, 'utf8'), 0);
  let googleSubmitted = false;
  let googleResult = 'not_requested';

  if (options.submit && !options.dryRun) {
    const result = await submitSitemapToGoogle(absolute('/sitemap.xml'));
    googleSubmitted = result.submitted;
    googleResult = result.message;
    if (!result.ok) errors.push(result.message);
  }

  if (!options.dryRun) {
    await writeStoreObject(SNAPSHOT_FILE, snapshot);
  }

  const finishedAt = new Date().toISOString();
  const log: SitemapRunLog = {
    id: `sitemap-run-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    trigger: options.trigger,
    startedAt,
    finishedAt,
    durationMs: Date.now() - started,
    files: ['sitemap.xml', ...Object.values(SITEMAP_FILES)],
    urlCount,
    successCount: urlCount,
    skippedCount: 0,
    errorCount: errors.length,
    fileBytes,
    split: urlCount > MAX_URLS_PER_FILE,
    added: diff.added.slice(0, 100),
    removed: diff.removed.slice(0, 100),
    changed: diff.changed.slice(0, 100),
    googleSubmitted,
    googleResult,
    errors
  };
  if (!options.dryRun) {
    await appendStoreLine(LOG_FILE, log);
  }
  return log;
}

export function sitemapFileName(kind: SitemapKind) {
  return SITEMAP_FILES[kind];
}
