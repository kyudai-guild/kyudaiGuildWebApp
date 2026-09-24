/**
 * イベントの登録・編集で受け取る内容の検証。
 * 登録（POST /api/events）と編集（PATCH /api/events/[id]）で同じ基準を使う。
 */

export const DEFAULT_ORGANIZER = '九大ギルド運営';

export type EventInput = {
  title: string;
  description: string | null;
  event_date: string;
  event_end_date: string | null;
  all_day: boolean;
  location: string | null;
  location_url: string | null;
  organizer_name: string;
  co_organizer_names: string[];
  color: string;
  capacity: number | null;
  tags: string[];
};

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

export function validateEventInput(raw: any): { ok: true; value: EventInput } | { ok: false; error: string } {
  const title = str(raw?.title, 120);
  const eventDate = str(raw?.event_date, 40);
  const eventEnd = str(raw?.event_end_date, 40) || null;
  if (!title || !eventDate) return { ok: false, error: 'タイトルと開催日時は必須です。' };
  if (Number.isNaN(Date.parse(eventDate))) return { ok: false, error: '開催日時の形式が正しくありません。' };
  if (eventEnd && (Number.isNaN(Date.parse(eventEnd)) || new Date(eventEnd) < new Date(eventDate))) {
    return { ok: false, error: '終了日時は開始日時より後にしてください。' };
  }

  // 共催団体は自由入力。重複と空欄を除き、主催と同じ名前も除く
  const organizer = str(raw?.organizer_name, 100) || DEFAULT_ORGANIZER;
  const coOrganizers: string[] = Array.isArray(raw?.co_organizer_names)
    ? [...new Set<string>(raw.co_organizer_names.map((n: unknown) => str(n, 100)).filter(Boolean))]
        .filter(n => n !== organizer)
        .slice(0, 10)
    : [];

  const capacityNum = raw?.capacity === '' || raw?.capacity == null ? null : Number(raw.capacity);
  if (capacityNum !== null && (!Number.isInteger(capacityNum) || capacityNum < 1)) {
    return { ok: false, error: '定員は1以上の整数で入力してください。' };
  }

  const color = /^#[0-9a-fA-F]{6}$/.test(str(raw?.color, 7)) ? str(raw?.color, 7) : '#1a4a3a';

  return {
    ok: true,
    value: {
      title,
      description: str(raw?.description, 4000) || null,
      event_date: eventDate,
      event_end_date: eventEnd,
      all_day: Boolean(raw?.all_day),
      location: str(raw?.location, 300) || null,
      location_url: str(raw?.location_url, 500) || null,
      organizer_name: organizer,
      co_organizer_names: coOrganizers,
      color,
      capacity: capacityNum,
      tags: Array.isArray(raw?.tags) ? raw.tags.map((t: unknown) => str(t, 30)).filter(Boolean).slice(0, 20) : [],
    },
  };
}

/** 表示用「主催: A ／ 共催: B・C」 */
export function fmtOrganizers(organizer: string | null | undefined, co: string[] | null | undefined): string {
  const main = organizer || DEFAULT_ORGANIZER;
  const list = (co ?? []).filter(Boolean);
  return list.length > 0 ? `${main}（共催: ${list.join('・')}）` : main;
}
