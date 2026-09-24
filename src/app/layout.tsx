import type { Metadata } from 'next';
import { Inter, Noto_Sans_JP } from 'next/font/google';
import './globals.css';
import { GuildProvider } from '@/contexts/GuildContext';
import Header from '@/components/ui/Header';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  display: 'swap',
});

const notoSansJP = Noto_Sans_JP({
  variable: '--font-noto-sans',
  subsets: ['latin'],
  weight: ['300', '400', '500', '700'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: '九大ギルド | 九州大学クエスト掲示板',
  description:
    '九大生が、サークルや学生団体の活動を一日だけ体験できるクエスト掲示板です。',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className={`${inter.variable} ${notoSansJP.variable}`}>
      <body
        className="min-h-screen antialiased"
        style={{ backgroundColor: 'var(--bg-base)', color: 'var(--color-text-primary)' }}
      >
        <GuildProvider>
          <Header />
          <main style={{ paddingTop: 'var(--header-height)' }}>{children}</main>
        </GuildProvider>
      </body>
    </html>
  );
}
