import type { MonsterCard } from '../../game/cards/cardTypes.ts';
import { cardName } from '../../i18n/content.ts';
import { t } from '../../i18n/i18n.ts';
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
  const name = cardName(monster);
  const artUrl = resolveCardArt(monster.art);
  const height = Math.round(options.width * 1.4);
  const art = artUrl
    ? h('img', { class: 'monster-card__img', attrs: { src: artUrl, alt: '', draggable: 'false' } })
    : h(
        'div',
        { class: 'monster-card__placeholder' },
        h('span', { class: 'monster-card__mark', text: monster.undetermined ? '？' : name.slice(-1) }),
        h('span', { class: 'monster-card__tag', text: t(monster.undetermined ? 'common.undeterminedTag' : 'common.placeholderTag') }),
      );
  const life = options.life;
  const card = h(
    'div',
    {
      class: `monster-card${life && life.current <= 0 ? ' is-down' : ''}`,
      attrs: {
        role: 'img',
        'aria-label': life ? t('card.aria.monsterLife', { name, life: life.current, max: life.max }) : t('card.aria.monster', { name }),
      },
    },
    h('div', { class: 'monster-card__art' }, art),
    options.showName === false ? null : h('div', { class: 'monster-card__name', text: name }),
    life
      ? h(
          'div',
          { class: 'monster-card__life' },
          h('div', { class: 'monster-card__life-bar' }, h('div', { class: 'monster-card__life-fill' })),
          h('span', { class: 'monster-card__life-text', text: `${life.current}/${life.max}` }),
        )
      : h('div', { class: 'monster-card__life-text monster-card__life-text--base', text: t('card.life', { n: monster.life }) }),
    life && life.current <= 0 ? h('div', { class: 'monster-card__down', text: t('card.down') }) : null,
  );
  card.style.setProperty('--theme', monster.themeColor);
  card.style.width = `${options.width}px`;
  card.style.height = `${height}px`;
  const fill = card.querySelector<HTMLElement>('.monster-card__life-fill');
  if (fill && life) fill.style.width = `${Math.max(0, (life.current / life.max) * 100)}%`;
  return card;
}
