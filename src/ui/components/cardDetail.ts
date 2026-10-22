import { getMonster } from '../../data/cards.ts';
import { PACKS } from '../../data/economy.ts';
import {
  CARD_KIND_LABEL,
  describeSkill,
  describeSupport,
  EFFECT_LABEL,
  RARITY_LABEL,
  STAT_LABEL,
  type CardDefinition,
} from '../../game/cards/cardTypes.ts';
import { h } from '../dom.ts';
import { createCardView } from './cardView.ts';
import { openModal, type ModalHandle } from './modal.ts';

export interface CardDetailOptions {
  /** 所持枚数（指定すると表示） */
  readonly owned?: number;
  /** 追加で表示する行（バトル中の場所など） */
  readonly extra?: readonly string[];
}

/** カードの拡大表示と詳細（分類・効果・数値・所持枚数・収録パック） */
export function openCardDetail(parent: HTMLElement, card: CardDefinition, options: CardDetailOptions = {}): ModalHandle {
  const rows: [string, string][] = [['分類', `${CARD_KIND_LABEL[card.kind]}カード`]];
  if (card.kind === 'skill') {
    rows.push(['適合モンスター', getMonster(card.monsterId).name]);
    rows.push(['種類', EFFECT_LABEL[card.effect.type]]);
    rows.push(['マナ', String(card.cost)]);
    rows.push([STAT_LABEL[card.stat.type], String(card.stat.value)]);
  } else if (card.kind === 'support') {
    rows.push(['区分', card.duration === 'field' ? '全体（場に残る）' : 'すぐ効果（1ターンに1回まで）']);
    rows.push(['マナ', String(card.cost)]);
  } else {
    rows.push(['ライフ', String(card.life)]);
  }
  rows.push(['レアリティ', RARITY_LABEL[card.rarity]]);
  const packs = PACKS.filter((p) => p.cardIds.includes(card.id)).map((p) => p.name);
  rows.push(['入手', card.kind === 'monster' && card.hidden ? 'ショップの特別復元（欠片10個）' : packs.join('、') || '—']);
  if (options.owned !== undefined) rows.push(['所持枚数', `${options.owned}枚`]);

  const description = card.kind === 'skill' ? describeSkill(card) : card.kind === 'support' ? describeSupport(card) : card.description;

  const handle = openModal(parent, {
    className: 'card-detail',
    body: [
      h('div', { class: 'card-detail__card' }, createCardView(card, 180, true)),
      h('h2', { class: 'card-detail__name', text: card.name }),
      ...(options.extra ?? []).map((t) => h('p', { class: 'card-detail__extra', text: t })),
      h('p', { class: 'card-detail__description', text: description }),
      h(
        'dl',
        { class: 'card-detail__rows' },
        ...rows.flatMap(([k, v]) => [h('dt', { text: k }), h('dd', { text: v })]),
      ),
      card.isPlaceholder ? h('p', { class: 'card-detail__note', text: '※ 仮カード（正式データ・正式画像ではありません）' }) : null,
    ],
    actions: [{ label: '閉じる', primary: true, onTap: () => handle.close() }],
  });
  return handle;
}
