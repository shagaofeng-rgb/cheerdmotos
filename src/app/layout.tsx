import type { Metadata } from "next";
import {Suspense} from 'react';
import "./globals.css";
import "./precision-storefront.css";
import AnalyticsTracker from '@/components/AnalyticsTracker';

export const metadata: Metadata = {
  metadataBase: new URL("https://www.cheerdmotos.com"),
  title: {
    default: "COWIN | Electric Dirt Bikes, E-Bikes & Mobility",
    template: "%s | COWIN"
  },
  description:
    "Compare COWIN electric dirt bikes, e-bikes, wheelchairs and accessories. Shop by model or request a dealer and bulk quote.",
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
