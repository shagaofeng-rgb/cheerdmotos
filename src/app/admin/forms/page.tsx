import AdminShell from '@/components/AdminShell';
import {readAnalyticsEvents, readEmailLogs} from '@/lib/commerceStore';
import {zhEventType} from '@/lib/adminZh';
import AdminPagination from '@/components/AdminPagination';
import {paginate, parseAdminPagination} from '@/lib/adminPagination';

export const dynamic = 'force-dynamic';

export default async function AdminFormsPage({searchParams}: {searchParams: Promise<Record<string, string | string[] | undefined>>}) {
  const [events, emailLogs, params] = await Promise.all([readAnalyticsEvents(), readEmailLogs(), searchParams]);
  const {page, perPage} = parseAdminPagination(params);
  const formEvents = events.filter((event) => ['form_submit', 'contact_inquiry', 'contact_click'].includes(event.type));
  const pagedEvents = paginate(formEvents.slice().reverse(), page, perPage);
  const inquiryEmails = emailLogs.filter((log) => log.templateType === 'contact_inquiry' || log.templateType === 'admin_order_notice');
  const sentEmails = inquiryEmails.filter((log) => log.status === 'sent');

  return (
    <AdminShell active="forms">
      <div className="admin-title">
        <p className="eyebrow">客户表单</p>
        <h1>客户表单</h1>
        <p>查看客户询盘、联系按钮、表单提交和邮件通知状态，确认表单是否稳定送达到管理员邮箱。</p>
      </div>

      <div className="admin-metrics">
        <article><span>表单/联系事件</span><strong>{formEvents.length}</strong><small>前台真实采集</small></article>
        <article><span>通知邮件</span><strong>{inquiryEmails.length}</strong><small>询盘与订单通知</small></article>
        <article><span>发送成功</span><strong>{sentEmails.length}</strong><small>SMTP 返回 sent</small></article>
        <article><span>发送失败</span><strong>{inquiryEmails.filter((log) => log.status === 'failed').length}</strong><small>需要检查 SMTP</small></article>
      </div>

      <section className="admin-panel">
        <div>
          <p className="eyebrow">表单记录</p>
          <h2>最近客户表单事件</h2>
        </div>
        <div className="admin-table-wrap">
          <table>
            <thead>
              <tr><th>时间</th><th>事件</th><th>页面</th><th>国家/地区</th><th>联系方式</th><th>附加信息</th></tr>
            </thead>
            <tbody>
              {pagedEvents.items.length ? pagedEvents.items.map((event) => (
                <tr key={event.id}>
                  <td>{event.timestamp.slice(0, 16).replace('T', ' ')}</td>
                  <td>{zhEventType(event.type)}</td>
                  <td>{event.page}</td>
                  <td>{event.country || '-'}</td>
                  <td>{String(event.payload?.email || event.payload?.phone || event.payload?.contact || '-')}</td>
                  <td>{String(event.payload?.message || event.payload?.productSlug || '-')}</td>
                </tr>
              )) : <tr><td colSpan={6}>暂无客户表单事件。</td></tr>}
            </tbody>
          </table>
        </div>
        <AdminPagination basePath="/admin/forms" params={params} page={pagedEvents.page} perPage={pagedEvents.perPage} total={pagedEvents.total} totalPages={pagedEvents.totalPages} />
      </section>
    </AdminShell>
  );
}
