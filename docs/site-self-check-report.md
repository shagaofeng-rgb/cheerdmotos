# CHEERDMOTO site self-check report

Date: 2026-07-08

## Scope

This report records the implementation and checks completed from the News Automation System Development brief and the site self-check brief.

## Completed

- Added public News pages: `/news` and `/news/[slug]`.
- Added public Blog pages: `/blog` and `/blog/[slug]`.
- Added site search page: `/search`.
- Added XML sitemap, robots.txt, RSS feed, News sitemap, and image sitemap.
- Added NewsArticle and BlogPosting structured data on article detail pages.
- Added Product structured data on product pages.
- Added source attribution, source URL, source publish date, GEO summary, and product-fit blocks to automated News/Blog content.
- Added product-to-News and product-to-Blog internal links on product detail pages.
- Added durable News automation job and publication audit logging.
- Added Chinese admin entry: `News 自动化`.
- Added admin News automation status page at `/admin/news-automation`.
- Updated News cron schedule to support four daily publishing windows.
- Added News automation environment variable documentation in `.env.example`.
- Removed stale old-site wording from the not-found page.
- Fixed mobile homepage overflow, homepage/category image alt text, and `/favicon.ico`.

## Local verification

- `npm run build`: passed.
- Local URL check passed:
  - `/`
  - `/news`
  - `/blog`
  - `/search?q=xceed`
  - `/products/xceed-electric-dirt-bike`
  - `/sitemap.xml`
  - `/robots.txt`
  - `/rss.xml`
  - `/news-sitemap.xml`
  - `/image-sitemap.xml`
  - `/api/analytics/health`
- `/admin/news-automation` redirects to admin login when unauthenticated.
- Mobile visual check at 390px passed for:
  - `/`
  - `/news`
  - `/blog`
  - `/search?q=xceed`
  - `/products/xceed-electric-dirt-bike`
  - `/news/electric-dirt-bike-buyer-workflow`
  - `/blog/guide-fat-tire-ebike-city-trail-selection`
- Mobile checks found no horizontal overflow, no missing image alt text, and no console errors on the tested pages.

## Environment variables to keep configured on Vercel

- `ADMIN_EMAIL`
- `ADMIN_PASSWORD_HASH`
- `ADMIN_JWT_SECRET`
- `AUTH_SECRET`
- `BLOB_READ_WRITE_TOKEN`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASSWORD`
- `SMTP_FROM`
- `ADMIN_NOTIFICATION_EMAIL`
- `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- `GOOGLE_SERVICE_ACCOUNT_JSON`
- `GSC_SITE_URL`
- `NEWS_DAILY_TARGET`
- `NEWS_TIMEZONE`
- `NEWS_MAX_RETRIES`
- `NEWS_LOOKBACK_HOURS`
- `NEWS_DEDUP_DAYS`
- `NEWS_RELEVANCE_THRESHOLD`
- `NEWS_AUTO_PUBLISH`
- `NEWS_ALLOWED_LANGUAGES`
- `NEWS_RSS_FEEDS`
- `NEWS_ALERT_EMAIL`

## Notes

- The News automation supports RSS sources through `NEWS_RSS_FEEDS`. If RSS/API sources are not configured, it falls back to source-backed CHEERDMOTO catalog and collection materials so the cron remains idempotent and auditable.
- Automated News does not copy full source articles. It stores source attribution separately from CHEERDMOTO perspective and product-fit content.
- External payment, logistics, refund, and third-party analytics modules continue to show real configured state or pending status instead of fabricated business data.
