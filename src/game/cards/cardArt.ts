import { assetRelativePath } from '../../core/assetCategories.ts';
import type { CardArt } from './cardTypes.ts';

export type CardArtResolver = (art: CardArt | undefined) => string | undefined;

/**
 * assets/ 配下の画像URL一覧から、カード画像のURLを引く関数を作る。
 *
 * @param modules キーが `/assets/images/cards/...` 形式のパス、値が配信URL（import.meta.glob の結果）
 * 見つからない・ファイル名が規則外の場合は undefined を返し、UI側で仮の絵を表示する。
 */
export function createCardArtResolver(
  modules: Readonly<Record<string, string>>,
  prefix: string = '/assets/',
): CardArtResolver {
  const urls = new Map<string, string>();
  for (const [path, url] of Object.entries(modules)) {
    urls.set(path.startsWith(prefix) ? path.slice(prefix.length) : path, url);
  }
  return (art) => {
    if (!art) return undefined;
    try {
      return urls.get(assetRelativePath(art.category, art.file));
    } catch {
      return undefined;
    }
  };
}
