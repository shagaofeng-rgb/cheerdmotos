import {getCheckoutOrder} from '@/lib/checkoutReceipt';
import {StoreIcon, StoreLink} from '@/components/StorefrontV1';

export default async function CheckoutResult({orderId, failed = false}: {orderId?: string; failed?: boolean}) {
  const order = await getCheckoutOrder(orderId);
  const paid = order?.gatewayStatus === 'success' || order?.status === 'paid';
  const paymentFailed = order?.gatewayStatus === 'failed' || order?.status === 'failed';
  const processing = order && ['pending', 'processing'].includes(order.gatewayStatus);
  const heading = !order ? (failed ? 'Payment could not be confirmed' : 'Order details unavailable')
    : paid ? 'Payment confirmed'
    : paymentFailed ? 'Payment unsuccessful'
    : processing ? 'Payment confirmation pending'
    : 'Order received';
  const retry = order && paymentFailed ? `/checkout?product=${encodeURIComponent(order.productSlug)}&qty=${order.quantity}` : '';
  return <main>
    <section className="shell section">
      <div className="state">
        <span className="state-symbol"><StoreIcon name={paid ? 'circle-check' : 'circle-alert'} /></span><p className="kicker">Order status</p>
        <h1>{heading}</h1>
        {order ? <div className="checkout-success-summary">
          <p>Order number <strong>{order.id}</strong></p>
          <p>Amount <strong>{order.currency} {order.total.toLocaleString('en-US', {minimumFractionDigits: 2})}</strong></p>
          <p>{processing ? 'Refresh this page to check for confirmation.' : order.logisticsStatus}</p>
        </div> : <p>Sign in with the verified email used at checkout, or contact COWIN for help.</p>}
        <div className="actions">
          {retry ? <StoreLink href={retry} primary>Try again</StoreLink> : <StoreLink href="/account/orders" primary>View your orders</StoreLink>}
          <StoreLink href="/support">Contact support</StoreLink>
          <StoreLink href="/products">Continue shopping</StoreLink>
        </div>
      </div>
    </section>
  </main>;
}
