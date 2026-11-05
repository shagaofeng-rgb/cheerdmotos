import {StorefrontV1} from '@/components/StorefrontV1';

export default function CheckoutLayout({children}: {children: React.ReactNode}) {
  return <StorefrontV1 className="sf-checkout">{children}</StorefrontV1>;
}
