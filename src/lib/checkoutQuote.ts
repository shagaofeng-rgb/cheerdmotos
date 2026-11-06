export function checkoutQuote(unitPriceCents: number, quantity: number, shipping: number, coupon: string, specialPayment: boolean) {
  const subtotalCents = unitPriceCents * quantity;
  const shippingCents = Math.round(shipping * 100);
  const discountCents = !specialPayment && ['COWIN', 'CHEERDMOTO'].includes(coupon.trim().toUpperCase())
    ? Math.round((subtotalCents + shippingCents) * 0.03)
    : 0;
  return {subtotalCents, shippingCents, discountCents, totalCents: subtotalCents + shippingCents - discountCents};
}
