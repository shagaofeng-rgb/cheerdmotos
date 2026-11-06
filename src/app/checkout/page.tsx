import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CheckoutForm from "@/components/CheckoutForm";
import {isOneTimePaymentUnavailable, readStoreOrders} from '@/lib/commerceStore';
import {getPurchaseOffer} from '@/lib/purchaseCatalog';
import {getCurrentCart} from '@/lib/cartStore';
import {onlinePaymentAvailable, paymentMethodToOceanpayment} from '@/lib/oceanpayment';
import { shippingEstimateFor } from "@/lib/shipping";
import {modelLayout} from "@/lib/storefrontModels";
import {StoreIntro, StoreLink, StoreState} from "@/components/StorefrontV1";

export const metadata: Metadata = {
  title: "Checkout",
  description: "Submit buyer, shipping and payment details for COWIN orders.",
  robots: { index: false, follow: false }
};

export default async function CheckoutPage({
  searchParams
}: {
  searchParams: Promise<{ product?: string; qty?: string; country?: string; source?: string }>;
}) {
  const query = await searchParams;
  const productSlug = query.product || 'xceed-electric-dirt-bike';
  if (typeof productSlug !== 'string' || !/^[a-z0-9][a-z0-9-]{0,119}$/.test(productSlug)) notFound();
  const purchaseSource = query.source === 'cart' ? 'cart' : 'direct';
  const [orders, cart] = await Promise.all([readStoreOrders(), purchaseSource === 'cart' ? getCurrentCart() : null]);
  const product = await getPurchaseOffer(productSlug, orders);
  if (!product) notFound();
  const isOneTimePayment = productSlug === "one-time-35";
  const onlineMethods = (['oceanpayment_card', 'oceanpayment_google_pay', 'oceanpayment_apple_pay'] as const)
    .filter((method) => onlinePaymentAvailable(productSlug, paymentMethodToOceanpayment(method)));
  const requestedQuantity = Number(query.qty || 1);
  const quantity = isOneTimePayment || !Number.isFinite(requestedQuantity) ? 1 : Math.max(1, Math.min(99, Math.trunc(requestedQuantity)));
  const shippingEstimate = shippingEstimateFor(productSlug, typeof query.country === 'string' ? query.country : '');

  if (await isOneTimePaymentUnavailable(productSlug)) {
    return <main><StoreState eyebrow="Payment link" title="This payment link is no longer available." description="Contact COWIN if you need help completing a payment." icon="lock-keyhole"><div className="actions"><StoreLink href="/support#contact" primary arrow>Contact COWIN</StoreLink><StoreLink href="/products">Browse products</StoreLink></div></StoreState></main>;
  }

  if (isOneTimePayment && !onlineMethods.length) {
    return <main><StoreState eyebrow="Payment link" title="Online payment is temporarily unavailable." description="Contact COWIN to confirm the next step." icon="lock-keyhole"><div className="actions"><StoreLink href="/support#contact" primary arrow>Contact COWIN</StoreLink></div></StoreState></main>;
  }

  const canCheckout = purchaseSource === 'cart'
    ? product.canCart && cart?.items.some((item) => item.productSlug === productSlug && item.quantity >= quantity)
    : product.canDirectOrder;
  if (!canCheckout || quantity > product.available) {
    return <main><StoreState eyebrow="Checkout" title="This selection is unavailable." description="Check the product page for current availability, adjust your quantity or contact COWIN." icon="circle-alert"><div className="actions"><StoreLink href={purchaseSource === 'cart' ? '/cart' : `/products/${productSlug}`} primary arrow>Review your selection</StoreLink><StoreLink href="/support#contact">Contact COWIN</StoreLink></div></StoreState></main>;
  }

  return (
    <main>
      <StoreIntro eyebrow="COWIN / Secure checkout" title="Checkout">Enter your delivery details and choose a payment method.</StoreIntro>
      <section className="shell section">
        <CheckoutForm
          locale=""
          productSlug={productSlug}
          productName={modelLayout(productSlug)?.title || product.name}
          productImage={product.image}
          unitPriceCents={product.priceCents}
          quantity={quantity}
          shippingEstimate={shippingEstimate}
          purchaseSource={purchaseSource}
          onlineMethods={onlineMethods}
        />
      </section>
    </main>
  );
}
