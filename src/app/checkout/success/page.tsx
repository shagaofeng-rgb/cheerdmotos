import CheckoutResult from '@/components/CheckoutResult';

export default async function CheckoutSuccessPage({searchParams}: {searchParams: Promise<{order?: string}>}) {
  return <CheckoutResult orderId={(await searchParams).order} />;
}
