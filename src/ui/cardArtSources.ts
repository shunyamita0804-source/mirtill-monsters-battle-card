import { createCardArtResolver } from '../game/cards/cardArt.ts';

/**
 * assets/images/cards/ に置いた画像を自動で一覧化する。
 * 正式素材を置けば、カード定義の art で指定するだけで表示に使われる（未配置なら仮の絵）。
 */
const cardImageUrls = import.meta.glob<string>('/assets/images/cards/**/*.{png,webp,jpg,jpeg,svg}', {
  eager: true,
  query: '?url',
  import: 'default',
});

export const resolveCardArt = createCardArtResolver(cardImageUrls);
