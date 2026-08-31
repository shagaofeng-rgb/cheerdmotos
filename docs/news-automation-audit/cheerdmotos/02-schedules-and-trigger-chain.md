# Schedules And Trigger Chain

| Task | Entry | Schedule UTC | Writes | Can publish News | Finding |
| --- | --- | --- | --- | --- | --- |
| Google SEO sync | `/api/cron/sync-google-seo` | `30 2 */3 * *` | Google SEO snapshot, sitemap run | No | Retain |
| Sitemap maintenance | `/api/cron/sitemap` | `45 2 * * *` | sitemap snapshot/log | No | Retain |
| Contact health check | `/api/cron/test-contact-form` | `0 2 1,15 * *` | email/event log | No | Retain |
| Blog plugin webhook | `/api/webhook/send_article` and root POST rewrite | Event-driven | Blog posts/audit log | Blog only | Retain and keep isolated |
| News publisher | `/api/cron/publish-news` | `0 16`, `0 20`, `0 0`, `0 4` daily | News posts, candidates, runs, publication and delivery records | Yes | Active; authenticated by `CRON_SECRET` |

`vercel.json` contains four News publication windows. Each run publishes at most one verified candidate and respects the configured daily target. All listed schedules run in Vercel UTC.
