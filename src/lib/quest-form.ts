/**
 * クエスト依頼書の項目の型・入力チェック・表示用の整形。
 *
 * 画面（CreateQuestModal）とサーバー（POST /api/quests）の両方から使う。
 * 同じ関数でチェックすることで、「画面では通るのにサーバーで弾かれる」
 * 「画面を通さない送信なら素通りする」の両方を防ぐ。
 */

/** 1団体あたりの未完了（審査待ち＋掲示中）クエストの上限。DB側（v19）も同じ値。 */
export const MAX_OPEN_QUESTS_PER_ORG = 10;

export type QuestSession = { date: string; start: string; end: string };   // "2026-10-20", "10:00", "12:00"
export type ScheduleRow = { time: string; content: string };

/** 依頼書の「確認」。3つすべてにチェックが必要。文言は依頼書どおり。 */
export const CONFIRMATIONS = [
  '「はじめにご確認ください」に当てはまるものはありません',
  '書いた内容と、当日実際にやることは同じです',
  '当日の受け入れ担当者に、この依頼のことを伝えてあります',
] as const;

/** 参加費・持ち物・参加条件の初期値（依頼書の「無い場合は〜」） */
export const FIELD_DEFAULTS = {
  participation_fee: '無料',
  belongings: '手ぶらで可',
  requirements: '誰でも',
} as const;

export type QuestInput = {
  organization_id: string;
  title: string;
  quest_type: string;
  description: string;          // 任意（補足の自由記述）
  tags: string[];
  sessions: QuestSession[];
  location: string;
  max_applicants: number;
  participation_fee: string;
  belongings: string;
  schedule: ScheduleRow[];
  requirements: string;
  preferred_contact: string;    // 九大生からの問い合わせ先（掲示する）
  org_intro: string;
  appeal: string;               // 任意
  photo_path: string | null;    // 任意
  listing_end_date: string;     // 申込の締切（この日まで掲示）
  receiver_name: string;        // 当日の受け入れ担当者（掲示しない）
  receiver_contact: string;     // 同上
  confirmations: boolean[];
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

const str = (v: unknown, max = 2000) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

/** 今日の日付（日本時間）を YYYY-MM-DD で */
export function todayJst(): string {
  const d = new Date(Date.now() + 9 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 10);
}

/** 今日（日本時間）から date（YYYY-MM-DD）まで何日か。今日なら 0、過ぎていれば負。形式が違えば null */
export function daysUntil(date: string | null | undefined, today: string = todayJst()): number | null {
  if (!date || !DATE_RE.test(date)) return null;
  const toUtc = (s: string) => { const [y, m, d] = s.split('-').map(Number); return Date.UTC(y, m - 1, d); };
  return Math.round((toUtc(date) - toUtc(today)) / 86400000);
}

/** 日程を日付・開始時刻の順に並べる */
export function sortSessions(sessions: QuestSession[]): QuestSession[] {
  return [...sessions].sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));
}

/**
 * 送られてきた内容を正規化し、問題があれば最初の1件を日本語で返す。
 * userId を渡すと、写真のパスが本人のフォルダかどうかも確かめる。
 */
export function validateQuestInput(
  raw: any,
  opts: { userId?: string } = {}
): { ok: true; value: QuestInput } | { ok: false; error: string } {
  const fail = (error: string) => ({ ok: false as const, error });

  const sessions: QuestSession[] = Array.isArray(raw?.sessions)
    ? raw.sessions
        .map((s: any) => ({ date: str(s?.date, 10), start: str(s?.start, 5), end: str(s?.end, 5) }))
        .filter((s: QuestSession) => s.date || s.start || s.end)
    : [];
  const schedule: ScheduleRow[] = Array.isArray(raw?.schedule)
    ? raw.schedule
        .map((r: any) => ({ time: str(r?.time, 5), content: str(r?.content, 300) }))
        .filter((r: ScheduleRow) => r.time || r.content)
    : [];
  const tags: string[] = Array.isArray(raw?.tags)
    ? raw.tags.map((t: unknown) => str(t, 30)).filter(Boolean).slice(0, 20)
    : [];
  const confirmations: boolean[] = Array.isArray(raw?.confirmations)
    ? raw.confirmations.map((c: unknown) => c === true)
    : [];

  const value: QuestInput = {
    organization_id: str(raw?.organization_id, 64),
    title: str(raw?.title, 100),
    quest_type: str(raw?.quest_type, 30),
    description: str(raw?.description, 4000),
    tags,
    sessions: sortSessions(sessions),
    location: str(raw?.location, 300),
    max_applicants: Number(raw?.max_applicants),
    participation_fee: str(raw?.participation_fee, 200),
    belongings: str(raw?.belongings, 300),
    schedule,
    requirements: str(raw?.requirements, 300),
    preferred_contact: str(raw?.preferred_contact, 300),
    org_intro: str(raw?.org_intro, 500),
    appeal: str(raw?.appeal, 600),
    photo_path: str(raw?.photo_path, 200) || null,
    listing_end_date: str(raw?.listing_end_date, 10),
    receiver_name: str(raw?.receiver_name, 100),
    receiver_contact: str(raw?.receiver_contact, 200),
    confirmations,
  };

  if (!value.organization_id) return fail('主催団体を選んでください。');
  if (!value.title) return fail('クエスト名を入力してください。');
  if (!value.quest_type) return fail('クエスト種別を選んでください。');

  if (value.sessions.length === 0) return fail('日程を1つ以上入力してください。');
  const today = todayJst();
  for (const [i, s] of value.sessions.entries()) {
    const label = value.sessions.length > 1 ? `${i + 1}つ目の日程` : '日程';
    if (!DATE_RE.test(s.date)) return fail(`${label}の日付を入力してください。`);
    if (!TIME_RE.test(s.start) || !TIME_RE.test(s.end)) return fail(`${label}の開始・終了時刻を入力してください。`);
    if (s.end <= s.start) return fail(`${label}の終了時刻は開始時刻より後にしてください。`);
    if (s.date < today) return fail(`${label}が過去の日付になっています。`);
  }

  if (!value.location) return fail('場所・集合場所を入力してください。');
  if (!Number.isInteger(value.max_applicants) || value.max_applicants < 1 || value.max_applicants > 500) {
    return fail('定員は1〜500人で入力してください。');
  }
  if (!value.participation_fee) return fail('参加費を入力してください（かからない場合は「無料」）。');
  if (!value.belongings) return fail('持ち物・服装を入力してください（無い場合は「手ぶらで可」）。');

  if (value.schedule.length === 0) return fail('当日の流れを1行以上入力してください。');
  for (const r of value.schedule) {
    if (!TIME_RE.test(r.time) || !r.content) return fail('当日の流れは、時刻と内容を両方入力してください。');
  }

  if (!value.requirements) return fail('参加条件を入力してください（無い場合は「誰でも」）。');
  if (!value.preferred_contact) return fail('九大生からの問い合わせ先を入力してください。');
  if (!value.org_intro) return fail('団体の紹介を入力してください。');

  // 申込の締切 = この日まで掲示する日。最初の日程より後にはできない。
  if (!DATE_RE.test(value.listing_end_date)) return fail('申込の締切を入力してください。');
  if (value.listing_end_date < today) return fail('申込の締切が過去の日付になっています。');
  const firstDate = value.sessions[0].date;
  if (value.listing_end_date > firstDate) return fail('申込の締切は、最初の日程の日付以前にしてください。');
  const limit = new Date(); limit.setMonth(limit.getMonth() + 6);
  if (value.listing_end_date > limit.toISOString().slice(0, 10)) return fail('申込の締切は半年以内にしてください。');

  if (!value.receiver_name || !value.receiver_contact) {
    return fail('当日の受け入れ担当者のお名前と連絡先を入力してください（掲示はしません）。');
  }

  if (value.confirmations.length !== CONFIRMATIONS.length || value.confirmations.some(c => !c)) {
    return fail('最後の「確認」の3項目すべてにチェックしてください。');
  }

  // 写真は本人のフォルダにあるものしか指定できない（他人の画像を流用させない）
  if (value.photo_path && opts.userId) {
    const re = new RegExp(`^${opts.userId}/[A-Za-z0-9_-]+\\.(jpg|jpeg|png|webp)$`);
    if (!re.test(value.photo_path)) return fail('写真の指定が正しくありません。もう一度選び直してください。');
  }

  return { ok: true, value };
}

/* ── 表示用 ─────────────────────────────────────── */

const WEEK = ['日', '月', '火', '水', '木', '金', '土'];

/** "2026-10-20" → "10月20日(火)" */
export function fmtDateJa(date: string): string {
  if (!DATE_RE.test(date)) return date;
  const [y, m, d] = date.split('-').map(Number);
  const w = WEEK[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return `${m}月${d}日(${w})`;
}

/** 日程1つを "10月20日(火) 10:00〜12:00" に */
export function fmtSession(s: QuestSession): string {
  return `${fmtDateJa(s.date)} ${s.start}〜${s.end}`;
}

/** 掲示板のカード用の短い日程表記。複数回なら「ほか2回」を付ける */
export function fmtSessionsShort(sessions: QuestSession[] | null | undefined): string | null {
  const list = sortSessions(Array.isArray(sessions) ? sessions : []);
  if (list.length === 0) return null;
  const head = fmtSession(list[0]);
  return list.length > 1 ? `${head} ほか${list.length - 1}回` : head;
}

/** Storage 上のパスから公開URLを作る */
export function photoUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  const base = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '');
  if (!base) return null;
  return `${base}/storage/v1/object/public/quest-photos/${path}`;
}
