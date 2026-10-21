import { CARD_KIND_LABEL, type CardDefinition } from '../../game/cards/cardTypes.ts';
import { resolveCardArt } from '../cardArtSources.ts';
import { h } from '../dom.ts';

export type CardViewSize = 'mini' | 'field' | 'hand' | 'shop' | 'detail';

export interface CardViewOptions {
  readonly size: CardViewSize;
  readonly selected?: boolean;
  /** 指定するとタップできるボタンとして描画する */
  readonly onTap?: () => void;
}

/**
 * カード1枚の表示。
 * 画像（assets/images/cards/）があればそれを使い、なければ仮の絵を描く。
 * art.layout が 'full' の画像はカード全面に表示する（完成済みの技カード画像の組み込み用）。
 */
export function createCardView(card: CardDefinition, options: CardViewOptions): HTMLElement {
  const artUrl = resolveCardArt(card.art);
  const fullArt = artUrl !== undefined && card.art?.layout === 'full';
  const classes = [
    'card',
    `card--${card.kind}`,
    `card--${options.size}`,
    options.selected ? 'is-selected' : '',
    fullArt ? 'card--full-art' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const art = artUrl
    ? h('img', { class: 'card__img', attrs: { src: artUrl, alt: '', draggable: 'false' } })
    : h(
        'div',
        { class: 'card__placeholder-art', attrs: { 'aria-hidden': 'true' } },
        h('span', { class: 'card__placeholder-mark', text: card.kind === 'monster' ? 'M' : 'S' }),
        card.isPlaceholder ? h('span', { class: 'card__placeholder-tag', text: '仮' }) : null,
      );

  const body = fullArt
    ? [art]
    : [
        h('div', { class: 'card__kind', text: CARD_KIND_LABEL[card.kind] }),
        h('div', { class: 'card__art' }, art),
        h('div', { class: 'card__name', text: card.name }),
      ];

  const label = `${CARD_KIND_LABEL[card.kind]}カード ${card.name}`;
  if (options.onTap) {
    const onTap = options.onTap;
    return h(
      'button',
      {
        class: classes,
        attrs: { type: 'button', 'aria-label': label, 'aria-pressed': String(options.selected ?? false) },
        on: { click: onTap },
      },
      ...body,
    );
  }
  return h('div', { class: classes, attrs: { role: 'img', 'aria-label': label } }, ...body);
}

/** 裏向きのカード（相手の手札など） */
export function createCardBack(size: CardViewSize): HTMLElement {
  return h('div', { class: `card card--back card--${size}`, attrs: { 'aria-hidden': 'true' } });
}
