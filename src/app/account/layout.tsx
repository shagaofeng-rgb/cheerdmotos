import {StorefrontV1} from '@/components/StorefrontV1';

export const metadata = {
  robots: {
    index: false,
    follow: false
  },
  title: 'COWIN Customer Account'
};

export default function AccountLayout({children}: {children: React.ReactNode}) {
  return <StorefrontV1 className="sf-account">{children}</StorefrontV1>;
}
