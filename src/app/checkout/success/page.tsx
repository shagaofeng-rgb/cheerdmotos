import {StoreIcon} from "@/components/StorefrontV1";
import { findStoreOrder } from "@/lib/commerceStore";

export default async function CheckoutSuccessPage({
  searchParams
}: {
  searchParams: Promise<{ order?: string; payment?: string }>;
}) {
  const { order: orderId, payment } = await searchParams;
  const order = orderId ? await findStoreOrder(orderId) : null;
  const paymentId = order?.paymentId || order?.transactionId || "";
  const statusCopy = order
    ? order.status === "paid"
      ? "payment confirmed"
      : order.gatewayStatus === "processing" || payment === "verified"
        ? "payment confirmation is processing"
        : order.gatewayStatus === "failed" || order.status === "failed"
          ? "payment failed"
          : "order received"
    : "order lookup unavailable";

  return (
    <main>
      <section className="shell section">
        <div className="state">
          <span className="state-symbol"><StoreIcon name={order?.status === "paid" ? "circle-check" : "circle-alert"} /></span><p className="kicker">Order status</p>
          <h1>{statusCopy[0].toUpperCase() + statusCopy.slice(1)}</h1>
          {order ? (
            <div className="checkout-success-summary">
              <p>Order number: <strong>{order.id}</strong></p>
              <p>Payment status: <strong>{order.gatewayStatus}</strong></p>
              <p>Amount: <strong>{order.currency} {order.total.toLocaleString()}</strong></p>
              <p>Payment ID: <strong>{paymentId || "payment confirmation is processing"}</strong></p>
              <p>{order.logisticsStatus}</p>
            </div>
          ) : (
            <p>
              Order number: <strong>{orderId || "missing"}</strong>. We could not load this order record.
              Please contact COWIN with the order number shown here.
            </p>
          )}
          <div className="actions">
            <a className="button primary" href="/products">Continue shopping</a>
            <a className="button secondary" href="/account/orders">View orders</a>
            <a className="button secondary" href="/support">Contact support</a>
          </div>
        </div>
      </section>
    </main>
  );
}
