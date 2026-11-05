# COWIN News automation

## Current production status

The automated News crawl, generation, summary and publication workflow is disabled in production. There is no Vercel Cron entry for `/api/cron/publish-news`, and `NEWS_AUTOMATION_ENABLED=false` prevents an authorized request from running the worker.

Blog publication remains isolated in `/api/webhook/send_article` and is not affected by this setting.

## Historical flow

Each run performs the following steps:

1. Acquire the durable `news-publisher` lease so overlapping invocations cannot publish twice.
2. Fetch configured RSS feeds plus the trusted baseline feeds `https://electrek.co/feed/`, `https://cleantechnica.com/feed/` and `https://electricbikereport.com/feed/`.
3. Enforce source allowlisting, language, freshness, COWIN product-category relevance and source/title fingerprint deduplication.
4. Create up to `NEWS_CRON_TARGET` verified `type: news` posts in the daily run, while respecting `NEWS_DAILY_TARGET`.
5. If current feeds have no qualified candidate, review the recent qualified-candidate queue before reporting `waiting_for_qualified_source`; this is a healthy non-publication state, not an operational failure.
6. Verify the new slug on `/news`, `/news/{slug}` and `/news-sitemap.xml`.
7. Keep the post published only when all delivery checks pass. A failed delivery is changed to `unpublished` and recorded.

Blog publication cannot create News records.

## Durability and recovery

- `admin-store.json` writes use a provider-aware lock. KV uses `SET NX EX`; Vercel Blob uses a fixed private lock object with create-only writes; local development uses an exclusive lock file.
- The first real News publication creates a durable `admin-store` backup and manifest before changing content.
- Candidate, run, publication and delivery records are stored separately and displayed at `/admin/news-automation`.
- The monitor records top candidate rejection reasons. Alert mail is reserved for operational failures and deduplicated to one notification per failure type per 24 hours; a verified publication sends one recovery notice.
- Marked delivery-test posts use the `news-automation-test-` slug prefix and `automationTest: true`. The cleanup action removes both marked posts and marked log records.

## Authorized checks

All requests below require the Cron bearer token in production and are unavailable while News automation is disabled.

- Dry run: `/api/cron/publish-news?dryRun=1`
- Marked end-to-end delivery test: `/api/cron/publish-news?deliveryTest=1`
- Remove marked test data: `/api/cron/publish-news?cleanupTest=1`

## Acceptance checks

Run `npm run test:news`, `npm run typecheck` and `npm run build`. After production deployment, confirm an unauthorized request returns `401`, an authorized request reports `status: disabled`, and the Vercel deployment is `READY`.
