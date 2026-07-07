'use client';

import {useState} from 'react';

type ActionType = 'shipment' | 'refund' | 'authorization';

async function postForm(orderId: string, action: ActionType, form: HTMLFormElement) {
  const endpoint = `/api/admin/orders/${encodeURIComponent(orderId)}/${action}`;
  const response = await fetch(endpoint, {method: 'POST', body: new FormData(form)});
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.message || '请求失败');
  return result;
}

export default function AdminOrderActions({orderId, total}: {orderId: string; total: number}) {
  const [status, setStatus] = useState('');

  async function handleSubmit(action: ActionType, event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus('正在保存...');
    try {
      await postForm(orderId, action, event.currentTarget);
      setStatus('已保存，正在刷新订单数据...');
      window.location.reload();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : '请求失败');
    }
  }

  return (
    <div className="admin-action-grid">
      <form onSubmit={(event) => handleSubmit('shipment', event)}>
        <h3>物流信息上传</h3>
        <input name="logisticsProvider" placeholder="承运商，例如 DHL / FedEx / 海运" required />
        <input name="trackingNumber" placeholder="追踪单号 / 提单号" required />
        <input name="trackingUrl" type="url" placeholder="物流追踪链接，可选" />
        <select name="shipmentStatus" defaultValue="shipped">
          <option value="shipped">已发货</option>
          <option value="in_transit">运输中</option>
          <option value="delivered">已送达</option>
          <option value="returned">已退回</option>
        </select>
        <input name="shippedAt" type="datetime-local" />
        <input name="estimatedDeliveryAt" type="datetime-local" />
        <textarea name="customerVisibleNote" placeholder="客户可见的物流备注" />
        <textarea name="internalNote" placeholder="内部备注，不展示给客户" />
        <button className="button primary small" type="submit">保存物流</button>
      </form>

      <form onSubmit={(event) => handleSubmit('refund', event)}>
        <h3>退款记录</h3>
        <input name="amount" type="number" min="0.01" step="0.01" max={total} defaultValue={total} />
        <textarea name="reason" placeholder="退款原因" defaultValue="商家发起退款申请" />
        <button className="button secondary small" type="submit">创建退款记录</button>
      </form>

      <form onSubmit={(event) => handleSubmit('authorization', event)}>
        <h3>预授权记录</h3>
        <select name="action" defaultValue="create">
          <option value="create">创建预授权</option>
          <option value="capture">扣款预授权</option>
          <option value="cancel">取消预授权</option>
        </select>
        <input name="amount" type="number" min="0.01" step="0.01" max={total} defaultValue={total} />
        <button className="button secondary small" type="submit">保存预授权</button>
      </form>
      {status && <p className="admin-action-status">{status}</p>}
    </div>
  );
}
