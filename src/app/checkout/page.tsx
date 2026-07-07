import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CheckoutForm from "@/components/CheckoutForm";
import { isOneTimePaymentUnavailable } from "@/lib/commerceStore";
import { checkoutProductSlugs, products, type CheckoutProductSlug } from "@/lib/site";
import { shippingEstimateFor } from "@/lib/shipping";

export const metadata: Metadata = {
  title: "Checkout",
  description: "Submit buyer, shipping and payment details for CHEERDMOTO orders."
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
  const quantity = isOneTimePayment ? 1 : Math.max(1, Math.min(99, Number(query.qty || 1)));
  const shippingEstimate = shippingEstimateFor(productSlug, query.country || "");

  if (await isOneTimePaymentUnavailable(productSlug)) {
    return (
      <main>
        <section className="checkout-hero">
          <div>
            <p className="eyebrow">payment link closed</p>
            <h1>this one-time payment link is no longer available.</h1>
            <p>The USD 35 one-time payment has already been reserved or completed. Please contact CHEERDMOTO for a new payment link.</p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main>
      <section className="checkout-hero">
        <div>
          <p className="eyebrow">cheerdmoto order</p>
          <h1>confirm buyer details and payment preparation</h1>
          <p>
            Submit buyer, delivery and payment preference details. Final quotation, logistics cost and payment collection
            are confirmed by the CHEERDMOTO sales team.
          </p>
        </div>
      </section>
      <section className="checkout-section">
        <CheckoutForm
          locale=""
          productSlug={productSlug}
          productName={product.name}
          productImage={product.image}
          unitPrice={product.priceAmount}
          quantity={quantity}
          shippingEstimate={shippingEstimate}
        />
      </section>
    </main>
  );
}
