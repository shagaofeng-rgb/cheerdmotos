# Search indexing recovery runbook

## Baseline and rollback

- Baseline source revision: `db30b1d0e96720c1f18da9703989cc5c0e49755d`.
- Baseline production deployment: `dpl_8GD8h9m8uzQpWm3w67tGL5Uywn29`.
- No content records are deleted by this change. Pages that do not meet the
  automatic quality gate remain publicly reachable and can be explicitly
  re-approved from the CMS.
- Roll back code by redeploying the baseline Git revision in Vercel. Do not
  delete the durable-store files `google-seo-snapshot.json`,
  `google-seo-runs.jsonl`, or `google-seo-submission-state.json`.

## Production configuration

Set these variables only in Vercel Production. Values must never be committed.

| Variable | Required value or purpose |
| --- | --- |
| `GOOGLE_SEARCH_CONSOLE_SITE_URL` | `sc-domain:cheerdmotos.com` |
| `GOOGLE_SEARCH_CONSOLE_ENABLED` | `true` |
| `GOOGLE_SEARCH_CONSOLE_SERVICE_ACCOUNT_JSON` | Existing authorized service-account JSON, stored as one secret value |
| `CRON_SECRET` | Existing high-entropy cron authorization secret |
| `BLOB_READ_WRITE_TOKEN` or KV variables | Existing durable storage credentials for audit logs |

Grant the service account owner or full-user access to the same Domain property
in Search Console. A URL-prefix property such as `https://www.cheerdmotos.com/`
must not be substituted unless both the environment value and permissions are
changed together.

## Scheduled behavior

Vercel invokes `/api/cron/sync-google-seo` every day at 02:30 UTC. The route
refreshes sitemap data and Search Console metrics on each run, but submits the
three public sitemaps only after 72 hours have elapsed since the last successful
submission. Every attempt is stored without credentials in `google-seo-runs.jsonl`.

## Acceptance checks

1. The SEO admin page shows `sc-domain:cheerdmotos.com` as a domain property.
2. The newest run records three accepted sitemap submissions and a future due time.
3. `sitemap.xml`, `news-sitemap.xml`, and `image-sitemap.xml` are listed in the
   Search Console sitemap report without errors.
4. An indexable page returns 200, has a self canonical and appears in the sitemap.
5. A legacy imported page returns 200 with `noindex,follow` and is absent from
   all public sitemaps until an editor explicitly approves it.
