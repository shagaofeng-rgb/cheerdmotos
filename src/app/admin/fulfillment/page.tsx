import AdminShell from '@/components/AdminShell';
import {readShipmentRecords, readStoreOrders} from '@/lib/commerceStore';
import {zhOrderStatus, zhShipmentStatus} from '@/lib/adminZh';

export const dynamic = 'force-dynamic';

export default async function AdminFulfillmentPage() {
  const [orders, shipments] = await Promise.all([readStoreOrders(), readShipmentRecords()]);
  const shipmentMap = new Map(shipments.map((shipment) => [shipment.orderId, shipment]));
  const needShip = orders.filter((order) => ['paid', 'processing'].includes(order.status) && order.shipmentStatus === 'unshipped');
  const shipped = orders.filter((order) => ['shipped', 'in_transit', 'delivered'].includes(order.shipmentStatus));

  return (
    <AdminShell active="fulfillment">
      <div className="admin-title">
        <p className="eyebrow">发货与物流</p>
        <h1>发货与物流</h1>
        <p>跟踪已付款订单的发货状态、物流商、追踪号和客户可见备注，避免订单支付状态和履约状态混在一起。</p>
      </div>

      <div className="admin-metrics">
        <article><span>待发货</span><strong>{needShip.length}</strong><small>已付款但未发货</small></article>
        <article><span>已发货/运输中</span><strong>{shipped.length}</strong><small>已录入物流状态</small></article>
        <article><span>物流记录</span><strong>{shipments.length}</strong><small>后台保存的物流单</small></article>
        <article><span>已送达</span><strong>{orders.filter((order) => order.shipmentStatus === 'delivered').length}</strong><small>客户收货完成</small></article>
      </div>

      <section className="admin-panel">
        <div>
          <p className="eyebrow">履约清单</p>
          <h2>订单物流状态</h2>
        </div>
        <div className="admin-table-wrap">
          <table>
            <thead>
              <tr><th>订单号</th><th>订单状态</th><th>商品</th><th>客户</th><th>物流商</th><th>追踪号</th><th>发货状态</th><th>客户备注</th></tr>
            </thead>
            <tbody>
              {orders.length ? orders.slice().reverse().map((order) => {
                const shipment = shipmentMap.get(order.id);
                return (
                  <tr key={order.id}>
                    <td>{order.id}</td>
                    <td>{zhOrderStatus(order.status)}</td>
                    <td>{order.productName} x {order.quantity}</td>
                    <td>{order.customer.name}<br /><small>{order.customer.country}</small></td>
                    <td>{shipment?.logisticsProvider || order.logisticsProvider || '-'}</td>
                    <td>{shipment?.trackingNumber || order.trackingNumber || '-'}</td>
                    <td>{zhShipmentStatus(shipment?.shipmentStatus || order.shipmentStatus)}</td>
                    <td>{shipment?.customerVisibleNote || order.customerVisibleNote || '-'}</td>
                  </tr>
                );
              }) : <tr><td colSpan={8}>暂无订单物流数据。</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </AdminShell>
  );
}
