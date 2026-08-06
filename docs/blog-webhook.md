# External Blog Publishing Webhook

The external publishing plugin sends `POST` requests to:

`https://www.cheerdmotos.com/api/webhook/send_article`

Use `application/x-www-form-urlencoded`. Required values are `sign`, `title`, and `content`. The accepted optional values are `class_id`, `author_id`, and `image_url`.

The endpoint returns `{"code":1,"msg":"发布成功"}` after a new Blog post has been stored and published. A valid retry of the identical article returns `code: 1` without creating a duplicate. Failed validation returns `{"code":0,"msg":"..."}`.

For plugin website verification, the endpoint also accepts `GET ?sign=API_KEY` or a `POST` that only includes the valid key. It returns `{"code":1,"msg":"验证成功"}` and never creates an article during verification.

Blog posts are published immediately to `/blog`, stored in the existing persistent backend, recorded in the audit log, and queued for the normal sitemap maintenance flow. This endpoint is not a scheduled Blog auto-publisher.
