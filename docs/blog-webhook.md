# Blog publication webhook

The Blog publishing integration accepts `POST` requests at:

`https://www.cheerdmotos.com/api/webhook/send_article`

For the custom development framework option, the plugin may instead send `POST` to `https://www.cheerdmotos.com`; the root request is internally forwarded to the endpoint above. Homepage `GET` requests are unaffected.

Configure `WEBHOOK_ARTICLE_SIGN` in the Vercel Production environment. The key is never exposed to the browser or committed to Git.

Required form fields: `sign`, `class_id`, `title`, `content`, `author_id`, and `image_url`. A signed request without a title and content receives `{\"code\":1,\"msg\":\"验证成功\"}` without writing an article. Complete, signed content is written once as a published Blog post; retries with the same content are deduplicated.
