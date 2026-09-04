import type { Metadata } from "next";
import {Suspense} from 'react';
import "./globals.css";
import "./precision-storefront.css";
import AnalyticsTracker from '@/components/AnalyticsTracker';

export const metadata: Metadata = {
  metadataBase: new URL("https://www.cheerdmotos.com"),
  title: {
    default: "CHEERDMOTO | Wholesale E-Bikes & E-Motorcycles for Business",
    template: "%s | CHEERDMOTO"
  },
  description:
    "Wholesale and fleet solutions for dealers, couriers, and patrol. Dealer pricing, bulk orders, warranty, and worldwide shipping.",
  icons: {
    icon: "/favicon.ico"
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body><Suspense fallback={null}><AnalyticsTracker /></Suspense>{children}</body>
    </html>
  );
}
