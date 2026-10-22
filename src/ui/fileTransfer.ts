/**
 * ファイルの書き出し・読み込み（Web 標準の機能だけ。サーバーには送らない）。
 *
 * - 書き出し：共有シート（iPhone では「"ファイル"に保存」が選べる）を使えるならそれを、だめならダウンロード
 * - 読み込み：ファイル選択（<input type="file">）
 */
export type SaveFileResult = 'shared' | 'downloaded' | 'cancelled' | 'failed';

export async function saveTextFile(fileName: string, text: string, type = 'application/json'): Promise<SaveFileResult> {
  const blob = new Blob([text], { type });
  try {
    const file = new File([blob], fileName, { type });
    const nav = navigator as Navigator & { canShare?: (data: ShareData) => boolean };
    if (typeof nav.share === 'function' && nav.canShare?.({ files: [file] })) {
      await nav.share({ files: [file], title: fileName });
      return 'shared';
    }
  } catch (e) {
    // 共有シートを閉じた（AbortError）ときは何もしない。それ以外はダウンロードで試す
    if (e instanceof DOMException && e.name === 'AbortError') return 'cancelled';
  }
  try {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.rel = 'noopener';
    a.style.display = 'none';
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
    return 'downloaded';
  } catch {
    return 'failed';
  }
}

/** ファイルを1つ選んでもらい、文字として読む。選ばなければ null */
export function pickTextFile(accept: string, maxBytes: number): Promise<{ text: string } | { error: 'tooLarge' | 'read' } | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.style.display = 'none';
    input.addEventListener('change', () => {
      const file = input.files?.[0];
      input.remove();
      if (!file) {
        resolve(null);
        return;
      }
      if (file.size > maxBytes) {
        resolve({ error: 'tooLarge' });
        return;
      }
      file.text().then(
        (text) => resolve({ text }),
        () => resolve({ error: 'read' }),
      );
    });
    // 選ばずに閉じたとき（対応するブラウザのみ）
    input.addEventListener('cancel', () => {
      input.remove();
      resolve(null);
    });
    document.body.append(input);
    input.click();
  });
}
