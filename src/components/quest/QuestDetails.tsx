import React from 'react';
import { Calendar, MapPin, Users, Wallet, Backpack, UserCheck, Clock, Building2, MessageCircle, Lock, Sparkles } from 'lucide-react';
import { fmtSession, fmtDateJa, sortSessions, photoUrl, type QuestSession, type ScheduleRow } from '@/lib/quest-form';

/**
 * クエスト依頼書の内容を表示する部品。
 * 掲示板の詳細（九大生向け）と、運営の審査画面の両方で使う。
 *
 * 旧形式のクエスト（日程などが無いもの）でも崩れないよう、
 * 値の無い項目は行ごと出さない。
 */

export type QuestDetailData = {
  title: string;
  description?: string | null;
  tags?: string[] | null;
  max_applicants: number;
  accepted_count?: number;
  listing_end_date?: string | null;
  organization_name?: string | null;
  organization?: { name: string } | null;
  sessions?: QuestSession[] | null;
  location?: string | null;
  participation_fee?: string | null;
  belongings?: string | null;
  schedule?: ScheduleRow[] | null;
  requirements?: string | null;
  org_intro?: string | null;
  appeal?: string | null;
  photo_path?: string | null;
  preferred_contact?: string | null;
};

const rowLabel: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-tertiary)', marginBottom: '0.25rem' };
const rowValue: React.CSSProperties = { fontSize: '0.875rem', lineHeight: 1.7, color: 'var(--color-text-primary)', whiteSpace: 'pre-wrap', wordBreak: 'break-word' };
const box: React.CSSProperties = { padding: '0.875rem 1rem', borderRadius: '0.75rem', background: 'var(--bg-base)', border: '1px solid var(--color-border)' };

/**
 * URL とメールアドレスだけをリンクにする。
 * 依頼者が書いた文字列を HTML として解釈はしない（React が自動でエスケープする）。
 */
function Linkify({ text }: { text: string }) {
  const parts = text.split(/(https?:\/\/[^\s]+|[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/g);
  return (
    <>
      {parts.map((p, i) => {
        if (/^https?:\/\//.test(p)) {
          return <a key={i} href={p} target="_blank" rel="noopener noreferrer nofollow" style={{ color: 'var(--color-primary)', textDecoration: 'underline' }}>{p}</a>;
        }
        if (/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(p)) {
          return <a key={i} href={`mailto:${p}`} style={{ color: 'var(--color-primary)', textDecoration: 'underline' }}>{p}</a>;
        }
        return <React.Fragment key={i}>{p}</React.Fragment>;
      })}
    </>
  );
}

function Row({ icon: Icon, label, children }: { icon: React.ElementType; label: string; children: React.ReactNode }) {
  return (
    <div>
      <p style={rowLabel}><Icon size={12} />{label}</p>
      <div style={rowValue}>{children}</div>
    </div>
  );
}

export default function QuestDetails({
  quest,
  privateDetails,
  contactPreviewForCreator = false,
}: {
  quest: QuestDetailData;
  /** 当日の受け入れ担当者。運営と掲示した本人の画面でだけ渡す */
  privateDetails?: { receiver_name: string; receiver_contact: string } | null;
  /** 掲示した本人が見ているとき、問い合わせ先に「応募者にはこう表示されます」と添える */
  contactPreviewForCreator?: boolean;
}) {
  const sessions = sortSessions(Array.isArray(quest.sessions) ? quest.sessions : []);
  const schedule = Array.isArray(quest.schedule) ? quest.schedule : [];
  const orgName = quest.organization_name ?? quest.organization?.name ?? null;
  const photo = photoUrl(quest.photo_path);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {photo && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photo} alt={quest.title} loading="lazy"
          style={{ width: '100%', maxHeight: 280, objectFit: 'cover', borderRadius: '0.875rem', border: '1px solid var(--color-border)' }} />
      )}

      {sessions.length > 0 && (
        <Row icon={Calendar} label={sessions.length > 1 ? `日程（全${sessions.length}回）` : '日時'}>
          {sessions.map((s, i) => <div key={i}>{fmtSession(s)}</div>)}
        </Row>
      )}

      {quest.location && <Row icon={MapPin} label="場所・集合場所">{quest.location}</Row>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.875rem' }}>
        <Row icon={Users} label="定員">
          {typeof quest.accepted_count === 'number' ? `${quest.accepted_count} / ${quest.max_applicants}人` : `${quest.max_applicants}人`}
        </Row>
        {quest.participation_fee && <Row icon={Wallet} label="参加費">{quest.participation_fee}</Row>}
        {quest.listing_end_date && <Row icon={Clock} label="申込の締切">{fmtDateJa(quest.listing_end_date)}まで</Row>}
      </div>

      {quest.belongings && <Row icon={Backpack} label="持ち物・服装">{quest.belongings}</Row>}
      {quest.requirements && <Row icon={UserCheck} label="参加条件">{quest.requirements}</Row>}

      {schedule.length > 0 && (
        <div>
          <p style={rowLabel}><Clock size={12} />当日の流れ</p>
          <div style={{ ...box, padding: '0.5rem 0.875rem' }}>
            {schedule.map((r, i) => (
              <div key={i} style={{ display: 'flex', gap: '0.875rem', padding: '0.375rem 0', borderTop: i === 0 ? 'none' : '1px solid var(--color-border)' }}>
                <span style={{ flexShrink: 0, width: '3.25rem', fontSize: '0.8125rem', fontWeight: 700, color: 'var(--color-primary)', fontVariantNumeric: 'tabular-nums' }}>{r.time}</span>
                <span style={{ fontSize: '0.875rem', lineHeight: 1.6, color: 'var(--color-text-primary)', wordBreak: 'break-word' }}>{r.content}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {quest.appeal && <Row icon={Sparkles} label="この活動で体験してほしいこと">{quest.appeal}</Row>}

      {quest.description && (
        <div style={box}>
          <p style={{ fontSize: '0.875rem', lineHeight: 1.7, whiteSpace: 'pre-wrap', color: 'var(--color-text-secondary)', wordBreak: 'break-word' }}>{quest.description}</p>
        </div>
      )}

      {quest.tags && quest.tags.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
          {quest.tags.map(tag => (
            <span key={tag} style={{ fontSize: '0.75rem', padding: '0.25rem 0.625rem', borderRadius: '9999px', fontWeight: 500, color: 'var(--color-text-secondary)', background: 'var(--bg-secondary)', border: '1px solid var(--color-border)' }}>#{tag}</span>
          ))}
        </div>
      )}

      {/* 主催団体について（項目5） */}
      {(orgName || quest.org_intro || quest.preferred_contact) && (
        <div style={{ ...box, background: 'var(--bg-card)' }}>
          <p style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8125rem', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '0.5rem' }}>
            <Building2 size={13} style={{ color: 'var(--color-accent)' }} />主催団体について
          </p>
          {orgName && <p style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--color-primary)', marginBottom: '0.25rem' }}>{orgName}</p>}
          {quest.org_intro && <p style={{ ...rowValue, color: 'var(--color-text-secondary)' }}>{quest.org_intro}</p>}
          {quest.preferred_contact && (
            <div style={{ marginTop: '0.75rem', paddingTop: '0.625rem', borderTop: '1px solid var(--color-border)' }}>
              <p style={rowLabel}><MessageCircle size={12} />問い合わせ先</p>
              <div style={rowValue}><Linkify text={quest.preferred_contact} /></div>
              {contactPreviewForCreator && (
                <p style={{ fontSize: '0.6875rem', color: 'var(--color-text-tertiary)', marginTop: '0.25rem' }}>
                  ※ 応募者にはこのように表示されます
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* 当日の受け入れ担当者（掲示しない） */}
      {privateDetails && (
        <div style={{ ...box, background: 'var(--notice-warn-bg)', border: '1px solid var(--notice-warn-border)' }}>
          <p style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--notice-warn-title)', marginBottom: '0.375rem' }}>
            <Lock size={12} />当日の受け入れ担当者（掲示していません）
          </p>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-primary)' }}>{privateDetails.receiver_name}</p>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-primary)', wordBreak: 'break-word' }}>{privateDetails.receiver_contact}</p>
        </div>
      )}
    </div>
  );
}
