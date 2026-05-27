const fs = require('fs');
let content = fs.readFileSync('src/components/quest/QuestBoard.tsx', 'utf8');

const replacement = `const ACHIEVEMENT_CATEGORIES: AchievementCategory[] = [
  { id: 'study', label: '勉強', emoji: '🎓', color: '#6366f1', count: 3, total: 5, details: [
      { id: 's1', label: '後輩への数学個別指導依頼を達成', date: '2024-10', type: '依頼' },
      { id: 's2', label: '微分積分学を履修・優', date: '2024-03', type: '授業' },
      { id: 's3', label: '線形代数学を履修・優', date: '2024-09', type: '授業' },
      { id: 's4', label: '統計学入門の家庭教師依頼（未達成）', type: '依頼' },
      { id: 's5', label: '数学オリンピック地方予選参加（未達成）', type: '大会' }]},
  { id: 'design', label: 'デザイン', emoji: '🎨', color: '#f97316', count: 2, total: 4, details: [
      { id: 'd1', label: 'ギルドロゴ制作依頼を達成', date: '2024-05', type: '依頼' },
      { id: 'd2', label: 'UIデザインコンテスト入賞', date: '2024-11', type: '大会' },
      { id: 'd3', label: 'サークルポスターデザイン依頼（未達成）', type: '依頼' },
      { id: 'd4', label: 'Figmaハンズオン参加（未達成）', type: 'その他' }]},
  { id: 'coding', label: 'コーディング', emoji: '💻', color: '#3b82f6', count: 3, total: 5, details: [
      { id: 'c1', label: 'Webサイトリニューアル依頼を達成', date: '2024-11', type: '依頼' },
      { id: 'c2', label: 'ハッカソン2024に参加・チーム賞獲得', date: '2024-09', type: '大会' },
      { id: 'c3', label: 'Webプログラミング基礎を履修', date: '2024-04', type: '授業' },
      { id: 'c4', label: 'モバイルアプリ開発依頼（未達成）', type: '依頼' },
      { id: 'c5', label: 'OSS貢献チャレンジ（未達成）', type: 'その他' }]},
  { id: 'proofreading', label: '添削', emoji: '📝', color: '#10b981', count: 2, total: 4, details: [
      { id: 'pr1', label: 'ES添削依頼を達成', date: '2024-10', type: '依頼' },
      { id: 'pr2', label: '英語レポートの添削依頼を達成', date: '2024-07', type: '依頼' },
      { id: 'pr3', label: '研究論文の文章校正依頼（未達成）', type: '依頼' },
      { id: 'pr4', label: '面接練習のフィードバック依頼（未達成）', type: '依頼' }]},
  { id: 'camera', label: 'カメラマン', emoji: '📷', color: '#ec4899', count: 2, total: 3, details: [
      { id: 'ca1', label: '集合写真撮影依頼を達成', date: '2024-09', type: '依頼' },
      { id: 'ca2', label: '新歓イベントの写真撮影依頼を達成', date: '2024-04', type: '依頼' },
      { id: 'ca3', label: '卒業式の個人撮影依頼（未達成）', type: '依頼' }]},
  { id: 'shopping', label: '買い物代行', emoji: '🛍️', color: '#f59e0b', count: 1, total: 2, details: [
      { id: 'sh1', label: '研究室備品の購入代行依頼を達成', date: '2024-06', type: '依頼' },
      { id: 'sh2', label: 'イベント用消耗品の調達依頼（未達成）', type: '依頼' }]},
  { id: 'transport', label: '運搬', emoji: '🚗', color: '#64748b', count: 1, total: 3, details: [
      { id: 'tr1', label: '荷物の運搬補助依頼を達成', date: '2024-03', type: '依頼' },
      { id: 'tr2', label: 'ゼミ合宿の荷物輸送依頼（未達成）', type: '依頼' },
      { id: 'tr3', label: 'イベント機材の搬入依頼（未達成）', type: '依頼' }]},
  { id: 'translation', label: '翻訳', emoji: '🌐', color: '#06b6d4', count: 1, total: 3, details: [
      { id: 'tl1', label: '案内文書の日英翻訳依頼を達成', date: '2024-08', type: '依頼' },
      { id: 'tl2', label: '研究論文の英訳依頼（未達成）', type: '依頼' },
      { id: 'tl3', label: '海外イベント向けチラシの翻訳（未達成）', type: '依頼' }]},
  { id: 'engineer', label: 'エンジニア', emoji: '⚙️', color: '#8b5cf6', count: 2, total: 4, details: [
      { id: 'en1', label: 'システム構築依頼を達成', date: '2024-07', type: '依頼' },
      { id: 'en2', label: 'ロボコン2024で準優勝', date: '2024-11', type: '大会' },
      { id: 'en3', label: '電子工作ワークショップ講師依頼（未達成）', type: '依頼' },
      { id: 'en4', label: '自動化スクリプト開発（未達成）', type: '依頼' }]},
  { id: 'device', label: 'デバイス', emoji: '🖥️', color: '#94a3b8', count: 2, total: 4, details: [
      { id: 'dv1', label: 'PCセットアップ依頼を達成', date: '2024-05', type: '依頼' },
      { id: 'dv2', label: 'プリンター修理依頼を達成', date: '2024-09', type: '依頼' },
      { id: 'dv3', label: 'スマホ移行依頼（未達成）', type: '依頼' },
      { id: 'dv4', label: 'ソフトウェアインストール支援（未達成）', type: 'その他' }]}
]`;

const startMarker = 'const ACHIEVEMENT_CATEGORIES: AchievementCategory[] = [';
const endMarker = '];\n\n/* ============================================================';

let startIndex = content.indexOf(startMarker);
let endIndex = content.indexOf(endMarker);
if (startIndex !== -1 && endIndex !== -1) {
    const newContent = content.substring(0, startIndex) + replacement + content.substring(endIndex);
    fs.writeFileSync('src/components/quest/QuestBoard.tsx', newContent, 'utf8');
    console.log('Successfully patched QuestBoard.tsx');
} else {
    // If exact endMarker is not found, maybe line endings differ. Let's find '];' after startMarker
    endIndex = content.indexOf('];', startIndex);
    if (startIndex !== -1 && endIndex !== -1) {
         const newContent = content.substring(0, startIndex) + replacement + content.substring(endIndex + 2);
         fs.writeFileSync('src/components/quest/QuestBoard.tsx', newContent, 'utf8');
         console.log('Successfully patched QuestBoard.tsx using fallback endMarker');
    } else {
         console.log('Failed to patch QuestBoard.tsx, markers not found');
    }
}
