# News Blog Boundary Audit

| Boundary | Current state | Required correction |
| --- | --- | --- |
| Content type | Shared Blob object, filtered by `type` | Keep strict type filtering; add `site_id` and dedicated News entities |
| Frontend routes | Separate `/news` and `/blog` | Keep |
| Admin menus | Separate News and Blog pages | Keep |
| Webhook | Blog-only webhook writes `type: blog` | Keep; News worker must not call it |
| Sitemap | General post sitemap includes both; News sitemap only News | Preserve separate News sitemap and add Blog-only sitemap |
| RSS | Combined News + Blog RSS | Split into isolated feeds |
| Automation | No active News automation | Add dedicated News-only ingest/publish routes |
| Related content | Shared article component can infer product links | Ensure News never queries Blog candidates or cross-publishes |

No historical Blog content is scheduled for deletion or migration in this work.
