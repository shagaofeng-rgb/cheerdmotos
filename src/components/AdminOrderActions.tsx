'use client';

import {useState} from 'react';

type ActionType = 'shipment' | 'refund' | 'authorization';

async function postForm(orderId: string, action: ActionType, form: HTMLFormElement) {
  const endpoint = `/api/admin/orders/${encodeURIComponent(orderId)}/${action}`;
  const response = await fetch(endpoint, {method: 'POST', body: new FormData(form)});
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.message || 'Request failed');
  return result;
}

export default function AdminOrderActions({orderId, total}: {orderId: string; total: number}) {
  const [status, setStatus] = useState('');

  async function handleSubmit(action: ActionType, event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus('Saving...');
    try {
      await postForm(orderId, action, event.currentTarget);
      setStatus('Saved. Refreshing order data...');
      window.location.reload();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Request failed');
    }
  }

  return (
    <div className="admin-action-grid">
      <form onSubmit={(event) => handleSubmit('shipment', event)}>
        <h3>Logistics upload</h3>
        <input name="logisticsProvider" placeholder="Carrier, e.g. DHL / FedEx / Sea freight" required />
        <input name="trackingNumber" placeholder="Tracking number / bill of lading" required />
        <input name="trackingUrl" type="url" placeholder="Tracking URL, optional" />
        <select name="shipmentStatus" defaultValue="shipped">
          <option value="shipped">Shipped</option>
          <option value="in_transit">In transit</option>
          <option value="delivered">Delivered</option>
          <option value="returned">Returned</option>
        </select>
        <input name="shippedAt" type="datetime-local" />
        <input name="estimatedDeliveryAt" type="datetime-local" />
        <textarea name="customerVisibleNote" placeholder="Customer-visible shipment note" />
        <textarea name="internalNote" placeholder="Internal note, not shown to customer" />
        <button className="button primary small" type="submit">Save logistics</button>
      </form>

      <form onSubmit={(event) => handleSubmit('refund', event)}>
        <h3>Refund API record</h3>
        <input name="amount" type="number" min="0.01" step="0.01" max={total} defaultValue={total} />
        <textarea name="reason" placeholder="Refund reason" defaultValue="Merchant refund request" />
        <button className="button secondary small" type="submit">Create refund record</button>
      </form>

      <form onSubmit={(event) => handleSubmit('authorization', event)}>
        <h3>Pre-authorization API record</h3>
        <select name="action" defaultValue="create">
          <option value="create">Create authorization</option>
          <option value="capture">Capture authorization</option>
          <option value="cancel">Cancel authorization</option>
        </select>
        <input name="amount" type="number" min="0.01" step="0.01" max={total} defaultValue={total} />
        <button className="button secondary small" type="submit">Save authorization</button>
      </form>
      {status && <p className="admin-action-status">{status}</p>}
    </div>
  );
}
