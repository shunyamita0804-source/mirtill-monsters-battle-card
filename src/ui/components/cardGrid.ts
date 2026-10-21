import type { CardDefinition } from '../../game/cards/cardTypes.ts';
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
          ['all', 'すべて'],
          ['monster', 'モンスター'],
          ['skill', '技'],
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
          attrs: { type: 'button', 'aria-label': unknown ? '未入手のカード' : card.name },
          dataset: { id: card.id },
          on: {
            click: () => {
              if (!unknown) openCardDetail(options.modalParent, card, { owned });
            },
          },
        },
        unknown ? createUnknownCard(96) : createCardView(card, 96, false),
        h('span', { class: 'card-grid__name', text: unknown ? '？？？' : card.name }),
        h('span', { class: 'card-grid__owned', text: `所持 ${owned}` }),
      );
    });
    root.replaceChildren(tabs, h('div', { class: 'card-grid__items' }, ...items));
  };
  render();
  return root;
}
