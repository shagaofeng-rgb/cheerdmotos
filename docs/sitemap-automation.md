# CHEERDMOTO Sitemap automation

Production domain: `https://www.cheerdmotos.com`

## Public URLs

- Sitemap index: `https://www.cheerdmotos.com/sitemap.xml`
- Product sitemap: `https://www.cheerdmotos.com/sitemap-products.xml`
- Post sitemap: `https://www.cheerdmotos.com/sitemap-posts.xml`
- Category sitemap: `https://www.cheerdmotos.com/sitemap-categories.xml`
- Page sitemap: `https://www.cheerdmotos.com/sitemap-pages.xml`
- Google News sitemap: `https://www.cheerdmotos.com/news-sitemap.xml`
- Image sitemap: `https://www.cheerdmotos.com/image-sitemap.xml`
- Robots: `https://www.cheerdmotos.com/robots.txt`

## How it works

The sitemap system reads public products, public categories, public pages, published News, and published Blog posts from the server-side data layer. It excludes admin, API, account, checkout, search result, draft, unpublished, archived, parameterized, and non-canonical URLs.

The sitemap index points to separate sitemap files:

- `sitemap-products.xml`
- `sitemap-posts.xml`
- `sitemap-categories.xml`
- `sitemap-pages.xml`

Each URL uses the production `www` domain and a stable `lastmod` from the content update or publication date. It does not rewrite all `lastmod` values to the current time on each run.

## Changed files

- `src/lib/sitemapManager.ts`
- `src/app/sitemap.xml/route.ts`
- `src/app/sitemap-products.xml/route.ts`
- `src/app/sitemap-posts.xml/route.ts`
- `src/app/sitemap-categories.xml/route.ts`
- `src/app/sitemap-pages.xml/route.ts`
- `src/app/api/cron/sitemap/route.ts`
- `src/app/robots.ts`
- `src/app/admin/sync/page.tsx`
- `scripts/sitemap-generate.mjs`
- `scripts/sitemap-test.mjs`
- `vercel.json`

## Manual commands

Run against production:

```bash
npm run sitemap:generate -- --dry-run --verbose
npm run sitemap:generate -- --force --verbose
npm run sitemap:generate -- --force --submit --verbose
npm run sitemap:test
```

For protected production cron execution, provide `CRON_SECRET` in the shell environment. The command calls the protected `/api/cron/sitemap` endpoint.

## Cron

Vercel runs the sitemap checker daily:

```json
{
  "path": "/api/cron/sitemap",
  "schedule": "45 2 * * *"
}
```

The route is protected by `CRON_SECRET`.

## Google Search Console API

Set these environment variables in Vercel:

```env
GOOGLE_SEARCH_CONSOLE_ENABLED=false
GOOGLE_SEARCH_CONSOLE_SITE_URL=sc-domain:cheerdmotos.com
GOOGLE_SEARCH_CONSOLE_SITEMAP_URL=https://www.cheerdmotos.com/sitemap.xml
GOOGLE_SEARCH_CONSOLE_SERVICE_ACCOUNT_JSON=
```

When enabled, the site uses the Google Search Console Sitemaps API. It does not use the deprecated Google sitemap ping endpoint and does not use Google Indexing API for normal website pages.

To grant access, create a Google Cloud service account, download its JSON credentials, store the JSON in Vercel as `GOOGLE_SEARCH_CONSOLE_SERVICE_ACCOUNT_JSON`, and add the service account email as a user on the matching Search Console property.

## Logs

Sitemap runs are stored in the durable store as `sitemap-runs.jsonl`. The admin dashboard shows recent runs at:

`/admin/sync`

The log records start time, finish time, duration, trigger, files, URL counts, size, split flag, changed URLs, Google submission status, and errors. It does not store secrets, private keys, or access tokens.

## Troubleshooting

- Sitemap 404: confirm the latest Vercel deployment is ready and that `/sitemap.xml` is routed by `src/app/sitemap.xml/route.ts`.
- XML format error: run `npm run sitemap:test` and inspect the returned XML.
- robots.txt missing sitemap: check `src/app/robots.ts`.
- Google API 403: confirm the service account has Search Console property permission and the property string matches `GOOGLE_SEARCH_CONSOLE_SITE_URL`.
- Submitted but not indexed: sitemap submission only helps Google discover URLs. Submission does not guarantee crawl, and crawl does not guarantee indexing. Final indexing status must be confirmed inside Google Search Console.
