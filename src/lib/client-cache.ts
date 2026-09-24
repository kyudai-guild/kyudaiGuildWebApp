/**
 * 画面を即座に描くためだけの、ブラウザ内の短命キャッシュ。
 *
 * 方針は stale-while-revalidate:
 *   1. キャッシュがあれば、まずそれで描画する（待ち時間ゼロ）
 *   2. **必ず**裏でサーバーに取りに行き、届いたら差し替える
 *
 * つまりキャッシュは「最新を取りに行かない理由」にはならない。
 * 表示が一瞬古い可能性はあるが、取得が終われば必ず最新に揃うので、
 * 同期性（最終的な一貫性）は保たれる。
 *
 * sessionStorage を使う理由:
 *   - タブを閉じれば消えるので、古いデータが延々と残らない
 *   - 他のタブやデバイスには共有されない（別ユーザーに漏れない）
 * さらにログインユーザーのIDを鍵に混ぜ、ログアウト時に消すことで、
 * 同じ端末を共有した場合でも前の人のデータが見えないようにする。
 *
 * プライベートウィンドウやストレージ無効の環境では例外を投げるため、
 * 読み書きの両方を try/catch で囲い、失敗しても素通りさせる。
 */

const PREFIX = 'guild-cache:';

type Entry<T> = { at: number; uid: string | null; data: T };

function key(name: string): string {
  return `${PREFIX}${name}`;
}

/**
 * キャッシュを読む。次のいずれかに当てはまれば null を返す:
 *   - 保存が無い / 壊れている
 *   - maxAgeMs より古い
 *   - 保存時と今でログインユーザーが違う
 */
export function readCache<T>(name: string, uid: string | null, maxAgeMs: number): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(key(name));
    if (!raw) return null;
    const entry = JSON.parse(raw) as Entry<T>;
    if (entry.uid !== uid) return null;
    if (Date.now() - entry.at > maxAgeMs) return null;
    return entry.data;
  } catch {
    return null;
  }
}

export function writeCache<T>(name: string, uid: string | null, data: T): void {
  if (typeof window === 'undefined') return;
  try {
    const entry: Entry<T> = { at: Date.now(), uid, data };
    window.sessionStorage.setItem(key(name), JSON.stringify(entry));
  } catch {
    // 容量超過やストレージ無効。キャッシュは無くても動くので握り潰してよい
  }
}

/* ── 書きかけの下書き ─────────────────────────────
 * キャッシュと違い、タブを閉じても、スマホが裏でタブを破棄しても残したいので
 * localStorage に置く。本人のIDを鍵に含め、ログアウト時には clearCache() で
 * まとめて消す（共有の端末に、前の人の書きかけを残さない）。
 */
const DRAFT_PREFIX = 'guild-draft:';

function draftKey(name: string, uid: string): string {
  return `${DRAFT_PREFIX}${name}:${uid}`;
}

export function readDraft<T>(name: string, uid: string): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(draftKey(name, uid));
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function writeDraft<T>(name: string, uid: string, data: T): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(draftKey(name, uid), JSON.stringify(data));
  } catch {
    // 保存できなくても入力は続けられる
  }
}

export function removeDraft(name: string, uid: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(draftKey(name, uid));
  } catch {
    /* 消せなくても実害はない */
  }
}

function removeByPrefix(store: Storage, prefix: string): void {
  const doomed: string[] = [];
  for (let i = 0; i < store.length; i++) {
    const k = store.key(i);
    if (k?.startsWith(prefix)) doomed.push(k);
  }
  doomed.forEach(k => store.removeItem(k));
}

/** ログアウト時など、このアプリのキャッシュと下書きをすべて捨てる */
export function clearCache(): void {
  if (typeof window === 'undefined') return;
  try {
    removeByPrefix(window.sessionStorage, PREFIX);
    removeByPrefix(window.localStorage, DRAFT_PREFIX);
  } catch {
    /* 消せなくても実害はない */
  }
}
