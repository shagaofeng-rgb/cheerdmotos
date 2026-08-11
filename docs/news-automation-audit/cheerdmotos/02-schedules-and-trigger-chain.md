# Schedules And Trigger Chain

| Task | Entry | Schedule UTC | Writes | Can publish News | Finding |
| --- | --- | --- | --- | --- | --- |
| Google SEO sync | `/api/cron/sync-google-seo` | `30 2 */3 * *` | Google SEO snapshot, sitemap run | No | Retain |
| Sitemap maintenance | `/api/cron/sitemap` | `45 2 * * *` | sitemap snapshot/log | No | Retain |
| Contact health check | `/api/cron/test-contact-form` | `0 2 1,15 * *` | email/event log | No | Retain |
| Blog plugin webhook | `/api/webhook/send_article` and root POST rewrite | Event-driven | Blog posts/audit log | Blog only | Retain and keep isolated |
| News publisher | none | none | none | No | Must be newly implemented after source and writer configuration |

`vercel.json` contains no six-hour News cron and no task that writes or publishes News. All listed schedules run in Vercel UTC.
