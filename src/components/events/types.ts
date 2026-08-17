// shared types for events
export interface GuildEvent {
  id: string;
  organizer_id: string;
  title: string;
  description: string | null;
  event_date: string;
  event_end_date: string | null;
  all_day: boolean;
  location: string | null;
  location_url: string | null;
  color: string | null;
  capacity: number | null;
  tags: string[];
  status: string;
  rejection_reason: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  organizer: { display_name: string } | null;
}

/** イベント登録時に選べる色（識別しやすい8色） */
export const EVENT_COLORS = [
  { label: 'グリーン', value: '#1a4a3a' },
  { label: 'ブルー',   value: '#2563eb' },
  { label: 'ティール', value: '#0891b2' },
  { label: 'パープル', value: '#7c3aed' },
  { label: 'ピンク',   value: '#db2777' },
  { label: 'レッド',   value: '#dc2626' },
  { label: 'オレンジ', value: '#d97706' },
  { label: 'グレー',   value: '#6b7280' },
];

export const DEFAULT_EVENT_COLOR = '#1a4a3a';

/** イベントの表示色（文字色と淡い背景のペア）。HEX + 10%アルファで背景を作る */
export function eventStyle(ev: Pick<GuildEvent, 'color'>): { color: string; bg: string } {
  const c = ev.color || DEFAULT_EVENT_COLOR;
  return { color: c, bg: `${c}1a` };
}

export function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric', weekday: 'short' });
}
export function fmtTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
}
export function fmtDateLong(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
}

export function sameLocalDay(a: string, b: string) {
  const da = new Date(a);
  const db = new Date(b);
  return da.getFullYear() === db.getFullYear() && da.getMonth() === db.getMonth() && da.getDate() === db.getDate();
}

/**
 * 一覧などの時刻行に出す文字列。
 * 複数日にまたがる場合は終了「日」まで必ず表示する（時刻だけだと同日開催に見えるため）。
 */
export function fmtTimeRange(ev: Pick<GuildEvent, 'event_date' | 'event_end_date' | 'all_day'>) {
  const s = ev.event_date;
  const e = ev.event_end_date;
  const multiDay = e ? !sameLocalDay(s, e) : false;
  if (ev.all_day) {
    return multiDay ? `${fmtDate(s)} 〜 ${fmtDate(e!)}・終日` : '終日';
  }
  if (!e) return fmtTime(s);
  return multiDay
    ? `${fmtDate(s)} ${fmtTime(s)} 〜 ${fmtDate(e)} ${fmtTime(e)}`
    : `${fmtTime(s)} 〜 ${fmtTime(e)}`;
}
