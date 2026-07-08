import AdminShell from '@/components/AdminShell';
import {readAnalyticsEvents, readStoreOrders} from '@/lib/commerceStore';
import {zhEventType} from '@/lib/adminZh';

export const dynamic = 'force-dynamic';

export default async function AdminCartsPage() {
  const [events, orders] = await Promise.all([readAnalyticsEvents(), readStoreOrders()]);
  const checkoutEvents = events.filter((event) => ['checkout_start', 'checkout_submit', 'begin_checkout'].includes(event.type));
  const orderSessions = new Set(orders.map((order) => order.attribution?.sessionId).filter(Boolean));
  const abandonedSessions = new Set(checkoutEvents.filter((event) => !orderSessions.has(event.sessionId)).map((event) => event.sessionId));
  const productClicks = events.filter((event) => event.type === 'commerce_click' || event.type === 'product_view');

  return (
    <AdminShell active="carts">
      <div className="admin-title">
        <p className="eyebrow">购物车与弃购</p>
        <h1>购物车与弃购</h1>
        <p>用前台结账事件和订单会话估算弃购情况，帮助判断哪些客户进入结账但没有完成支付。</p>
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
              {checkoutEvents.length ? checkoutEvents.slice(-40).reverse().map((event) => (
                <tr key={event.id}>
                  <td>{event.timestamp.slice(0, 16).replace('T', ' ')}</td>
                  <td>{zhEventType(event.type)}</td>
                  <td>{event.page}</td>
                  <td>{event.visitorId}</td>
                  <td>{event.sessionId}</td>
                  <td>{event.country || '-'}</td>
                </tr>
              )) : <tr><td colSpan={6}>暂无结账事件。</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </AdminShell>
  );
}
