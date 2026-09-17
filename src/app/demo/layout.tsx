import type { Metadata } from 'next';

/**
 * デモページ専用のレイアウト。中身は素通しで、メタデータだけを付ける。
 *
 * サイト内のどこからもリンクしていないが、それだけだと
 * 検索エンジンに拾われて結果に出てしまう可能性がある。
 * 中身はすべて架空のサンプルなので、これを見つけた人が
 * 実際のサービス内容と誤解しないよう、インデックスを止めておく。
 *
 * URLを直接開く分にはこれまでどおり見られる（会議などでの利用を想定）。
 *
 * ※ page.tsx は 'use client' なので metadata を export できない。
 *   そのためサーバーコンポーネントであるこのレイアウトに置いている。
 */
export const metadata: Metadata = {
  title: '依頼の流れ（デモ） | 九大ギルド',
  description: '関連団体向けに、依頼の申請から学生とのマッチングまでの流れを紹介するデモです。',
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
};

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
