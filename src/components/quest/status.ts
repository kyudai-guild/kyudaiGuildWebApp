import type { ElementType } from 'react';
import { Clock, CheckCircle2, XCircle } from 'lucide-react';

export type QuestStatusConfig = {
  label: string;
  color: string;
  bg: string;
  Icon: ElementType;
};

const APPROVED: QuestStatusConfig = { label: '承認済み', color: '#059669', bg: '#ecfdf5', Icon: CheckCircle2 };
const REJECTED: QuestStatusConfig = { label: 'リジェクト', color: '#dc2626', bg: '#fef2f2', Icon: XCircle };

// 管理画面（審査する側の視点）: pending は「審査待ち」
export const ADMIN_QUEST_STATUS: Record<string, QuestStatusConfig> = {
  pending:  { label: '審査待ち', color: '#d97706', bg: '#fffbeb', Icon: Clock },
  approved: APPROVED,
  rejected: REJECTED,
};

// マイクエスト（申請した側の視点）: pending は「審査中」、closed あり
export const MY_QUEST_STATUS: Record<string, QuestStatusConfig> = {
  pending:  { label: '審査中', color: '#d97706', bg: '#fffbeb', Icon: Clock },
  approved: APPROVED,
  rejected: REJECTED,
  closed:   { label: '終了', color: '#6b7280', bg: '#f9fafb', Icon: XCircle },
};
