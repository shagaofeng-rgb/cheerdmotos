import '../globals.css';

export const metadata = {
  robots: {
    index: false,
    follow: false
  },
  title: 'CHEERDMOTO Customer Account'
};

export default function AccountLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
