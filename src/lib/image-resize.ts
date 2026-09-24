/**
 * 写真をブラウザ側で縮小してから送るための処理。
 *
 * 縮小する理由:
 *   - Supabase の無料枠は保存1GB・転送量に上限がある。スマホの写真は
 *     1枚5〜10MBあるので、そのままだとすぐ枠を使い切る
 *   - 長辺1600pxあれば掲示には十分
 *
 * 出力は常に JPEG。EXIF（撮影場所の位置情報など）もここで落ちる。
 * 位置情報付きの写真をそのまま公開してしまう事故を防ぐ意味もある。
 */

export const PHOTO_MAX_EDGE = 1600;
export const PHOTO_QUALITY = 0.82;
/** 元の写真として受け付ける上限。縮小前の話なので大きめにしてある */
export const PHOTO_SOURCE_MAX_BYTES = 20 * 1024 * 1024;

export async function resizeToJpeg(file: File): Promise<Blob> {
  if (!file.type.startsWith('image/')) {
    throw new Error('画像ファイルを選んでください。');
  }
  if (file.size > PHOTO_SOURCE_MAX_BYTES) {
    throw new Error('写真が大きすぎます（20MBまで）。');
  }

  let bitmap: ImageBitmap;
  try {
    // 'from-image' でスマホ写真の向き（EXIFの回転情報）を反映する
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    throw new Error('この形式の画像は読み込めませんでした。JPEGかPNGでお試しください。');
  }

  const scale = Math.min(1, PHOTO_MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('画像の処理に失敗しました。');
  // 透過PNGの背景が黒くならないよう白で塗ってから描く
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', PHOTO_QUALITY));
  if (!blob) throw new Error('画像の処理に失敗しました。');
  return blob;
}
