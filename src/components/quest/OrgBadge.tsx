import { Building2, UserRound } from 'lucide-react';

// 「どの団体からの依頼か」を示すピル。
//   掲示板・管理画面の審査・マイクエストの3箇所で使い回す。
//
// name には quests.organization_name（申請時点のスナップショット）を渡す。
// 団体が改名・無効化されても、当時どう名乗ったかが残るようにするため。
//
// showPersonal:
//   管理画面では「団体未設定」と「個人として申請」を区別できないと審査できないので、
//   団体が無いときも『個人申請』と明示する。掲示板側では何も出さない。
export default function OrgBadge({
  name,
  showPersonal = false,
  inactive = false,
}: {
  name: string | null | undefined;
  showPersonal?: boolean;
  inactive?: boolean;
}) {
  const pill: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
    fontSize: '0.75rem', fontWeight: 600, padding: '0.1875rem 0.625rem',
    borderRadius: '9999px', border: '1px solid var(--color-border)',
    background: 'var(--bg-secondary)', whiteSpace: 'nowrap',
  };

  if (!name) {
    if (!showPersonal) return null;
    return (
      <span style={{ ...pill, color: 'var(--color-text-tertiary)' }}>
        <UserRound size={11} />個人申請
      </span>
    );
  }

  return (
    <span style={{ ...pill, color: 'var(--color-primary)' }} title={inactive ? '現在は無効化されている団体です' : undefined}>
      <Building2 size={11} />{name}{inactive && '（無効）'}
    </span>
  );
}
