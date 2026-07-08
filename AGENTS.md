# CHEERDMOTO 后台开发说明

## 项目定位

这是 CHEERDMOTO 新站的 Next.js 项目，包含前台 B2C 零售网站和中文管理后台。后台用于管理商品、分类、内容、订单、客户、线索、访问分析、SEO、支付状态、物流、库存、促销、表单、数据同步、用户权限和操作日志。

## 技术栈

- Next.js App Router + TypeScript
- Tailwind CSS 与全局 CSS
- Vercel 部署
- Vercel Blob 作为当前持久化存储
- Oceanpayment 支付适配
- SMTP 邮件通知
- Google Search Console 服务账号同步

## 开发原则

- 后台必须使用中文界面。
- 不使用 localStorage、sessionStorage、内存变量或无持久化 JSON 作为线上唯一数据源。
- 订单、支付、物流、退款、表单、SEO、审计等数据必须从服务端读取。
- 未接入的外部服务必须显示为“待配置/待接入”，不能伪造经营数据。
- 后台导航最多两层，入口清晰，避免深菜单。
- 关键操作需要逐步写入操作日志，尤其是登录、退款、导出、支付配置、权限修改和系统设置。

## 安全要求

- 生产环境必须配置 `ADMIN_JWT_SECRET`。
- 管理员密码优先使用 `ADMIN_PASSWORD_HASH`，不建议长期使用明文 `ADMIN_PASSWORD`。
- 登录接口需要限流，失败登录需要记录审计日志。
- 会话 Cookie 必须为 HttpOnly，生产环境启用 Secure。
- 支付回调必须校验签名并保持幂等。
- 不保存银行卡号、CVV 等敏感卡数据。

## 修改注意

- 修改后台页面时优先复用 `src/components/AdminShell.tsx`。
- 中文状态文案集中维护在 `src/lib/adminZh.ts`。
- 后台审计日志使用 `src/lib/adminAudit.ts`。
- 订单、支付、物流、退款和访问事件读取 `src/lib/commerceStore.ts`。
- 商品、分类、媒体和内容读取 `src/lib/backendStore.ts`。
