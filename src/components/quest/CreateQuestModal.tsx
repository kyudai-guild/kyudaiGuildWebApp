'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { X, Send, AlertCircle, FileText, Calendar, Users, Tag, Building2, Plus, Trash2, Lock, ImagePlus, Mail, Clock, Repeat } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useGuild } from '@/contexts/GuildContext';
import { createClient } from '@/lib/supabase-client';
import { resizeToJpeg } from '@/lib/image-resize';
import {
  CONFIRMATIONS, FIELD_DEFAULTS, MAX_OPEN_QUESTS_PER_ORG,
  validateQuestInput, todayJst, photoUrl,
  type QuestSession, type ScheduleRow,
} from '@/lib/quest-form';
import { isSubmitEnter } from '@/lib/keyboard';
import { QUEST_TYPES, QUEST_TYPE_LABELS, PRESET_TAGS, MAX_QUEST_FIELDS, questTypeStyle } from '@/lib/quest-types';
import { readDraft, writeDraft, removeDraft } from '@/lib/client-cache';

type CreateQuestModalProps = { isOpen: boolean; onClose: () => void };
type MyOrg = { id: string; name: string; description: string | null; public_contact: string | null };
type OpenCounts = { pending: number; approved: number; limit: number };

// 種別・タグは従来どおり残す（2026-09 会議: 置き換えではなく追加）

const iStyle: React.CSSProperties = { width: '100%', background: 'var(--bg-base)', border: '1px solid var(--color-border)', borderRadius: '0.75rem', padding: '0.625rem 0.875rem', fontSize: '0.875rem', color: 'var(--color-text-primary)', outline: 'none', transition: 'border-color 0.2s, box-shadow 0.2s', boxSizing: 'border-box' };
const labelS: React.CSSProperties = { display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '0.375rem' };
const recommend: React.CSSProperties = { fontSize: '0.6875rem', fontWeight: 700, padding: '0.0625rem 0.375rem', borderRadius: 4, marginLeft: '0.25rem', color: 'var(--color-primary)', background: '#f2f7f4', border: '1px solid #cfe3d8', verticalAlign: 'middle' };
const hintS: React.CSSProperties = { fontSize: '0.75rem', marginTop: '0.25rem', color: 'var(--color-text-tertiary)', lineHeight: 1.6 };
const focusI = (e: React.FocusEvent<any>) => { e.currentTarget.style.borderColor = 'var(--color-primary)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(26,74,58,0.1)'; };
const blurI = (e: React.FocusEvent<any>) => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.boxShadow = 'none'; };
const req = <span style={{ color: '#dc2626' }}>*</span>;
const smallBtn: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', fontWeight: 600, padding: '0.375rem 0.75rem', borderRadius: '9999px', cursor: 'pointer', background: 'var(--bg-card)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' };

const MODAL_STYLES = `
  .cq-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
  .cq-session { display: grid; grid-template-columns: 1.4fr 1fr auto 1fr auto; gap: 0.375rem; align-items: center; }
  .cq-flow { display: grid; grid-template-columns: 6.5rem 1fr auto; gap: 0.375rem; align-items: center; }
  @media (max-width: 560px) {
    .cq-grid-2 { grid-template-columns: 1fr; }
    /* 日付だけ1行目に置き、2行目を「開始 〜 終了 削除」にそろえる */
    .cq-session { grid-template-columns: 1fr auto 1fr auto; }
    .cq-session > input[type=date] { grid-column: 1 / -1; }
    /* 項目が多いので、スマホでは画面いっぱいに使う */
    .cq-overlay { padding: 0 !important; }
    .cq-panel { max-height: none !important; height: 100dvh; border-radius: 0 !important; border: none !important; }
  }
`;

/* ── 最初の「注意事項」画面（PDF「クエストを出していただく団体の皆さまへ」より） ── */

function GuidelineSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: '1.125rem' }}>
      <h4 style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '0.375rem' }}>{title}</h4>
      <div style={{ fontSize: '0.75rem', lineHeight: 1.8, color: 'var(--color-text-secondary)' }}>{children}</div>
    </section>
  );
}

/* 箇条書き。アプリ全体のスタイルで ul/ol の印が消えているので、中黒・番号は自分で描く */
function Items({ children }: { children: React.ReactNode }) {
  return <ul style={{ margin: '0.375rem 0 0', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>{children}</ul>;
}
function Item({ label, children }: { label?: string; children: React.ReactNode }) {
  return (
    <li style={{ display: 'flex', gap: '0.125rem' }}>
      <span aria-hidden="true" style={{ flexShrink: 0 }}>・</span>
      <span>{label && <b>{label}：</b>}{children}</span>
    </li>
  );
}
function Steps({ children }: { children: React.ReactNode }) {
  return <ol style={{ margin: '0.375rem 0 0', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>{children}</ol>;
}
function Step({ n, label, children }: { n: number; label?: string; children: React.ReactNode }) {
  return (
    <li style={{ display: 'flex', gap: '0.375rem' }}>
      <span aria-hidden="true" style={{ flexShrink: 0, fontWeight: 700, color: 'var(--color-primary)' }}>{n}.</span>
      <span>{label && <b>{label}：</b>}{children}</span>
    </li>
  );
}

function Guidelines() {
  return (
    <>
      <GuidelineSection title="クエストとは">
        「クエスト」とは、九大ギルドが掲載する、<b>九大生が1日だけ参加できる体験型アクティビティ</b>です。
        <Items>
          <Item label="九大生にとって">やったことのない活動に、まずは一度だけ触れてみるきっかけになります。</Item>
          <Item label="団体の皆さまにとって">普段の活動そのものを広く知ってもらう機会になります。</Item>
        </Items>
      </GuidelineSection>

      <GuidelineSection title="掲載できるクエスト（3つの基準）">
        次の3つの条件を<b>すべて</b>満たすものを、クエストとして掲載いただけます。
        <Steps>
          <Step n={1}>
            参加する本人が、手を動かす・体を使う体験があること
            <br />
            <span style={{ color: 'var(--color-text-tertiary)' }}>※ 見るだけ・聞くだけの企画は、クエストではなく「イベント告知」として扱っています。</span>
          </Step>
          <Step n={2}>参加することが、入部や入会の条件になっていないこと</Step>
          <Step n={3}>やってみた後に「自分はどう感じたか」を振り返れる形になっていること</Step>
        </Steps>
        <Items>
          <Item label="複数日程の開催">複数回にわたる日程のクエストも掲載可能です。</Item>
          <Item label="入部の案内について">
            体験後の入部のお誘いは歓迎です。興味を持った九大生が入れる道はぜひ示してあげてください。
            ただし、<b>一度断られた後に勧誘を続ける行為はお控えください。</b>
          </Item>
        </Items>
      </GuidelineSection>

      <GuidelineSection title="参加費と報酬について">
        <Items>
          <Item label="報酬"><b>参加者に報酬（謝礼・給与など）が出るクエストは、当面の間お受けしていません。</b></Item>
          <Item label="参加費">必要な実費の範囲内で設定をお願いします。必要経費を超えて団体の収入・利益になるものはお受けできません。</Item>
          <Item label="集金方法">参加費が発生する場合は、必ず申請フォームに明記してください。当日その場で現金を直接請求することはできません。</Item>
        </Items>
      </GuidelineSection>

      <GuidelineSection title="団体としての掲載ルール">
        クエストは、サークルや団体として掲載するものです。
        <Items>
          <Item label="個人での募集は不可">団体のメンバーが個人的に人を集めるための依頼は掲載できません。</Item>
          <Item label="団体内での事前共有">同じ団体から似た内容のクエストが重複しないよう、申請前に団体内でご相談ください。</Item>
          <Item label="掲載件数の上限">
            <b>1団体につき、未完了（審査中・掲載中）のクエストは最大{MAX_OPEN_QUESTS_PER_ORG}件まで</b>です。終了したクエストは速やかに完了報告を行ってください。
          </Item>
        </Items>
      </GuidelineSection>

      <GuidelineSection title="募集文の書き方について">
        <Items>
          <Item label="断定表現の回避">「絶対に〜できる」「必ず友達ができる」といった過度な言い切りは避けてください。</Item>
          <Item label="客観的な記述">「九大No.1」など、根拠を示せない誇大表現は使用できません。</Item>
          <Item label="参加対象の限定">参加できる対象者を限る場合は、活動内容から理由が説明できる範囲で設定をお願いします。</Item>
          <Item label="伝わりやすい言葉遣い">その団体を知らない九大生が読んでも、当日に何をするのかが具体的に伝わる言葉で書いてください。</Item>
        </Items>
      </GuidelineSection>

      <GuidelineSection title="お受けできないクエスト（禁止事項）">
        以下のいずれかに該当するものは掲載できません。
        <Items>
          <Item>特定の思想・宗教・政治への勧誘を目的とするもの</Item>
          <Item>商品・サービスの販売、または入会・契約の勧誘が主目的のもの</Item>
          <Item>一度断られた後も続く勧誘や、参加後に繰り返し連絡を取る行為</Item>
          <Item>募集内容に記載された活動と、実際の体験内容が異なるもの</Item>
          <Item>飲酒を伴うもの、夜間の屋外・水辺・高所など事故のリスクが高いもの、激しい運動を伴うもの</Item>
          <Item>参加者に車やバイクを運転させるもの</Item>
          <Item>当日の受け入れ担当者が決まっていないもの</Item>
          <Item>参加費の記載がないもの、または当日その場で現金を求めるもの</Item>
          <Item>参加者に報酬が出るもの（当面の間はお取り扱いしていません）</Item>
          <Item>参加費が必要経費を超え、団体の収入になっているもの</Item>
          <Item>法令や公序良俗に反するもの、性的な内容、差別的な内容</Item>
          <Item>個人情報の収集が目的と思われるもの</Item>
          <Item>事実と異なる内容、他者の著作物や写真を無断で使用しているもの</Item>
        </Items>
      </GuidelineSection>

      <GuidelineSection title="申請した後の流れ">
        <Steps>
          <Step n={1} label="運営による確認">申請後、運営が内容を確認し、掲載の可否をメールでお知らせします（掲載できない場合は理由を添えてご連絡します）。</Step>
          <Step n={2} label="申し込みの受付">九大生からの参加申し込みは本アプリ内で受け付けます。団体側で個別に募集告知を行っていただく必要はありません。</Step>
          <Step n={3} label="応募通知と連絡">応募があると、クエストを出した担当者にメールで通知が届きます。応募した九大生とは、アプリ内のトーク機能で直接やりとりが可能です。</Step>
        </Steps>
      </GuidelineSection>
    </>
  );
}

/* ── フォーム ─────────────────────────────────── */

type FormState = {
  organization_id: string;
  title: string;
  fields: string[];              // 分野（1〜3つ）
  description: string;
  tags: string[];
  sessions: QuestSession[];
  location: string;
  max_applicants: string;
  participation_fee: string;
  belongings: string;
  schedule: ScheduleRow[];
  requirements: string;
  preferred_contact: string;
  org_intro: string;
  appeal: string;
  listing_end_date: string;
  receiver_name: string;
  receiver_contact: string;
  confirmations: boolean[];
  is_ongoing: boolean;           // 常設クエスト
  schedule_note: string;         // 日程についての補足（常設なら頻度の目安）
};

const emptyForm = (): FormState => ({
  organization_id: '',
  title: '',
  fields: [],
  description: '',
  tags: [],
  sessions: [{ date: '', start: '', end: '' }],
  location: '',
  max_applicants: '',
  participation_fee: FIELD_DEFAULTS.participation_fee,
  belongings: FIELD_DEFAULTS.belongings,
  schedule: [{ time: '', content: '' }],
  requirements: FIELD_DEFAULTS.requirements,
  preferred_contact: '',
  org_intro: '',
  appeal: '',
  listing_end_date: '',
  receiver_name: '',
  receiver_contact: '',
  confirmations: CONFIRMATIONS.map(() => false),
  is_ongoing: false,
  schedule_note: '',
});

/* ── 下書き ──
 * 依頼書は項目が多く、スマホで書いている途中に別のアプリを開くと、
 * ブラウザがタブを破棄して内容が消えることがある。書いた内容はこの端末に自動で保存し、
 * 次に開いたときに復元する。申請が済むか「最初から書き直す」を押すと消える。
 * ログアウトすると消える（client-cache の clearCache）。
 */
const DRAFT_NAME = 'quest-request';
type Draft = { f: FormState; photoPath: string | null; touched: { intro: boolean; contact: boolean } };

/** 何か書き始めているか。団体を選ぶと紹介・問い合わせ先は自動で入るので、それは数えない */
function hasContent(f: FormState, photoPath: string | null): boolean {
  return !!f.title.trim() || !!f.location.trim() || !!f.appeal.trim() || !!f.description.trim()
    || f.schedule.some(r => r.content.trim()) || f.sessions.some(s => s.date)
    || !!f.receiver_name.trim() || !!f.receiver_contact.trim() || !!photoPath;
}

function SectionTitle({ icon: Icon, children, note }: { icon: React.ElementType; children: React.ReactNode; note?: React.ReactNode }) {
  return (
    <div style={{ paddingTop: '0.25rem', borderTop: '1px solid var(--color-border)' }}>
      <p style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.9375rem', fontWeight: 700, color: 'var(--color-text-primary)', marginTop: '1rem' }}>
        <Icon size={15} style={{ color: 'var(--color-accent)' }} />{children}
      </p>
      {note && <p style={{ ...hintS, marginTop: '0.125rem' }}>{note}</p>}
    </div>
  );
}

export default function CreateQuestModal({ isOpen, onClose }: CreateQuestModalProps) {
  const { createQuest, member } = useGuild();
  const router = useRouter();
  const supabase = createClient();

  // 前回の書きかけ。あれば注意事項は確認済みとして、依頼書から再開する
  const [draft] = useState(() => (member.isVisitor ? null : readDraft<Draft>(DRAFT_NAME, member.id)));
  const [restored, setRestored] = useState(!!draft);

  const [step, setStep] = useState<'guidelines' | 'form'>(draft ? 'form' : 'guidelines');
  const [guidelinesAccepted, setGuidelinesAccepted] = useState(!!draft);
  const [f, setF] = useState<FormState>(() => {
    if (!draft) return emptyForm();
    const saved = draft.f as Partial<FormState> & { quest_type?: string };
    const restored: FormState = { ...emptyForm(), ...saved };
    // 以前の下書きは分野を1つだけ（quest_type）持っていた。一覧にない分野（廃止した種別）は外す
    const fields = Array.isArray(saved.fields) ? saved.fields : (saved.quest_type ? [saved.quest_type] : []);
    restored.fields = fields.filter(v => QUEST_TYPE_LABELS.includes(v)).slice(0, MAX_QUEST_FIELDS);
    return restored;
  });
  const [customTag, setCustomTag] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 承認済みの所属団体のみ（申請中の所属で出されると、所属が却下された後に団体名義のクエストだけが残る）
  const [myOrgs, setMyOrgs] = useState<MyOrg[]>([]);
  const [orgsLoaded, setOrgsLoaded] = useState(false);
  const [counts, setCounts] = useState<OpenCounts | null>(null);
  // 団体の紹介・問い合わせ先を本人が書き換えたか。書き換えていなければ、団体を選び直したときに団体の登録情報で入れ直す
  const touched = useRef(draft?.touched ?? { intro: false, contact: false });

  const [photoPath, setPhotoPath] = useState<string | null>(draft?.photoPath ?? null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setF(prev => ({ ...prev, [key]: value }));

  // このモーダルは QuestBoard で常時マウントされているので、開いた時だけ取得する。
  // （hooks の数を変えないよう、必ず下の早期 return より上に置くこと）
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    fetch('/api/organizations')
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (cancelled || !d) return;
        const mine = new Set<string>(d.mine ?? []);
        const list: MyOrg[] = (d.organizations ?? [])
          .filter((o: any) => o.is_active !== false && mine.has(o.id))
          .map((o: any) => ({ id: o.id, name: o.name, description: o.description ?? null, public_contact: o.public_contact ?? null }));
        setMyOrgs(list);
        setOrgsLoaded(true);
        // 所属が1つだけなら迷わせない
        if (list.length === 1) selectOrg(list[0].id, list);
      })
      .catch(() => setOrgsLoaded(true));
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // 書いた内容を少し待ってから保存する（打つたびに書き込まない）
  useEffect(() => {
    if (!isOpen || step !== 'form' || member.isVisitor) return;
    const timer = setTimeout(() => {
      if (hasContent(f, photoPath)) writeDraft<Draft>(DRAFT_NAME, member.id, { f, photoPath, touched: touched.current });
      else removeDraft(DRAFT_NAME, member.id);
    }, 500);
    return () => clearTimeout(timer);
  }, [isOpen, step, f, photoPath, member.id, member.isVisitor]);

  // 選んだ団体の未完了クエスト数（1団体10件まで）
  useEffect(() => {
    if (!isOpen || !f.organization_id) { setCounts(null); return; }
    let cancelled = false;
    fetch(`/api/organizations/${f.organization_id}/open-quests`)
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (!cancelled && d) setCounts({ pending: d.pending, approved: d.approved, limit: d.limit }); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [isOpen, f.organization_id]);

  if (!isOpen) return null;

  function selectOrg(id: string, list: MyOrg[] = myOrgs) {
    const org = list.find(o => o.id === id);
    setF(prev => ({
      ...prev,
      organization_id: id,
      // 初期値は団体長（または運営）が登録した団体情報。本人が書き換えていたら上書きしない
      org_intro: !touched.current.intro ? (org?.description ?? '') : prev.org_intro,
      preferred_contact: !touched.current.contact ? (org?.public_contact ?? '') : prev.preferred_contact,
    }));
  }

  const openTotal = counts ? counts.pending + counts.approved : 0;
  const atLimit = counts ? openTotal >= counts.limit : false;
  const today = todayJst();
  const firstDate = [...f.sessions].map(s => s.date).filter(Boolean).sort()[0] ?? '';

  /* 日程・当日の流れの行操作 */
  const setSession = (i: number, key: keyof QuestSession, v: string) =>
    set('sessions', f.sessions.map((s, j) => (j === i ? { ...s, [key]: v } : s)));
  const setFlow = (i: number, key: keyof ScheduleRow, v: string) =>
    set('schedule', f.schedule.map((r, j) => (j === i ? { ...r, [key]: v } : r)));

  // 分野の選択。選んだ順に並べる（1つ目が主な分野）
  const toggleField = (label: string) => set('fields',
    f.fields.includes(label) ? f.fields.filter(v => v !== label)
      : f.fields.length < MAX_QUEST_FIELDS ? [...f.fields, label] : f.fields);
  const addTag = () => { const t = customTag.trim(); if (t && !f.tags.includes(t)) { set('tags', [...f.tags, t]); setCustomTag(''); } };
  const togglePreset = (t: string) => set('tags', f.tags.includes(t) ? f.tags.filter(x => x !== t) : [...f.tags, t]);

  /* 九大メールアドレスを問い合わせ先に入れる（確実に連絡がつくので推奨） */
  const addKyudaiEmail = () => {
    if (!member.email) return;
    touched.current.contact = true;
    const cur = f.preferred_contact.trim();
    if (cur.includes(member.email)) return;
    set('preferred_contact', cur ? `${cur}\n${member.email}` : member.email);
  };

  /* 写真: ブラウザで縮小してから Supabase Storage に直接送る（Vercel を経由しない） */
  const onPickPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setPhotoBusy(true); setPhotoError(null);
    try {
      const blob = await resizeToJpeg(file);
      const path = `${member.id}/${crypto.randomUUID()}.jpg`;
      const { error: upErr } = await supabase.storage.from('quest-photos').upload(path, blob, { contentType: 'image/jpeg', upsert: false });
      if (upErr) throw new Error('写真のアップロードに失敗しました。');
      if (photoPath) await supabase.storage.from('quest-photos').remove([photoPath]);
      setPhotoPath(path);
    } catch (err: any) {
      setPhotoError(err.message ?? '写真の処理に失敗しました。');
    } finally {
      setPhotoBusy(false);
    }
  };
  const removePhoto = async () => {
    if (photoPath) await supabase.storage.from('quest-photos').remove([photoPath]);
    setPhotoPath(null);
  };

  // 閉じても書きかけは消さない（下書きとして残し、次に開いたときに復元する）。
  // 自動保存の待ち時間中に閉じた分を取りこぼさないよう、ここでも保存する
  const handleClose = () => {
    if (step === 'form' && !member.isVisitor) {
      if (hasContent(f, photoPath)) writeDraft<Draft>(DRAFT_NAME, member.id, { f, photoPath, touched: touched.current });
      else removeDraft(DRAFT_NAME, member.id);
    }
    onClose();
  };

  // 下書きを捨てて、空の依頼書から書き直す。使わなくなった写真も消す
  const discardDraft = () => {
    if (!confirm('書きかけの内容を消して、最初から書き直しますか？')) return;
    if (photoPath) supabase.storage.from('quest-photos').remove([photoPath]).catch(() => {});
    removeDraft(DRAFT_NAME, member.id);
    touched.current = { intro: false, contact: false };
    setF(emptyForm());
    setPhotoPath(null); setError(null); setRestored(false);
    // 所属が1つだけなら、団体と団体情報を入れ直す
    if (myOrgs.length === 1) selectOrg(myOrgs[0].id);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { ...f, max_applicants: f.max_applicants.trim() === '' ? null : Number(f.max_applicants), photo_path: photoPath };
    // サーバーと同じ関数で先に確認し、送る前に分かる間違いはここで止める
    const checked = validateQuestInput(payload, { userId: member.id });
    if (!checked.ok) { setError(checked.error); return; }
    setLoading(true); setError(null);
    try {
      await createQuest(checked.value);
      removeDraft(DRAFT_NAME, member.id);
      onClose();
    } catch (err: any) {
      setError(err.message || 'クエストの申請に失敗しました。');
    } finally {
      setLoading(false);
    }
  };

  const overlay: React.CSSProperties = { position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', background: 'rgba(15,10,5,0.4)', backdropFilter: 'blur(4px)' };
  const panel: React.CSSProperties = { position: 'relative', width: '100%', maxWidth: 640, maxHeight: '92dvh', overflowY: 'auto', overscrollBehavior: 'contain', borderRadius: '1.25rem', background: 'var(--bg-card)', border: '1px solid var(--color-border)', boxShadow: '0 12px 40px rgba(31,20,15,0.12)' };
  const stickyHeader: React.CSSProperties = { position: 'sticky', top: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.5rem', borderBottom: '1px solid var(--color-border)', background: 'var(--bg-card)', zIndex: 10 };
  const photoSrc = photoUrl(photoPath);

  return (
    <div className="cq-overlay" style={overlay}>
      <style>{MODAL_STYLES}</style>
      <motion.div className="cq-panel" initial={{ opacity: 0, scale: 0.96, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }} transition={{ duration: 0.2 }} style={panel}>
        <div style={stickyHeader}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)' }}>
            {step === 'guidelines' ? 'クエストを出す前に' : 'クエスト依頼書'}
          </h2>
          <button onClick={handleClose} aria-label="閉じる" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 40, height: 40, margin: '-0.5rem -0.625rem -0.5rem 0', borderRadius: '0.5rem', cursor: 'pointer', color: 'var(--color-text-tertiary)', background: 'none', border: 'none' }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: '1.5rem' }}>
          {error && step === 'guidelines' && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', padding: '0.75rem 1rem', borderRadius: '0.75rem', marginBottom: '1rem', fontSize: '0.875rem', fontWeight: 500, background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626' }}>
              <AlertCircle size={14} style={{ marginTop: 2, flexShrink: 0 }} /><p>{error}</p>
            </div>
          )}

          {step === 'guidelines' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-primary)' }}>
                <FileText size={16} /><span style={{ fontSize: '0.875rem', fontWeight: 600 }}>はじめにご確認ください</span>
              </div>
              <div style={{ borderRadius: '0.75rem', padding: '1rem 1.125rem', maxHeight: '48dvh', overflowY: 'auto', overscrollBehavior: 'contain', background: 'var(--bg-base)', border: '1px solid var(--color-border)' }}>
                <Guidelines />
              </div>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.75rem', borderRadius: '0.75rem', cursor: 'pointer', background: 'var(--bg-secondary)', border: '1px solid var(--color-border)' }}>
                <input type="checkbox" checked={guidelinesAccepted} onChange={e => setGuidelinesAccepted(e.target.checked)} style={{ width: 16, height: 16, marginTop: 2, accentColor: 'var(--color-primary)', cursor: 'pointer' }} />
                <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-text-primary)' }}>上記を確認し、同意します。</span>
              </label>
              <button onClick={() => setStep('form')} disabled={!guidelinesAccepted}
                style={{ width: '100%', padding: '0.875rem', borderRadius: '0.75rem', fontSize: '0.875rem', fontWeight: 600, cursor: guidelinesAccepted ? 'pointer' : 'not-allowed', opacity: guidelinesAccepted ? 1 : 0.4, background: 'var(--bg-dark)', color: 'var(--color-text-inverse)', border: 'none' }}
              >同意して依頼書を書く</button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '1.125rem' }}>

              {/* 下書きの案内 */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap', padding: '0.625rem 0.875rem', borderRadius: '0.75rem', background: restored ? '#f2f7f4' : 'var(--bg-base)', border: `1px solid ${restored ? '#cfe3d8' : 'var(--color-border)'}` }}>
                <span style={{ flex: '1 1 200px', fontSize: '0.75rem', lineHeight: 1.6, color: restored ? 'var(--color-primary)' : 'var(--color-text-tertiary)', fontWeight: restored ? 600 : 400 }}>
                  {restored
                    ? '前回の書きかけを復元しました。'
                    : '書いた内容はこの端末に自動で保存されます。途中で閉じても、次に開いたときに続きから書けます。'}
                </span>
                {(restored || hasContent(f, photoPath)) && (
                  <button type="button" onClick={discardDraft} style={smallBtn}>最初から書き直す</button>
                )}
              </div>

              {/* ── 主催団体 ── */}
              <div>
                <label style={labelS}><Building2 size={13} style={{ display: 'inline', marginRight: 4 }} />主催団体 {req}</label>
                {!orgsLoaded ? (
                  <p style={hintS}>読み込み中...</p>
                ) : myOrgs.length === 0 ? (
                  <div style={{ padding: '0.875rem 1rem', borderRadius: '0.75rem', background: '#fef2f2', border: '1px solid #fecaca' }}>
                    <p style={{ fontSize: '0.8125rem', lineHeight: 1.7, color: '#b91c1c' }}>
                      <b>団体への所属が登録されていないため、クエストを出せません。</b><br />
                      クエストは団体として出すものです。団体長か運営に、あなたのアカウント（ログインしたメールアドレス）を団体に追加してもらってください。
                    </p>
                    <button type="button" onClick={() => { handleClose(); router.push('/profile'); }} style={{ ...smallBtn, marginTop: '0.625rem' }}>
                      プロフィールで所属を確認する
                    </button>
                  </div>
                ) : (
                  <>
                    <select value={f.organization_id} onChange={e => selectOrg(e.target.value)} style={iStyle} onFocus={focusI} onBlur={blurI}>
                      <option value="">選んでください</option>
                      {myOrgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                    </select>
                    {counts && (
                      <p style={{ ...hintS, fontWeight: 600, color: atLimit ? '#dc2626' : 'var(--color-text-secondary)' }}>
                        この団体の未完了のクエスト: {openTotal} / {counts.limit}件（掲示中 {counts.approved}・審査中 {counts.pending}）
                        {atLimit && ' — 上限に達しているため、新しく出せません'}
                      </p>
                    )}
                  </>
                )}
                <div style={{ padding: '0.625rem 0.875rem', borderRadius: '0.625rem', marginTop: '0.625rem', background: '#fffbeb', border: '1px solid #fde68a', fontSize: '0.75rem', lineHeight: 1.7, color: '#92400e' }}>
                  クエストは<b>団体として</b>掲載するものです。団体のメンバーが個人的に人を集めるための依頼は掲載できません。
                  同じ団体から似た内容のクエストが重複しないよう、申請前に団体内でご相談ください。
                  <b>1団体につき、未完了のクエストは最大{MAX_OPEN_QUESTS_PER_ORG}件まで</b>です。
                </div>
              </div>

              {/* ── 掲載の形式 ── */}
              <SectionTitle icon={Calendar}>掲載の形式 {req}</SectionTitle>
              <div role="radiogroup" aria-label="掲載の形式" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.5rem' }}>
                {([
                  { ongoing: false, icon: Calendar, title: '日程のあるクエスト', text: '開催日がある体験です。申込の締切の日まで掲示板に掲載します。日程や場所が未定でも申請できます。' },
                  { ongoing: true, icon: Repeat, title: '常設クエスト', text: '期限を決めずに、継続して参加者を募集します（例: 毎週のポッドキャストのゲスト）。掲示板の「常設クエスト」の枠に掲載します。' },
                ] as const).map(o => {
                  const on = f.is_ongoing === o.ongoing;
                  const Icon = o.icon;
                  return (
                    <button key={o.title} type="button" role="radio" aria-checked={on} onClick={() => set('is_ongoing', o.ongoing)}
                      style={{ textAlign: 'left', padding: '0.75rem 0.875rem', borderRadius: '0.75rem', cursor: 'pointer',
                        background: on ? '#f2f7f4' : 'var(--bg-card)', border: `${on ? 2 : 1}px solid ${on ? 'var(--color-primary)' : 'var(--color-border)'}` }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.875rem', fontWeight: 700, color: on ? 'var(--color-primary)' : 'var(--color-text-primary)' }}>
                        <Icon size={14} />{o.title}
                      </span>
                      <span style={{ display: 'block', marginTop: '0.25rem', fontSize: '0.75rem', lineHeight: 1.6, color: 'var(--color-text-secondary)' }}>{o.text}</span>
                    </button>
                  );
                })}
              </div>

              {/* ── クエストの内容 ── */}
              <SectionTitle icon={FileText}>クエストの内容</SectionTitle>
              <div>
                <label style={labelS}>クエスト名 {req}</label>
                <input type="text" value={f.title} onChange={e => set('title', e.target.value)} maxLength={100}
                  placeholder="例: 和太鼓を1日だけ叩いてみよう" style={iStyle} onFocus={focusI} onBlur={blurI} />
                <p style={hintS}>九大生が見て、何をするか分かる短い名前にしてください。</p>
              </div>
              <div>
                <label style={labelS}>分野 {req}<span style={{ fontWeight: 400, fontSize: '0.75rem', color: 'var(--color-text-tertiary)', marginLeft: '0.375rem' }}>（{MAX_QUEST_FIELDS}つまで・{f.fields.length}/{MAX_QUEST_FIELDS}）</span></label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
                  {QUEST_TYPES.map(t => {
                    const on = f.fields.includes(t.label);
                    const full = !on && f.fields.length >= MAX_QUEST_FIELDS;
                    const c = questTypeStyle(t.label);
                    return (
                      <button key={t.label} type="button" onClick={() => toggleField(t.label)} disabled={full} aria-pressed={on}
                        style={{ fontSize: '0.8125rem', padding: '0.375rem 0.75rem', minHeight: 36, borderRadius: '9999px', cursor: full ? 'not-allowed' : 'pointer', fontWeight: on ? 700 : 500, opacity: full ? 0.4 : 1,
                          background: on ? c.color : 'var(--bg-card)', color: on ? '#fff' : 'var(--color-text-secondary)', border: `1px solid ${on ? c.color : 'var(--color-border)'}` }}
                      >{on ? '✓ ' : ''}{t.label}</button>
                    );
                  })}
                </div>
                {f.fields.length > 0 && (
                  <p style={{ ...hintS, marginTop: '0.5rem' }}>
                    {f.fields.map(label => `${label}：${QUEST_TYPES.find(t => t.label === label)?.examples ?? ''}`).join(' ／ ')}
                  </p>
                )}
                <p style={hintS}>当てはまる分野を選択してください（1つ目が主な分野として表示されます）。九大生は、興味のある分野の新着情報をLINEで受け取ることができます。</p>
              </div>
              <div>
                <label style={labelS}>当日の流れ <span style={recommend}>推奨</span></label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                  {f.schedule.map((r, i) => (
                    <div key={i} className="cq-flow">
                      <input type="time" value={r.time} onChange={e => setFlow(i, 'time', e.target.value)} style={iStyle} onFocus={focusI} onBlur={blurI} aria-label="時刻" />
                      <input type="text" value={r.content} onChange={e => setFlow(i, 'content', e.target.value)} maxLength={300} placeholder="例: 集合・自己紹介" style={iStyle} onFocus={focusI} onBlur={blurI} aria-label="内容" />
                      <button type="button" onClick={() => set('schedule', f.schedule.filter((_, j) => j !== i))} disabled={f.schedule.length <= 1}
                        aria-label="この行を削除" style={{ padding: '0.375rem', background: 'none', border: 'none', cursor: f.schedule.length <= 1 ? 'default' : 'pointer', color: 'var(--color-text-tertiary)', opacity: f.schedule.length <= 1 ? 0.3 : 1 }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
                <button type="button" onClick={() => set('schedule', [...f.schedule, { time: '', content: '' }])} style={{ ...smallBtn, marginTop: '0.5rem' }}>
                  <Plus size={12} />行を追加
                </button>
                <p style={hintS}>当日の活動内容が、順を追って分かるように記入してください。時刻が未定の場合は、内容だけでも構いません。</p>
              </div>
              <div>
                <label style={labelS}>この活動で体験してほしいこと（任意）</label>
                <textarea value={f.appeal} onChange={e => set('appeal', e.target.value)} maxLength={600} placeholder="2〜3行で" style={{ ...iStyle, minHeight: 72, resize: 'vertical', lineHeight: 1.7 }} onFocus={focusI} onBlur={blurI} />
              </div>
              <div>
                <label style={labelS}>補足（任意）</label>
                <textarea value={f.description} onChange={e => set('description', e.target.value)} maxLength={4000} placeholder="上の項目に書ききれないことがあれば" style={{ ...iStyle, minHeight: 72, resize: 'vertical', lineHeight: 1.7 }} onFocus={focusI} onBlur={blurI} />
              </div>
              <div>
                <label style={labelS}><Tag size={13} style={{ display: 'inline', marginRight: 4 }} />タグ（任意）</label>
                <p style={{ ...hintS, marginTop: 0, marginBottom: '0.5rem' }}>参加する人が気にする点を選べます。当てはまるものがなければ、自由に追加できます。</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', marginBottom: '0.625rem' }}>
                  {PRESET_TAGS.map(tag => (
                    <button key={tag} type="button" onClick={() => togglePreset(tag)}
                      style={{ fontSize: '0.75rem', padding: '0.25rem 0.75rem', borderRadius: '9999px', border: '1px solid', cursor: 'pointer', fontWeight: 500, background: f.tags.includes(tag) ? 'var(--bg-dark)' : 'var(--bg-card)', color: f.tags.includes(tag) ? 'var(--color-text-inverse)' : 'var(--color-text-secondary)', borderColor: f.tags.includes(tag) ? 'var(--bg-dark)' : 'var(--color-border)' }}
                    >{tag}</button>
                  ))}
                  {f.tags.filter(t => !PRESET_TAGS.includes(t)).map(tag => (
                    <button key={tag} type="button" onClick={() => togglePreset(tag)}
                      style={{ fontSize: '0.75rem', padding: '0.25rem 0.75rem', borderRadius: '9999px', cursor: 'pointer', fontWeight: 500, background: 'var(--bg-dark)', color: 'var(--color-text-inverse)', border: '1px solid var(--bg-dark)' }}
                    >{tag} ×</button>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input type="text" value={customTag} onChange={e => setCustomTag(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (isSubmitEnter(e)) addTag(); } }} maxLength={30} placeholder="例: 雨天決行" style={{ ...iStyle, flex: 1 }} onFocus={focusI} onBlur={blurI} />
                  <button type="button" onClick={addTag} style={{ padding: '0.625rem 1rem', fontSize: '0.875rem', fontWeight: 600, borderRadius: '0.75rem', cursor: 'pointer', background: 'var(--bg-secondary)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}>追加</button>
                </div>
              </div>

              {/* ── 日時・場所 ── */}
              <SectionTitle icon={Calendar}>日時・場所</SectionTitle>
              {f.is_ongoing ? (
                <div>
                  <label style={labelS}>活動の頻度・日時の目安 <span style={recommend}>推奨</span></label>
                  <input type="text" value={f.schedule_note} onChange={e => set('schedule_note', e.target.value)} maxLength={300} placeholder="例: 毎週水曜 19:00〜20:00 に収録" style={iStyle} onFocus={focusI} onBlur={blurI} />
                  <p style={hintS}>常設クエストは日程を1つに決めずに掲載します。参加する日は、応募後にトークで調整してください。</p>
                </div>
              ) : (
                <div>
                  <label style={labelS}>日程 <span style={recommend}>推奨</span></label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                  {f.sessions.map((s, i) => (
                    <div key={i} className="cq-session">
                      <input type="date" value={s.date} min={today} onChange={e => setSession(i, 'date', e.target.value)} style={iStyle} onFocus={focusI} onBlur={blurI} aria-label="日付" />
                      <input type="time" value={s.start} onChange={e => setSession(i, 'start', e.target.value)} style={iStyle} onFocus={focusI} onBlur={blurI} aria-label="開始時刻" />
                      <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-tertiary)' }}>〜</span>
                      <input type="time" value={s.end} onChange={e => setSession(i, 'end', e.target.value)} style={iStyle} onFocus={focusI} onBlur={blurI} aria-label="終了時刻" />
                      <button type="button" onClick={() => set('sessions', f.sessions.filter((_, j) => j !== i))} disabled={f.sessions.length <= 1}
                        aria-label="この日程を削除" style={{ padding: '0.375rem', background: 'none', border: 'none', cursor: f.sessions.length <= 1 ? 'default' : 'pointer', color: 'var(--color-text-tertiary)', opacity: f.sessions.length <= 1 ? 0.3 : 1 }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
                <button type="button" onClick={() => set('sessions', [...f.sessions, { date: '', start: '', end: '' }])} style={{ ...smallBtn, marginTop: '0.5rem' }}>
                  <Plus size={12} />日程を追加（複数回のクエスト）
                </button>
                  <p style={hintS}>日付・開始・終了をすべて入れてください。<b>決まっていない場合は空欄のままで構いません</b>（掲示板には「未定（応募後にトークで調整）」と表示されます）。</p>
                  <label style={{ ...labelS, fontSize: '0.8125rem', marginTop: '0.75rem' }}>日程についての補足（任意）</label>
                  <input type="text" value={f.schedule_note} onChange={e => set('schedule_note', e.target.value)} maxLength={300} placeholder="例: 10月中の平日夕方を予定" style={iStyle} onFocus={focusI} onBlur={blurI} />
                </div>
              )}
              <div>
                <label style={labelS}>場所・集合場所 <span style={recommend}>推奨</span></label>
                <input type="text" value={f.location} onChange={e => set('location', e.target.value)} maxLength={300} placeholder="例: 伊都キャンパス センター2号館前に集合" style={iStyle} onFocus={focusI} onBlur={blurI} />
                <p style={hintS}>未定の場合は空欄で構いません（「未定」と表示されます）。</p>
              </div>
              {f.is_ongoing ? (
                <div style={{ padding: '0.625rem 0.875rem', borderRadius: '0.625rem', fontSize: '0.75rem', lineHeight: 1.7, background: 'var(--bg-base)', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}>
                  <b>常設クエストには申込の締切・定員がありません。</b>募集を終えるときは、マイクエストから「募集を終了する」を押してください。
                </div>
              ) : (
                <div>
                  <label style={labelS}><Clock size={13} style={{ display: 'inline', marginRight: 4 }} />申込の締切 {req}</label>
                  <input type="date" value={f.listing_end_date} min={today} max={firstDate || undefined} onChange={e => set('listing_end_date', e.target.value)} style={iStyle} onFocus={focusI} onBlur={blurI} />
                  <p style={hintS}>この日まで掲示板に掲載します。日程がある場合は、最初の日程の日付以前にしてください。日程が未定でも、掲載を終える日を決めてください。</p>
                </div>
              )}

              {/* ── 参加について ── */}
              <SectionTitle icon={Users}>参加について</SectionTitle>
              <div className="cq-grid-2">
                {!f.is_ongoing && (
                  <div>
                    <label style={labelS}>定員（任意）</label>
                    <input type="number" min={1} max={500} value={f.max_applicants} onChange={e => set('max_applicants', e.target.value)} placeholder="空欄なら上限なし" style={iStyle} onFocus={focusI} onBlur={blurI} />
                    <p style={hintS}>承認した人数でカウントします。見送った応募は定員枠を消費しません。空欄の場合は上限なしになります。</p>
                  </div>
                )}
                <div>
                  <label style={labelS}>参加費 {req}</label>
                  <input type="text" value={f.participation_fee} onChange={e => set('participation_fee', e.target.value)} maxLength={200} style={iStyle} onFocus={focusI} onBlur={blurI} />
                  <p style={hintS}>かからない場合は「無料」。必要経費の範囲で。</p>
                </div>
              </div>
              <div>
                <label style={labelS}>持ち物・服装 {req}</label>
                <input type="text" value={f.belongings} onChange={e => set('belongings', e.target.value)} maxLength={300} style={iStyle} onFocus={focusI} onBlur={blurI} />
                <p style={hintS}>無い場合は「手ぶらで可」。</p>
              </div>
              <div>
                <label style={labelS}>参加条件 {req}</label>
                <input type="text" value={f.requirements} onChange={e => set('requirements', e.target.value)} maxLength={300} style={iStyle} onFocus={focusI} onBlur={blurI} />
                <p style={hintS}>無い場合は「誰でも」。限る場合は、活動の内容から理由が説明できる範囲でお願いします。</p>
              </div>

              {/* ── 主催団体について（掲示する） ── */}
              <SectionTitle icon={Building2} note="九大生に掲示されます。初期値は団体の登録情報です（団体長が編集できます）。">
                主催団体について
              </SectionTitle>
              <div>
                <label style={labelS}>団体の紹介 {req}</label>
                <textarea value={f.org_intro} onChange={e => { touched.current.intro = true; set('org_intro', e.target.value); }} maxLength={500}
                  placeholder="1〜2文で。団体を知らない九大生に伝わるように" style={{ ...iStyle, minHeight: 64, resize: 'vertical', lineHeight: 1.7 }} onFocus={focusI} onBlur={blurI} />
              </div>
              <div>
                <label style={labelS}>九大生からの問い合わせ先 {req}</label>
                <textarea value={f.preferred_contact} onChange={e => { touched.current.contact = true; set('preferred_contact', e.target.value); }} maxLength={300}
                  placeholder="例: 公式LINE、Instagram（@xxx）など" style={{ ...iStyle, minHeight: 56, resize: 'vertical', lineHeight: 1.7 }} onFocus={focusI} onBlur={blurI} />
                {member.email && !f.preferred_contact.includes(member.email) && (
                  <button type="button" onClick={addKyudaiEmail} style={{ ...smallBtn, marginTop: '0.5rem' }}>
                    <Mail size={12} />自分の九大メールアドレスを入れる（おすすめ）
                  </button>
                )}
                <p style={hintS}>公開されます。九大メールアドレスは確実に連絡が取れるため、併記することをおすすめします。</p>
              </div>

              {/* ── 当日の受け入れ担当者（掲示しない） ── */}
              <SectionTitle icon={Lock} note="公開されません。運営と、主催団体のメンバーのみが閲覧できます。">
                当日の受け入れ担当者
              </SectionTitle>
              <div className="cq-grid-2">
                <div>
                  <label style={labelS}>お名前 {req}</label>
                  <input type="text" value={f.receiver_name} onChange={e => set('receiver_name', e.target.value)} maxLength={100} style={iStyle} onFocus={focusI} onBlur={blurI} />
                </div>
                <div>
                  <label style={labelS}>当日つながる連絡先 {req}</label>
                  <input type="text" value={f.receiver_contact} onChange={e => set('receiver_contact', e.target.value)} maxLength={200} placeholder="電話番号など" style={iStyle} onFocus={focusI} onBlur={blurI} />
                </div>
              </div>

              {/* ── 写真（任意） ── */}
              <SectionTitle icon={ImagePlus} note="掲示に使います。運営の確認を経てから公開されます。他の方の写真を無断で使わないでください。">
                写真（任意）
              </SectionTitle>
              <div>
                <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={onPickPhoto} style={{ display: 'none' }} />
                {photoSrc ? (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photoSrc} alt="選んだ写真" style={{ width: 140, height: 96, objectFit: 'cover', borderRadius: '0.625rem', border: '1px solid var(--color-border)' }} />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                      <button type="button" onClick={() => fileRef.current?.click()} disabled={photoBusy} style={smallBtn}>選び直す</button>
                      <button type="button" onClick={removePhoto} disabled={photoBusy} style={{ ...smallBtn, color: '#dc2626', borderColor: '#fecaca' }}>削除</button>
                    </div>
                  </div>
                ) : (
                  <button type="button" onClick={() => fileRef.current?.click()} disabled={photoBusy} style={smallBtn}>
                    <ImagePlus size={12} />{photoBusy ? '処理中...' : '写真を選ぶ'}
                  </button>
                )}
                {photoError && <p style={{ ...hintS, color: '#dc2626' }}>{photoError}</p>}
              </div>

              {/* ── 確認 ── */}
              <SectionTitle icon={FileText}>確認 {req}</SectionTitle>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                {CONFIRMATIONS.map((text, i) => (
                  <label key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.625rem', padding: '0.625rem 0.75rem', borderRadius: '0.625rem', cursor: 'pointer', background: 'var(--bg-base)', border: '1px solid var(--color-border)' }}>
                    <input type="checkbox" checked={f.confirmations[i]} onChange={e => set('confirmations', f.confirmations.map((c, j) => (j === i ? e.target.checked : c)))}
                      style={{ width: 16, height: 16, marginTop: 2, accentColor: 'var(--color-primary)', cursor: 'pointer', flexShrink: 0 }} />
                    <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-primary)', lineHeight: 1.6 }}>{text}</span>
                  </label>
                ))}
              </div>

              {/* エラーは申請ボタンのすぐ上に出す。長いフォームの一番上に出すと、
                  スマホでは押しても何も起きないように見える */}
              {error && (
                <div role="alert" style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', padding: '0.75rem 1rem', borderRadius: '0.75rem', fontSize: '0.875rem', fontWeight: 500, background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626' }}>
                  <AlertCircle size={14} style={{ marginTop: 2, flexShrink: 0 }} /><p>{error}</p>
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.75rem', paddingTop: '0.5rem' }}>
                <button type="button" onClick={() => setStep('guidelines')}
                  style={{ flex: '0 0 auto', whiteSpace: 'nowrap', padding: '0.875rem 1rem', borderRadius: '0.75rem', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', background: 'var(--bg-secondary)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}
                >注意事項に戻る</button>
                <button type="submit" disabled={loading || photoBusy || myOrgs.length === 0 || atLimit}
                  style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.875rem', borderRadius: '0.75rem', fontSize: '0.875rem', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: (loading || myOrgs.length === 0 || atLimit) ? 0.5 : 1, background: 'var(--bg-dark)', color: 'var(--color-text-inverse)', border: 'none' }}
                ><Send size={15} />{loading ? '申請中...' : 'クエストを申請する'}</button>
              </div>
              <p style={{ fontSize: '0.75rem', textAlign: 'center', color: 'var(--color-text-tertiary)' }}>
                運営にて内容を確認後、結果をメールでお知らせいたします。
              </p>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
}
