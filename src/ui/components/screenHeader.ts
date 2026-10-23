import { h } from '../dom.ts';

export interface ScreenHeaderOptions {
  readonly title: string;
  readonly back?: { readonly label: string; readonly onTap: () => void };
  readonly right?: Node;
}

/** 各画面上部の見出しバー（左：戻る、中央：画面名、右：任意） */
export function createScreenHeader(options: ScreenHeaderOptions): HTMLElement {
  return h(
    'header',
    { class: 'screen-header' },
    h(
      'div',
      { class: 'screen-header__side' },
      // 戻る：丸い金の縁の矢印（2026-10-23 デザイン第7弾）＋小さな文字
      options.back
        ? h(
            'button',
            { class: 'screen-header__back', attrs: { type: 'button' }, on: { click: options.back.onTap } },
            h('span', { class: 'screen-header__back-icon', attrs: { 'aria-hidden': 'true' } }),
            h('span', { class: 'screen-header__back-label', text: options.back.label }),
          )
        : null,
    ),
    h('h1', { class: 'screen-header__title', text: options.title }),
    h('div', { class: 'screen-header__side screen-header__side--right' }, options.right ?? null),
  );
}
