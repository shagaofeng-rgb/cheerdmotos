import {StoreIcon} from "@/components/StorefrontV1";
import { findStoreOrder } from "@/lib/commerceStore";

export default async function CheckoutFailedPage({
  searchParams
}: {
  searchParams: Promise<{ order?: string; payment?: string }>;
}) {
  const { order: orderId, payment } = await searchParams;
  const order = orderId ? await findStoreOrder(orderId) : null;
  const paymentId = order?.paymentId || order?.transactionId || "";
  const reason = payment === "unverified"
    ? "payment return could not be verified."
    : payment === "unmatched"
      ? "payment return did not include a matching order number."
      : "payment was declined, failed, or cancelled.";

  return (
    <main>
      <section className="shell section">
        <div className="state">
          <span className="state-symbol"><StoreIcon name="circle-alert" /></span><p className="kicker">Payment result</p>
          <h1>Payment unsuccessful</h1>
          {order ? (
            <div className="checkout-success-summary">
              <p>Order number: <strong>{order.id}</strong></p>
              <p>Payment status: <strong>{order.gatewayStatus}</strong></p>
              <p>Amount: <strong>{order.currency} {order.total.toLocaleString()}</strong></p>
              <p>Payment ID: <strong>{paymentId || "not confirmed"}</strong></p>
              <p>{order.logisticsStatus || reason}</p>
            </div>
          ) : (
            <p>{reason} Please contact COWIN if you need help confirming this payment attempt.</p>
          )}
          <div className="actions">
            <a className="button primary" href={order ? `/checkout?product=${encodeURIComponent(order.productSlug)}&qty=${order.quantity}` : "/checkout"}>Try again</a>
            <a className="button secondary" href="/account/orders">View orders</a>
            <a className="button secondary" href="/support">Contact support</a>
          </div>
        </div>
      </section>
    </main>
  );
}
