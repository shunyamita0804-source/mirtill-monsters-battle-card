import coinUrl from '@assets/images/icons/coin.png';
import { h } from '../dom.ts';

/** 金貨のアイコン（ミスモンの正式素材 2026-10-08。所持金の表示の頭に置く。読み上げでは文字だけ読む） */
export function coinIcon(): HTMLImageElement {
  return h('img', { class: 'coin-icon', attrs: { src: coinUrl, alt: '', 'aria-hidden': 'true', draggable: 'false' } });
}
