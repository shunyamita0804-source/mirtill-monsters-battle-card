import { button, h } from '../dom.ts';

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
      options.back ? button(`‹ ${options.back.label}`, options.back.onTap, 'btn btn--ghost btn--small') : null,
    ),
    h('h1', { class: 'screen-header__title', text: options.title }),
    h('div', { class: 'screen-header__side screen-header__side--right' }, options.right ?? null),
  );
}
