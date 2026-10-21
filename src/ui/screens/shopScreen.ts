import { placeholderCatalog } from '../../game/cards/placeholderCards.ts';
import type { CardDefinition } from '../../game/cards/cardTypes.ts';
import { createCardDetail } from '../components/cardDetail.ts';
import { createCardView } from '../components/cardView.ts';
import { createScreenHeader } from '../components/screenHeader.ts';
import { h } from '../dom.ts';
import type { ScreenDefinition } from './types.ts';

/**
 * カードショップ（仮）。仮カードの一覧と詳細確認のみ。
 * 商品構成・価格・通貨・購入処理は仕様未確定のため実装しない。
 */
export const shopScreen: ScreenDefinition = {
  id: 'shop',
  title: 'カードショップ',
  create(ctx) {
    const element = h('main', { class: 'screen shop-screen' });

    const closeDetail = (): void => {
      element.querySelector('.card-detail')?.remove();
    };
    const openDetail = (card: CardDefinition): void => {
      closeDetail();
      element.append(createCardDetail({ card, onClose: closeDetail }));
    };

    const grid = h(
      'div',
      { class: 'shop-screen__grid' },
      ...placeholderCatalog.all().map((card) => createCardView(card, { size: 'shop', onTap: () => openDetail(card) })),
    );

    element.append(
      createScreenHeader({ title: 'カードショップ', back: { label: '街へ', onTap: () => ctx.back('town') } }),
      h('p', { class: 'notice', text: '仮の一覧です。購入・価格・通貨はまだありません。カードをタップすると詳細を表示します。' }),
      grid,
    );
    return { element };
  },
};
