import { CARD_KIND_LABEL, type CardDefinition } from '../../game/cards/cardTypes.ts';
import { button, h } from '../dom.ts';
import { createCardView } from './cardView.ts';

export interface CardDetailOptions {
  readonly card: CardDefinition;
  /** 「あなたの場 1番」など、カードの場所の説明（任意） */
  readonly locationLabel?: string;
  readonly onClose: () => void;
}

/**
 * カード詳細のオーバーレイ。画面要素（position: relative）の中に重ねて表示する。
 * 背景のタップ・閉じるボタンで閉じる。
 */
export function createCardDetail(options: CardDetailOptions): HTMLElement {
  const { card, onClose } = options;
  const titleId = `card-detail-title-${card.id}`;

  const closeButton = button('閉じる', onClose, 'btn btn--primary card-detail__close');
  const panel = h(
    'div',
    {
      class: 'card-detail__panel',
      attrs: { role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': titleId },
      on: { click: (event) => event.stopPropagation() },
    },
    h('div', { class: 'card-detail__card' }, createCardView(card, { size: 'detail' })),
    h(
      'div',
      { class: 'card-detail__info' },
      h('p', { class: 'card-detail__kind', text: `${CARD_KIND_LABEL[card.kind]}カード` }),
      h('h2', { class: 'card-detail__name', text: card.name, attrs: { id: titleId } }),
      options.locationLabel ? h('p', { class: 'card-detail__location', text: options.locationLabel }) : null,
      h('p', { class: 'card-detail__description', text: card.description }),
      card.isPlaceholder ? h('p', { class: 'card-detail__note', text: '※ 仮カード（正式データではありません）' }) : null,
    ),
    closeButton,
  );

  const overlay = h('div', { class: 'card-detail', on: { click: onClose } }, panel);
  queueMicrotask(() => closeButton.focus({ preventScroll: true }));
  return overlay;
}
