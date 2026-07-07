# CHEERDMOTO Backend Admin Guide

## Current Delivery

The site now has a real Next.js backend foundation:

- Admin entry: `/admin`
- Admin login: `/admin/login`
- Product, category, media, blog, news, order, customer, lead, analytics, funnel and settings pages
- Admin-only API routes under `/api/admin/*`
- Checkout order capture under `/api/checkout/create-order`
- Behavior event tracking under `/api/analytics/track`
- Qianhai payment placeholder routes under `/api/payments/qianhai/*`
- KV / Upstash Redis-backed commerce storage when `KV_REST_API_URL` + `KV_REST_API_TOKEN` or `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` are configured
- File-backed data store for local preview only: `.data/admin-store.json`
- Database migration blueprint: `docs/backend-schema.sql`

## Admin Login

Set these environment variables in local `.env.local` and Vercel:

```bash
ADMIN_EMAIL=support@cheerdmotos.com
ADMIN_PASSWORD_HASH=pbkdf2_sha256$...
ADMIN_JWT_SECRET=replace-with-long-random-secret
```

Local development still allows `cheerdmoto-admin-demo` only when no production password is configured.

## How to Create the Password Hash

Use the project helper in Node:

```bash
node -e "const crypto=require('crypto');const p='your-password';const s=crypto.randomBytes(16).toString('base64url');const i=210000;const h=crypto.pbkdf2Sync(p,s,i,32,'sha256').toString('base64url');console.log(`pbkdf2_sha256$${i}$${s}$${h}`)"
```

Put the printed value into `ADMIN_PASSWORD_HASH`.

## Backend Pages

- `/admin`: dashboard overview
- `/admin/products`: product CMS
- `/admin/categories`: product categories
- `/admin/media`: media library registration and ALT management foundation
- `/admin/blog`: blog CMS
- `/admin/news`: news CMS
- `/admin/orders`: checkout orders
- `/admin/customers`: customer CRM
- `/admin/leads`: abandoned checkout and lead list
- `/admin/analytics`: visitor behavior events
- `/admin/funnel`: conversion funnel
- `/admin/settings`: company, email, payment and privacy readiness settings

## Data Sync Status

Already connected:

- Checkout submissions create order records.
- Analytics tracker records page views, product views, checkout starts and CTA clicks.
- Admin dashboard reads orders, events, products, content and settings from backend data.
- Admin product/category/media/blog/news/settings forms write to the backend store.

Important production storage note:

- Live orders, payment callbacks, member accounts and reset tokens require KV / Upstash Redis REST credentials in Vercel.
- Without those variables, Vercel production falls back to temporary function storage, so orders may disappear or not show consistently in the admin.
- Use one variable pair: `KV_REST_API_URL` + `KV_REST_API_TOKEN`, or `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`.

Still static and planned for the next phase:

- Storefront product pages still render from `src/lib/site.ts`.
- Storefront blog/news pages still render from `src/lib/news.ts`.
- Real image upload is registered as a media-library port but not yet connected to cloud storage.
- Password reset email is documented but not fully wired.
- Postgres persistence is represented by `docs/backend-schema.sql`; current implementation uses file-backed storage for immediate preview.

## Payment Configuration

Qianhai credit card port is reserved:

- Create payment: `/api/payments/qianhai/create`
- Notify webhook: `/api/payments/qianhai/notify`

Required env:

```bash
QIANHAI_MERCHANT_ID=
QIANHAI_GATEWAY_URL=
QIANHAI_SECRET_KEY=
QIANHAI_NOTIFY_URL=https://cheerdmotos.com/api/payments/qianhai/notify
```

Do not store full card numbers or CVV in this app. Card data should be tokenized or hosted by the payment gateway.

## Email Configuration

```bash
SMTP_HOST=smtp.exmail.qq.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=support@cheerdmotos.com
SMTP_PASS=
SMTP_FROM=support@cheerdmotos.com
ADMIN_NOTIFICATION_EMAIL=support@cheerdmotos.com
```

## Privacy Notes

- Anonymous behavior events use visitor/session IDs.
- Contact details are captured only when the buyer submits checkout or inquiry information.
- IP is not stored in plaintext by the current analytics endpoint.
- Payment card data should remain with the payment provider.
