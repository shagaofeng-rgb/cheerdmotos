import {PrecisionStorefrontFooter, PrecisionStorefrontHeader} from '@/components/PrecisionStorefrontChrome';

export default function CheckoutLayout({children}: {children: React.ReactNode}) {
  return <div className="precision-checkout-frame"><PrecisionStorefrontHeader />{children}<PrecisionStorefrontFooter /></div>;
}
