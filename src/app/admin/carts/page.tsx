import AdminPagination from '@/components/AdminPagination';
import AdminShell from '@/components/AdminShell';
import AdminTimeFilter from '@/components/AdminTimeFilter';
import {paginate, parseAdminPagination} from '@/lib/adminPagination';
import {parseAdminTimeFilter} from '@/lib/adminTimeFilter';
import {classifyTrafficQuality} from '@/lib/analyticsGovernance';
import {readAnalyticsEvents, readStoreOrders} from '@/lib/commerceStore';
import {zhEventType} from '@/lib/adminZh';

export const dynamic = 'force-dynamic';

export default async function AdminCartsPage({searchParams}: {searchParams: Promise<Record<string, string | string[] | undefined>>;}) {
  const params = await searchParams;
  const timeFilter = parseAdminTimeFilter(params);
  const {page, perPage} = parseAdminPagination(params);
  const [events, orders] = await Promise.all([readAnalyticsEvents(), readStoreOrders()]);
  const inRange = (value: string) => { const time = new Date(value).getTime(); return time >= timeFilter.from.getTime() && time <= timeFilter.to.getTime(); };
  const realEvents = events.filter((event) => inRange(event.timestamp) && classifyTrafficQuality(event).include);
  const checkoutEvents = realEvents.filter((event) => ['checkout_start', 'checkout_submit', 'begin_checkout'].includes(event.type)).sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  const orderSessions = new Set(orders.filter((order) => inRange(order.createdAt)).map((order) => order.attribution?.sessionId).filter(Boolean));
  const abandonedSessions = new Set(checkoutEvents.filter((event) => !orderSessions.has(event.sessionId)).map((event) => event.sessionId));
  const productClicks = realEvents.filter((event) => event.type === 'commerce_click' || event.type === 'product_view');
  const pagedEvents = paginate(checkoutEvents, page, perPage);

  return (
    <AdminShell active="carts">
      <div className="admin-title">
        <p className="eyebrow">购物车与弃购</p>
        <h1>购物车与弃购</h1>
        <p>用前台结账事件和订单会话估算弃购情况，帮助判断哪些客户进入结账但没有完成支付。</p>
        <AdminTimeFilter action="/admin/carts" range={timeFilter.range} start={timeFilter.start} end={timeFilter.end} label="购物车行为时间" summary={timeFilter.summary} />
      </div>

      <div className="admin-metrics">
        <article><span>结账事件</span><strong>{checkoutEvents.length}</strong><small>进入或提交结账</small></article>
        <article><span>疑似弃购会话</span><strong>{abandonedSessions.size}</strong><small>有结账行为但无订单匹配</small></article>
        <article><span>商品行为</span><strong>{productClicks.length}</strong><small>详情访问和购买按钮点击</small></article>
        <article><span>订单会话</span><strong>{orderSessions.size}</strong><small>成功创建订单的会话</small></article>
      </div>

      <section className="admin-panel">
        <div>
          <p className="eyebrow">最近结账行为</p>
          <h2>购物车与结账事件</h2>
        </div>
        <div className="admin-table-wrap">
          <table>
            <thead>
              <tr><th>时间</th><th>事件</th><th>页面</th><th>访客</th><th>会话</th><th>国家/地区</th></tr>
            </thead>
            <tbody>
              {pagedEvents.items.length ? pagedEvents.items.map((event) => (
                <tr key={event.id}>
                  <td>{event.timestamp.slice(0, 16).replace('T', ' ')}</td>
                  <td>{zhEventType(event.type)}</td>
                  <td>{event.page}</td>
                  <td>{event.visitorId}</td>
                  <td>{event.sessionId}</td>
                  <td>{event.country || '-'}</td>
                </tr>
              )) : <tr><td colSpan={6}>所选时间暂无真实结账事件。</td></tr>}
            </tbody>
          </table>
        </div>
        <AdminPagination basePath="/admin/carts" params={params} page={pagedEvents.page} perPage={pagedEvents.perPage} total={pagedEvents.total} totalPages={pagedEvents.totalPages} />
      </section>
    </AdminShell>
  );
}
