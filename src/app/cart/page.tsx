import type {Metadata} from 'next';
import CartPageClient from '@/components/CartPageClient';

export const metadata: Metadata = {
  title: 'Your Cart',
  description: 'Review the CHEERDMOTO products saved to your cart.',
  robots: {index: false, follow: false}
};

export default function CartPage() {
  return <CartPageClient />;
}
