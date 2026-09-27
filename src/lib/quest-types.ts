/**
 * クエストの種別（2026-09-27 改定）。
 *
 * 「団体の活動を一日だけ体験する」という今の形に合わせ、活動のジャンルで分ける
 * （以前の「業務委託」「雇用契約」「仲間探し」などは、報酬・勧誘が前提で今の形に合わないため廃止）。
 *
 * ラベルは「興味のある分野」（DB の interest_options）と同じ言葉にしてある。
 * LINE の新着通知は、利用者の興味分野とクエストの種別が完全一致するかで判定するので
 * （lib/quest-notify.ts の matchesQuest）、ここを変えるときは interest_options も合わせること。
 *
 * 掲示板・依頼書・プロフィール・LINE 通知の色はすべてここから取る。
 */
export const QUEST_TYPES = [
  { label: 'スポーツ・運動', examples: '球技・武道・ダンスなど', color: '#2563eb', bg: '#eff6ff' },
  { label: '音楽・演奏', examples: '和太鼓・軽音・吹奏楽・合唱など', color: '#db2777', bg: '#fdf2f8' },
  { label: '文化・芸術', examples: '茶道・書道・美術・写真・演劇など', color: '#7c3aed', bg: '#f5f3ff' },
  { label: 'ものづくり・技術', examples: 'ロボット・プログラミング・電子工作など', color: '#0891b2', bg: '#ecfeff' },
  { label: '学び・研究', examples: '勉強会・研究の体験・ディスカッションなど', color: '#4f46e5', bg: '#eef2ff' },
  { label: '自然・アウトドア', examples: '登山・農作業・生き物観察・キャンプなど', color: '#059669', bg: '#ecfdf5' },
  { label: '国際交流・語学', examples: '留学生との交流・語学カフェなど', color: '#0d9488', bg: '#f0fdfa' },
  { label: '地域・ボランティア', examples: '地域のお祭り・清掃・子ども向けの活動など', color: '#e11d48', bg: '#fff1f2' },
  { label: '企画・イベント運営', examples: '学園祭・イベントの準備や運営など', color: '#d97706', bg: '#fffbeb' },
  { label: '食・料理', examples: '料理・お菓子づくり・食文化など', color: '#ea580c', bg: '#fff7ed' },
  { label: 'その他', examples: '上のどれにも当てはまらないもの', color: '#6b7280', bg: '#f9fafb' },
] as const;

export type QuestTypeLabel = (typeof QUEST_TYPES)[number]['label'];

export const QUEST_TYPE_LABELS: readonly string[] = QUEST_TYPES.map(t => t.label);

const OTHER = QUEST_TYPES[QUEST_TYPES.length - 1];

/** 種別の表示色。廃止した種別（過去のクエスト）は「その他」の色で出す */
export function questTypeStyle(label: string | null | undefined): { color: string; bg: string } {
  const t = QUEST_TYPES.find(x => x.label === label) ?? OTHER;
  return { color: t.color, bg: t.bg };
}

/** 1つのクエストに付けられる分野の数 */
export const MAX_QUEST_FIELDS = 3;

/**
 * クエストの分野（複数）。2026-09-27 から複数選べるようにした（quests.fields / v26）。
 * それより前のクエストは fields が空なので、単一の種別（quest_type）を分野として扱う。
 * quest_type には、選んだ分野の1つ目（主な分野）が入る。
 */
export function questFields(q: { fields?: string[] | null; quest_type?: string | null }): string[] {
  if (q.fields && q.fields.length > 0) return q.fields;
  return q.quest_type ? [q.quest_type] : [];
}

/**
 * 依頼書のタグの候補。活動のジャンルは「種別」で表すので、
 * タグは参加する人が気にする「参加のしやすさ」を表すものにする。
 */
export const PRESET_TAGS = ['初心者歓迎', '一人参加歓迎', '友達と参加OK', '短時間（2時間以内）', '屋外', '留学生歓迎', '英語でもOK'];
