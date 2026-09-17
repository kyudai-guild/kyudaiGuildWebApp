import React from 'react';

/* ============================================================
   読み込み中に出す骨組み（スケルトン）。

   スピナーは「何も無い時間」に見えるが、枠が先に出ていれば
   待ち時間が同じでも体感は短くなる。

   守っていること:
     - 本物の中身と**同じ寸法**にする。ここがズレると、
       データ到着時に要素が飛んでかえって不快になる
     - prefers-reduced-motion では明滅を止める
     - aria-busy を付け、読み上げでは「読み込み中」とだけ伝える

   スタイルは <style> タグに出す必要があるため（インライン style では
   @keyframes と @media を書けない）、SKELETON_STYLES を画面側の
   <style> に必ず1回입れること。SkeletonStyles を置けば済む。
   ============================================================ */

export const SKELETON_STYLES = `
  .sk-bar { border-radius: 4px; background: var(--color-border); opacity: 0.55; animation: sk-pulse 1.4s ease-in-out infinite; }
  .sk-grid { display: grid; grid-template-columns: repeat(7, 1fr); }
  .sk-cell { min-height: 90px; border-right: 1px solid var(--color-border); border-bottom: 1px solid var(--color-border); padding: 0.375rem; }
  .sk-cell:nth-child(7n) { border-right: none; }
  @keyframes sk-pulse { 0%, 100% { opacity: 0.35; } 50% { opacity: 0.7; } }
  @media (max-width: 640px) {
    .sk-cell { min-height: 56px; padding: 0.25rem; }
  }
  @media (prefers-reduced-motion: reduce) {
    .sk-bar { animation: none; }
  }
`;

export function SkeletonStyles() {
  return <style>{SKELETON_STYLES}</style>;
}

/** 1本の帯。width は数値(px)でも '60%' でも渡せる */
export function Bar({ w, h = 12, mb = 0, r }: { w?: number | string; h?: number; mb?: number; r?: number }) {
  return <div className="sk-bar" style={{ width: w ?? '100%', height: h, marginBottom: mb, borderRadius: r }} />;
}

const cardStyle: React.CSSProperties = {
  borderRadius: '1rem',
  background: 'var(--bg-card)',
  border: '1px solid var(--color-border)',
  boxShadow: 'var(--shadow-card)',
  padding: '1.25rem',
};

/**
 * カード型の一覧（マイクエスト・管理画面・感謝など）の骨組み。
 * 実際のカードと同じ余白・角丸・境界にしてある。
 */
export function CardListSkeleton({ rows = 3, lines = 2 }: { rows?: number; lines?: number }) {
  return (
    <div aria-busy="true" aria-label="読み込み中" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <Bar w={64} h={18} r={9999} />
            <Bar w={72} h={12} />
          </div>
          <Bar w="70%" h={14} mb={10} />
          {Array.from({ length: Math.max(0, lines - 1) }).map((__, j) => (
            <Bar key={j} w={j === lines - 2 ? '45%' : '90%'} h={10} mb={6} />
          ))}
        </div>
      ))}
    </div>
  );
}

/** 横一列のタイル（プロフィールの実績欄など） */
export function TileRowSkeleton({ tiles = 4 }: { tiles?: number }) {
  return (
    <div aria-busy="true" aria-label="読み込み中"
      style={{ display: 'grid', gridTemplateColumns: `repeat(${tiles}, minmax(0, 1fr))`, gap: '0.625rem' }}>
      {Array.from({ length: tiles }).map((_, i) => (
        <div key={i} style={{ ...cardStyle, padding: '0.875rem 1rem', boxShadow: 'none' }}>
          <Bar w="60%" h={10} mb={10} />
          <Bar w={36} h={20} />
        </div>
      ))}
    </div>
  );
}

/** 一覧の行（トーク一覧・感謝一覧など、カードより薄いもの） */
export function RowListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div aria-busy="true" aria-label="読み込み中" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{ ...cardStyle, padding: '1rem 1.25rem', boxShadow: 'none', display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
          <div className="sk-bar" style={{ width: 36, height: 36, borderRadius: 9999, flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <Bar w="50%" h={13} mb={8} />
            <Bar w="80%" h={10} />
          </div>
        </div>
      ))}
    </div>
  );
}

/** 吹き出しが並ぶトークルームの骨組み */
export function ChatSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div aria-busy="true" aria-label="読み込み中" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {Array.from({ length: rows }).map((_, i) => {
        const mine = i % 3 === 1;
        return (
          <div key={i} style={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start' }}>
            <div className="sk-bar" style={{
              width: `${45 + ((i * 13) % 30)}%`,
              height: 38,
              borderRadius: '0.875rem',
            }} />
          </div>
        );
      })}
    </div>
  );
}

/** カレンダーの骨組み */
export function CalendarSkeleton() {
  return (
    <div aria-busy="true" aria-label="読み込み中">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', gap: '1rem' }}>
        <Bar w={160} h={28} />
        <Bar w={180} h={28} />
      </div>
      <div style={{ borderRadius: '1rem', overflow: 'hidden', border: '1px solid var(--color-border)', background: 'var(--bg-card)' }}>
        <div className="sk-grid" style={{ borderBottom: '1px solid var(--color-border)' }}>
          {['月', '火', '水', '木', '金', '土', '日'].map((w, i) => (
            <div key={w} style={{
              padding: '0.5rem 0.375rem', textAlign: 'center', fontSize: '0.75rem', fontWeight: 700,
              color: i === 5 ? '#2563eb' : i === 6 ? '#dc2626' : 'var(--color-text-secondary)',
              borderRight: i < 6 ? '1px solid var(--color-border)' : 'none',
            }}>{w}</div>
          ))}
        </div>
        {Array.from({ length: 5 }).map((_, wi) => (
          <div key={wi} className="sk-grid">
            {Array.from({ length: 7 }).map((__, ci) => (
              <div key={ci} className="sk-cell">
                <Bar w={16} h={10} mb={6} />
                {(wi + ci) % 4 === 0 && <Bar h={12} mb={3} />}
                {(wi + ci) % 7 === 0 && <Bar w="70%" h={12} />}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
