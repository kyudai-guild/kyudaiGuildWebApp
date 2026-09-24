import type React from 'react';

/**
 * 「確定の Enter」か。日本語入力で変換を確定するための Enter は含めない。
 *
 * isComposing だけでは足りない: Safari は変換確定の Enter を
 * compositionend の後に送ってくるため isComposing が false になる。
 * そのとき keyCode は 229 になるので、それも除く。
 */
export function isSubmitEnter(e: React.KeyboardEvent): boolean {
  return e.key === 'Enter' && !e.nativeEvent.isComposing && e.keyCode !== 229;
}
