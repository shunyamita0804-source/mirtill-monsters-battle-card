import type { CardDefinition } from '../../game/cards/cardTypes.ts';
import { createMonsterCard } from './monsterCard.ts';
import { createSkillCard } from './skillCard.ts';

/** カード1枚（モンスター・技どちらでも）を指定幅で描く */
export function createCardView(card: CardDefinition, width: number, showText?: boolean): HTMLElement {
  if (card.kind === 'monster') return createMonsterCard(card, { width, showName: showText ?? width >= 90 });
  return createSkillCard(card, { width, ...(showText === undefined ? {} : { showText }) });
}

/** 未入手カードの影（図鑑用） */
export function createUnknownCard(width: number): HTMLElement {
  const el = document.createElement('div');
  el.className = 'card-unknown';
  el.textContent = '？';
  el.style.width = `${width}px`;
  el.style.height = `${Math.round(width * 1.6)}px`;
  return el;
}
