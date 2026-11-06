import Link from 'next/link';
import AdminPagination from '@/components/AdminPagination';
import AdminShell from '@/components/AdminShell';
import AdminTimeFilter from '@/components/AdminTimeFilter';
import {paginate, parseAdminPagination} from '@/lib/adminPagination';
import {zhEventType} from '@/lib/adminZh';
import {parseAdminTimeFilter} from '@/lib/adminTimeFilter';
import {classifyTrafficQuality} from '@/lib/analyticsGovernance';
import {readAnalyticsEvents} from '@/lib/commerceStore';
import {readContactInquiries} from '@/lib/contactInquiries';
import {requireAdminPageSession} from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';
const deliveryLabels = {pending: '待发送', sent: 'SMTP 已接收', skipped: '待配置 SMTP', failed: '发送失败'};
const shanghaiTime = new Intl.DateTimeFormat('zh-CN', {dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Shanghai'});

export default async function AdminFormsPage({searchParams}: {searchParams: Promise<Record<string, string | string[] | undefined>>}) {
  await requireAdminPageSession('forms');
  const params = await searchParams;
  const timeFilter = parseAdminTimeFilter(params);
  const {page, perPage} = parseAdminPagination(params);
  const legacy = params.view === 'history';
  const [records, events] = await Promise.all([readContactInquiries(), legacy ? readAnalyticsEvents() : []]);
  const inRange = (value: string) => new Date(value) >= timeFilter.from && new Date(value) <= timeFilter.to;
  const inquiries = records.filter((record) => !record.test && inRange(record.createdAt)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const pagedInquiries = paginate(inquiries, page, perPage);
  const savedIds = new Set(records.map((record) => record.id));
  const formEvents = events.filter((event) => !savedIds.has(event.id) && inRange(event.timestamp) && classifyTrafficQuality(event).include &&
    ['form_submit', 'contact_inquiry', 'contact_click'].includes(event.type)).sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  const pagedEvents = paginate(formEvents, page, perPage);
  const sent = inquiries.filter((record) => record.delivery.status === 'sent').length;

  return (
    <AdminShell active="forms">
      <div className="admin-title">
        <h1>客户表单</h1>
        <p>查看完整询盘并追踪发往 info@cheerdmotos.com 的通知。系统测试与历史访问事件分开统计。</p>
        <AdminTimeFilter action="/admin/forms" range={timeFilter.range} start={timeFilter.start} end={timeFilter.end} label="表单产生时间" summary={timeFilter.summary} />
      </div>
      <div className="admin-metrics">
        <article><span>已保存询盘</span><strong>{inquiries.length}</strong><small>所选时间范围</small></article>
        <article><span>SMTP 已接收</span><strong>{sent}</strong><small>邮件服务器已接收</small></article>
        <article><span>待发送或待处理</span><strong>{inquiries.length - sent}</strong><small>可在记录中重试</small></article>
      </div>
      {params.retry === 'sent' && <p role="status">询盘通知已交给邮件服务器。</p>}
      {params.retry === 'failed' && <p role="alert">邮件未发出。询盘仍已保存，可检查邮件配置后重试。</p>}
      <section className="admin-panel">
        <div><h2>{legacy ? '历史访问事件' : '询盘记录'}</h2><Link href={legacy ? '/admin/forms' : '/admin/forms?view=history'}>{legacy ? '返回询盘记录' : '查看历史访问事件'}</Link></div>
        {legacy ? <>
          <div className="admin-table-wrap"><table><thead><tr><th>时间</th><th>事件</th><th>页面</th><th>国家/地区</th></tr></thead><tbody>
            {pagedEvents.items.map((event) => <tr key={event.id}><td>{shanghaiTime.format(new Date(event.timestamp))}</td><td>{zhEventType(event.type)}</td><td>{event.page}</td><td>{event.country || '—'}</td></tr>)}
            {!pagedEvents.items.length && <tr><td colSpan={4}>所选时间暂无历史访问事件。</td></tr>}
          </tbody></table></div>
          <AdminPagination basePath="/admin/forms" params={params} page={pagedEvents.page} perPage={pagedEvents.perPage} total={pagedEvents.total} totalPages={pagedEvents.totalPages} />
        </> : <>
          <div className="admin-content-list">
            {pagedInquiries.items.map(({id, details, createdAt, delivery}) => <details className="admin-content-item" key={id}>
              <summary><span><strong>{details.company || details.name} · {details.product}</strong><small>{shanghaiTime.format(new Date(createdAt))} · {details.buyerType}</small></span><span className="admin-status">{deliveryLabels[delivery.status]}</span></summary>
              <div className="admin-inquiry-details">
                <p><strong>询盘编号</strong> {id}</p><p><strong>联系人</strong> {details.name} · {details.email} · {details.phone}</p>
                <p><strong>国家/地区</strong> {details.country} · <strong>数量</strong> {details.quantity || '待确认'}</p>
                {details.targetMarket && <p><strong>目标市场</strong> {details.targetMarket}</p>}
                {details.destinationPort && <p><strong>目的地</strong> {details.destinationPort}</p>}
                {details.oem && <p><strong>定制要求</strong> {details.oem}</p>}
                <p style={{whiteSpace: 'pre-wrap'}}>{details.message}</p>
                <p>尝试 {delivery.attempts} 次{delivery.attemptedAt && ` · 最近 ${shanghaiTime.format(new Date(delivery.attemptedAt))}`}</p>
                {delivery.status !== 'sent' && <form action="/api/admin/forms/retry" method="post"><input type="hidden" name="id" value={id} /><button type="submit">重试通知</button></form>}
              </div>
            </details>)}
            {!pagedInquiries.items.length && <p>所选时间暂无已保存询盘。</p>}
          </div>
          <AdminPagination basePath="/admin/forms" params={params} page={pagedInquiries.page} perPage={pagedInquiries.perPage} total={pagedInquiries.total} totalPages={pagedInquiries.totalPages} />
        </>}
      </section>
    </AdminShell>
  );
}
