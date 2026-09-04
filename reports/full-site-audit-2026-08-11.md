# COWIN 全站核查与修复记录

日期：2026-08-11（Asia/Shanghai）  
生产站点：`https://www.cheerdmotos.com`  
范围：持久化数据、后台与前端数据链路、Blog Webhook 发布、Google SEO 计划任务、公开页面、构建和运行日志。

## 变更前备份与回滚

- Blob 数据镜像：`backups/full-audit-20260811-090000/blob/`
- Webhook 测试后的 Blob 数据镜像：`backups/full-audit-20260811-090000/blob-after-webhook/`
- 源码归档：`backups/full-audit-20260811-090000/source-preaudit-959a6f9.zip`
- 本轮代码提交：`1fb7e0a`、`04e762a`。

回滚代码时，优先对上述提交执行 `git revert`，而不是重写历史。若需要恢复持久化内容，应从同目录 Blob 镜像中按对象恢复；不得覆盖未知的新数据。测试文章仅被改为草稿，未删除任何正式 Blog 或 News 内容。

## 已确认正常

### 生产持久化与数据

生产环境已配置 Vercel Blob，存储前缀为 `cheerdmoto-commerce`。读取到的真实数据快照如下：

| 项目 | 结果 |
| --- | --- |
| 商品 | 12 条，抽查 3 条均为 published，ID 与 slug 无重复 |
| 分类 | 4 条 |
| 媒体 | 12 条 |
| 全部内容 | 106 条 |
| Blog | 33 条 published（测试文章已改草稿，不在此前计数） |
| News | 73 条 published |
| 订单 | 0 条 |
| 表单事件 | 2 条 |
| 邮件日志 | 2 条，状态 sent |

抽查的三个商品为 `xceed-electric-dirt-bike`、`cheerdmoto-performance-96v-electric-dirtbike-xtreme`、`cheerdmoto-electric-wheelchair-smart-b02`；其持久化记录的 ID/slug 完整，无重复。抽查的三篇 Blog 均为已发布的真实存储记录。审计未发现商品或内容 ID/slug 重复、无效内容状态或缺失必填发布时间。

运行中的持久化实现是 Vercel Blob，而不是关系型数据库，因此不存在可核验的数据库表、索引、SQL 慢查询或迁移记录；生产运行状态由 `/api/health` 报告 Blob 已配置且可读。

### Blog Webhook 真实链路

- Blog 已存在：列表 `/blog`、详情 `/blog/[slug]`、后台内容入口、`admin-store.json` 内容模型和 sitemap 输出均已存在。
- 接收接口：`POST /api/webhook/send_article`；兼容插件根域验证的 `POST /` 由 `src/proxy.ts` 内部转发。
- 接收字段：`sign`、`class_id`、`title`、`content`、`author_id`、`image_url`，支持 `application/x-www-form-urlencoded`。
- 密钥只从服务端环境变量或私有持久化凭据读取，未写入前端、Git 或本报告。
- 根域验证实测返回 HTTP 200 与 `{"code":1,"msg":"验证成功"}`，且没有写入文章。
- 用真实发布请求完成一次标记为 `INTEGRATION TEST - Blog Plugin 20260811` 的端到端写入，接口返回 `{"code":1,"msg":"发布成功","slug":"integration-test-blog-plugin-20260811"}`。随后确认其存在于持久化内容、后台审计记录和公开详情页；重试返回 `文章已存在`，未生成第二条持久化记录。
- 测试结束后将该指定测试文章改为 draft。延迟后复核其详情返回 404、Blog 列表不再出现、`sitemap-posts.xml` 不再包含该 slug。

### Google SEO 与定时任务

生产 `vercel.json` 当前任务：

| 任务 | 路径 | 生产计划（UTC） | 状态 |
| --- | --- | --- | --- |
| Google SEO 同步 | `/api/cron/sync-google-seo` | `30 2 */3 * *` | 每 3 天 |
| Sitemap 维护 | `/api/cron/sitemap` | `45 2 * * *` | 每天 |
| 表单健康检查 | `/api/cron/test-contact-form` | `0 2 1,15 * *` | 每月 1 日、15 日 |

这是唯一的 Google 主动同步计划；未发现遗留的每日 Google 提交计划。生产持久化的 Google 快照显示最近一次成功同步为 `2026-08-10T02:30:39.020Z`，状态 `ok`，站点属性为 `sc-domain:cheerdmotos.com`，含 1 个 sitemap、38 行页面数据和 30 行查询数据。历史 sitemap 任务记录显示一次人工强制执行成功，44 个 URL、0 错误，Google sitemap 提交被接受。

News 自动发布仍为停用状态：`/api/cron/publish-news` 实测 404；没有恢复其自动生成或自动发布程序。Blog Webhook 是外部插件请求触发，不是本站定时自动生成任务。

### 公开页面与运行日志

2026-08-11 公网复测：

| 地址 | HTTP 结果 |
| --- | --- |
| `/` | 200（此前同轮测得） |
| `/products` | 200（此前同轮测得） |
| `/blog` | 200 |
| `/news` | 200（此前同轮测得） |
| `/support` | 200 |
| `/contact` | 308 到 `/support` |
| `/robots.txt` | 200 |
| `/sitemap.xml` | 200 |

Vercel 生产运行日志近一小时内未发现 Blog、News、Webhook 路由的 error/warning 记录。公开页面此前抽测的响应时间为 0.391s 到 0.828s（curl 总请求时间，非 Lighthouse 指标）。

## 已发现并修复

1. **News 前台混用静态回退内容**
   - 根因：`src/lib/newsFeed.ts` 将真实已发布 News 与本地静态 `newsArticles` 合并。
   - 修复：只读取 `listAdminPosts('news')` 中已发布的真实持久化内容。
   - 影响：生产已有 73 条真实 News，未删除内容。

2. **Webhook 持久化失败时会被未捕获异常中断**
   - 根因：`src/app/api/webhook/send_article/route.ts` 未对持久化写入包裹失败响应和审计。
   - 修复：写入失败时记录后台审计并返回 HTTP 500、`code: 0` 的透明失败响应；正常验证与成功发布不受影响。

3. **文章相关推荐带出不存在的付款 SKU 链接**
   - 根因：`src/components/ArticleViews.tsx` 以对象 truthy 判断，把非公开 SKU 视为可链接产品。
   - 修复：改为仅允许公开产品规格表中存在的 slug。`npm run seo:index-audit` 初始发现的 `/products/one-time-35` 404 已排除。

4. **旧 `/contact` 链接 404**
   - 根因：实际支持页为 `/support`，但残留路径仍可能被搜索或外部访问。
   - 修复：`next.config.mjs` 增加永久 308 重定向 `/contact -> /support`；生产复测已生效。

## 验证记录

- `npm ls --omit=dev`：依赖树可解析；发现 `@emnapi/runtime@1.11.2` 为 extraneous，未在本次删除，避免擅自变更锁文件。
- `npm run sitemap:test`：通过，覆盖 8 个 sitemap/robots 入口。
- `npm run seo:index-audit`：修复前发现 1 个内部 404；对应代码已修复，最终构建通过。
- `npm run build`：在 `1fb7e0a` 和 `04e762a` 后均通过，Next.js 已识别 Blog、Webhook 和计划任务路由。
- Vercel 部署：`dpl_7xHRovNWvxX4J9hoMQ4qYAHpRFLj`，提交 `04e762a`，production 状态 `READY`。

## 已发现但暂未自动修复

1. **商品主数据存在双源**：公开商品详情/目录仍以 `src/data/site-data.json` 为主，后台商品使用 Blob `admin-store.json`。本轮抽查内容一致，但后台新增/编辑商品尚不能完全驱动全部公开商品页。应单独做有数据迁移、预览和回滚的主数据统一工程。
2. **后台 Blog 管理未达到完整编辑工作流**：现有 `src/app/api/admin/posts/route.ts` 提供读取和创建；完整编辑、删除、预览、撤回、定时发布等管理能力未在本轮安全补建。
3. **Blog 列表的筛选、搜索、分页及标签体系不完整**：当前可展示分类和详情，不应宣称已经具备完整内容运营能力。
4. **Webhook 并发幂等窗口**：串行重试已返回“文章已存在”，本次没有产生重复记录；但 Blob 没有事务锁，极端并发同一请求仍应迁移到 KV/数据库的唯一声明机制以获得严格 exactly-once 保证。
5. **收件插件端到端界面未可访问**：已用完全相同协议真实写入验证，但当前环境没有第三方插件账号/界面权限，无法证明插件厂商界面中的最近一次任务或其外部重试策略。
6. **受保护 Cron 手工触发**：本地持有的 `CRON_SECRET` 与生产当前密钥不匹配，手工生产请求返回 401。未绕过鉴权；生产持久化快照已证明计划任务在 2026-08-10 成功运行。
7. **视觉与多浏览器测试限制**：本轮环境没有可用的浏览器自动化会话，未标记移动端视觉/浏览器控制台为“已确认正常”。

## 本轮修改文件

- `src/lib/newsFeed.ts`
- `src/app/api/webhook/send_article/route.ts`
- `src/components/ArticleViews.tsx`
- `next.config.mjs`
- `reports/full-site-audit-2026-08-11.md`

没有修改数据库结构，也没有删除正式内容、产品、客户信息或 SEO 数据。
