import type {Metadata} from 'next';
import {StorefrontV1} from '@/components/StorefrontV1';

export const metadata: Metadata = {robots: {index: false, follow: false}};

export default function CheckoutLayout({children}: {children: React.ReactNode}) {
  return <StorefrontV1 className="sf-checkout">{children}</StorefrontV1>;
}
