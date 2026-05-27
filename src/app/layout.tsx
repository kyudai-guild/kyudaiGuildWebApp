import type { Metadata } from 'next';
import { Noto_Sans_JP, Cinzel } from 'next/font/google';
import './globals.css';
import { GuildProvider } from '@/contexts/GuildContext';
import Header from '@/components/ui/Header';

const notoSansJP = Noto_Sans_JP({
  variable: '--font-noto-sans',
  subsets: ['latin'],
  weight: ['400', '500', '700', '900'],
  display: 'swap',
});

const cinzel = Cinzel({
  variable: '--font-cinzel',
  subsets: ['latin'],
  weight: ['400', '700', '900'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: '九大ギルド | 挑戦者たちの酒場',
  description:
    '九州大学生たちが集う冒険者ギルド。仲間を見つけ、スキルを高め、クエストを達成しよう。',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ja"
      className={`${notoSansJP.variable} ${cinzel.variable}`}
    >
      <body className="min-h-screen bg-[var(--bg-base)] text-slate-200 antialiased">
        <GuildProvider>
          <Header />
          <main className="pt-16">{children}</main>
        </GuildProvider>
      </body>
    </html>
  );
}
