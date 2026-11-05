import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CheckoutForm from "@/components/CheckoutForm";
import { isOneTimePaymentUnavailable } from "@/lib/commerceStore";
import { checkoutProductSlugs, products, type CheckoutProductSlug } from "@/lib/site";
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
  searchParams: Promise<{ product?: string; qty?: string; country?: string }>;
}) {
  const query = await searchParams;
  const productSlug = (query.product || "xceed-electric-dirt-bike") as CheckoutProductSlug;
  if (!checkoutProductSlugs.includes(productSlug)) notFound();

  const product = products[productSlug];
  const isOneTimePayment = productSlug === "one-time-35";
  const requestedQuantity = Number(query.qty || 1);
  const quantity = isOneTimePayment || !Number.isFinite(requestedQuantity) ? 1 : Math.max(1, Math.min(99, Math.trunc(requestedQuantity)));
  const shippingEstimate = shippingEstimateFor(productSlug, query.country || "");

  if (await isOneTimePaymentUnavailable(productSlug)) {
    return <main><StoreState eyebrow="Payment link" title="This payment link is no longer available." description="Contact COWIN if you need help completing a payment." icon="lock-keyhole"><div className="actions"><StoreLink href="/support#contact" primary arrow>Contact COWIN</StoreLink><StoreLink href="/products">Browse products</StoreLink></div></StoreState></main>;
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
          unitPrice={product.priceAmount}
          quantity={quantity}
          shippingEstimate={shippingEstimate}
        />
      </section>
    </main>
  );
}
