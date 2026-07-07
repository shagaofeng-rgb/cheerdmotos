import '../globals.css';

export const metadata = {
  robots: {
    index: false,
    follow: false
  },
  title: 'CHEERDMOTO Admin'
};

export default function AdminLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
