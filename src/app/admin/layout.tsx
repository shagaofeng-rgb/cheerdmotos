import '../globals.css';

export const metadata = {
  robots: {
    index: false,
    follow: false
  },
  title: 'CHEERDMOTO 后台'
};

export default function AdminLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
