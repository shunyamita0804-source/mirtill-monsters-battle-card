import type { CardDefinition } from '../../game/cards/cardTypes.ts';
import { cardName } from '../../i18n/content.ts';
import { t } from '../../i18n/i18n.ts';
import { button, h } from '../dom.ts';
import { openCardDetail } from './cardDetail.ts';
import { createCardView, createUnknownCard } from './cardView.ts';

export type CardFilter = 'all' | 'monster' | 'skill';

export interface CardGridOptions {
  readonly cards: readonly CardDefinition[];
  readonly owned: Readonly<Record<string, number>>;
  /** 未所持のカードを影で表示する（図鑑） */
  readonly hideUnowned: boolean;
  /** 詳細を出す親要素 */
  readonly modalParent: HTMLElement;
}

/** 分類タブ付きのカード一覧（タップで拡大詳細） */
export function createCardGrid(options: CardGridOptions): HTMLElement {
  let filter: CardFilter = 'all';
  const root = h('div', { class: 'card-grid' });
  const render = (): void => {
    const cards = options.cards.filter((c) => filter === 'all' || c.kind === filter);
    const tabs = h(
      'div',
      { class: 'card-grid__tabs' },
      ...(
        [
          ['all', t('common.all')],
          ['monster', t('card.kind.monster')],
          ['skill', t('card.kind.skill')],
        ] as const
      ).map(([f, label]) =>
        button(label, () => {
          filter = f;
          render();
        }, `card-grid__tab${filter === f ? ' is-active' : ''}`),
      ),
    );
    const items = cards.map((card) => {
      const owned = options.owned[card.id] ?? 0;
      const unknown = options.hideUnowned && owned === 0;
      return h(
        'button',
        {
          class: `card-grid__item${owned === 0 ? ' is-unowned' : ''}`,
          attrs: { type: 'button', 'aria-label': unknown ? t('card.grid.unknown') : cardName(card) },
          dataset: { id: card.id },
          on: {
            click: () => {
              if (!unknown) openCardDetail(options.modalParent, card, { owned });
            },
          },
        },
        unknown ? createUnknownCard(96) : createCardView(card, 96, false),
        h('span', { class: 'card-grid__name', text: unknown ? t('common.unknownName') : cardName(card) }),
        h('span', { class: 'card-grid__owned', text: t('common.owned', { n: owned }) }),
      );
    });
    root.replaceChildren(tabs, h('div', { class: 'card-grid__items' }, ...items));
  };
  render();
  return root;
}
