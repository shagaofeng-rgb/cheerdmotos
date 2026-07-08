import AdminShell from '@/components/AdminShell';
import {readStoreOrders} from '@/lib/commerceStore';

export const dynamic = 'force-dynamic';

export default async function AdminPromotionsPage() {
  const orders = await readStoreOrders();
  const couponOrders = orders.filter((order) => order.checkout.couponCode);
  const couponRevenue = couponOrders.reduce((sum, order) => sum + order.total, 0);

  return (
    <AdminShell active="promotions">
      <div className="admin-title">
        <p className="eyebrow">优惠与促销</p>
        <h1>优惠与促销</h1>
        <p>当前前台已支持结账优惠码识别；正式上线更多活动前，需要确认优惠规则、适用商品、有效期和叠加限制。</p>
      </div>

      <div className="admin-metrics">
        <article><span>优惠订单</span><strong>{couponOrders.length}</strong><small>使用优惠码的订单</small></article>
        <article><span>优惠订单金额</span><strong>USD {couponRevenue.toLocaleString()}</strong><small>使用优惠码订单合计</small></article>
        <article><span>当前活动</span><strong>1</strong><small>CHEERDMOTO 结账优惠码</small></article>
        <article><span>待配置</span><strong>0</strong><small>满减、赠品、阶梯折扣未启用</small></article>
      </div>

      <section className="admin-panel">
        <div>
          <p className="eyebrow">活动规则</p>
          <h2>已接入的促销</h2>
        </div>
        <div className="admin-table-wrap">
          <table>
            <thead>
              <tr><th>优惠码</th><th>规则</th><th>适用范围</th><th>状态</th><th>使用订单</th></tr>
            </thead>
            <tbody>
              <tr>
                <td>CHEERDMOTO</td>
                <td>结账页 3% 优惠</td>
                <td>当前可结账商品</td>
                <td>已启用</td>
                <td>{couponOrders.length}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </AdminShell>
  );
}
