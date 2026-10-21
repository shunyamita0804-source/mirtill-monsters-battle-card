import type { MonsterCard } from '../../game/cards/cardTypes.ts';
import { resolveCardArt } from '../cardArtSources.ts';
import { h } from '../dom.ts';

/**
 * モンスターカードの表示。
 * モンスターカードの正式テンプレート・正式イラストは未着手のため、テーマ色の枠と仮の絵で表示する。
 */
export interface MonsterCardOptions {
  readonly width: number;
  /** バトル中のライフ（指定するとライフバーを出す） */
  readonly life?: { readonly current: number; readonly max: number };
  readonly showName?: boolean;
}

export function createMonsterCard(monster: MonsterCard, options: MonsterCardOptions): HTMLElement {
  const artUrl = resolveCardArt(monster.art);
  const height = Math.round(options.width * 1.4);
  const art = artUrl
    ? h('img', { class: 'monster-card__img', attrs: { src: artUrl, alt: '', draggable: 'false' } })
    : h(
        'div',
        { class: 'monster-card__placeholder' },
        h('span', { class: 'monster-card__mark', text: monster.undetermined ? '？' : monster.name.slice(-1) }),
        h('span', { class: 'monster-card__tag', text: monster.undetermined ? '未確定' : '仮' }),
      );
  const life = options.life;
  const card = h(
    'div',
    {
      class: `monster-card${life && life.current <= 0 ? ' is-down' : ''}`,
      attrs: { role: 'img', 'aria-label': `モンスターカード ${monster.name}${life ? ` ライフ${life.current}/${life.max}` : ''}` },
    },
    h('div', { class: 'monster-card__art' }, art),
    options.showName === false ? null : h('div', { class: 'monster-card__name', text: monster.name }),
    life
      ? h(
          'div',
          { class: 'monster-card__life' },
          h('div', { class: 'monster-card__life-bar' }, h('div', { class: 'monster-card__life-fill' })),
          h('span', { class: 'monster-card__life-text', text: `${life.current}/${life.max}` }),
        )
      : h('div', { class: 'monster-card__life-text monster-card__life-text--base', text: `ライフ ${monster.life}` }),
    life && life.current <= 0 ? h('div', { class: 'monster-card__down', text: '戦闘不能' }) : null,
  );
  card.style.setProperty('--theme', monster.themeColor);
  card.style.width = `${options.width}px`;
  card.style.height = `${height}px`;
  const fill = card.querySelector<HTMLElement>('.monster-card__life-fill');
  if (fill && life) fill.style.width = `${Math.max(0, (life.current / life.max) * 100)}%`;
  return card;
}
