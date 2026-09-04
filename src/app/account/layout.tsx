import {PrecisionStorefrontFooter, PrecisionStorefrontHeader} from '@/components/PrecisionStorefrontChrome';

export const metadata = {
  robots: {
    index: false,
    follow: false
  },
  title: 'CHEERDMOTO Customer Account'
};

export default function AccountLayout({children}: {children: React.ReactNode}) {
  return <div className="precision-account-frame"><PrecisionStorefrontHeader />{children}<PrecisionStorefrontFooter /></div>;
}
