/**
 * ヘッダーとスマホ下部メニューの赤い数字（要対応件数・未読）を、今すぐ取り直させる。
 * 応募を承認した・トークを読んだ など、件数が変わる操作の後に呼ぶ。
 * （呼ばなくても、画面の移動・60秒ごと・タブ復帰のたびに取り直される）
 */
export const BADGES_EVENT = 'guild:refresh-badges';

export function refreshBadges(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(BADGES_EVENT));
}
