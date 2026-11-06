import CheckoutResult from '@/components/CheckoutResult';

export default async function CheckoutFailedPage({searchParams}: {searchParams: Promise<{order?: string}>}) {
  return <CheckoutResult orderId={(await searchParams).order} failed />;
}
