// shared types for events
export interface GuildEvent {
  id: string;
  organizer_id: string;
  title: string;
  description: string | null;
  event_date: string;
  event_end_date: string | null;
  location: string | null;
  location_url: string | null;
  category: string;
  capacity: number | null;
  tags: string[];
  status: string;
  rejection_reason: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  organizer: { display_name: string } | null;
}

export const CATEGORY_COLORS: Record<string, { color: string; bg: string }> = {
  '学術':       { color: '#2563eb', bg: '#eff6ff' },
  'スポーツ':   { color: '#059669', bg: '#ecfdf5' },
  '文化':       { color: '#7c3aed', bg: '#f5f3ff' },
  'ボランティア':{ color: '#d97706', bg: '#fffbeb' },
  '交流':       { color: '#db2777', bg: '#fdf2f8' },
  'キャリア':   { color: '#0891b2', bg: '#f0f9ff' },
  'その他':     { color: '#6b7280', bg: '#f9fafb' },
};

export const CATEGORIES = ['学術', 'スポーツ', '文化', 'ボランティア', '交流', 'キャリア', 'その他'];

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
