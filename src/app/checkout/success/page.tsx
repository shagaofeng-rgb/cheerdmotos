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
      <section className="checkout-hero">
        <div>
          <p className="eyebrow">order received</p>
          <h1>{statusCopy}</h1>
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
              Please contact CHEERDMOTO with the order number shown here.
            </p>
          )}
          <div className="checkout-success-actions">
            <a className="button primary" href="/products">continue shopping</a>
            <a className="button secondary" href="/account/orders">view orders</a>
            <a className="button secondary" href="/support">contact support</a>
          </div>
        </div>
      </section>
    </main>
  );
}
