# COWIN News automation

## Production flow

Vercel Cron calls `GET /api/cron/publish-news` in four daily UTC windows. The route requires the Vercel-provided `Authorization: Bearer $CRON_SECRET` header and runs on the Node.js runtime.

Each run performs the following steps:

1. Acquire the durable `news-publisher` lease so overlapping invocations cannot publish twice.
2. Fetch the configured RSS feeds, with the built-in trusted defaults `https://electrek.co/feed/` and `https://cleantechnica.com/feed/` when `NEWS_RSS_FEEDS` is empty.
3. Enforce source allowlisting, language, freshness, COWIN product-category relevance and source/title fingerprint deduplication.
4. Create at most one published `type: news` post per scheduled window, up to `NEWS_DAILY_TARGET` per site day.
5. Verify the new slug on `/news`, `/news/{slug}` and `/news-sitemap.xml`.
6. Keep the post published only when all delivery checks pass. A failed delivery is changed to `unpublished` and recorded.

Blog publication remains isolated in `/api/webhook/send_article` and cannot create News records.

## Durability and recovery

- `admin-store.json` writes use a provider-aware lock. KV uses `SET NX EX`; Vercel Blob uses a fixed private lock object with create-only writes; local development uses an exclusive lock file.
- The first real News publication creates a durable `admin-store` backup and manifest before changing content.
- Candidate, run, publication and delivery records are stored separately and displayed at `/admin/news-automation`.
- Marked delivery-test posts use the `news-automation-test-` slug prefix and `automationTest: true`. The cleanup action removes both marked posts and marked log records.

## Authorized checks

All requests below require the Cron bearer token in production.

- Dry run: `/api/cron/publish-news?dryRun=1`
- Marked end-to-end delivery test: `/api/cron/publish-news?deliveryTest=1`
- Remove marked test data: `/api/cron/publish-news?cleanupTest=1`

## Acceptance checks

Run `npm run test:news`, `npm run typecheck` and `npm run build`. After production deployment, confirm an unauthorized request returns `401`, the Vercel deployment is `READY`, and the next authorized Cron run records a successful delivery in the Chinese admin monitor.
