import type { CardDefinition } from './cardTypes.ts';

/** カード定義の参照窓口。正式データに差し替えるときはこのインターフェースを満たせばよい */
export interface CardCatalog {
  get(id: string): CardDefinition | undefined;
  all(): readonly CardDefinition[];
}

export function createCardCatalog(cards: readonly CardDefinition[]): CardCatalog {
  const byId = new Map<string, CardDefinition>();
  for (const card of cards) {
    if (byId.has(card.id)) {
      throw new Error(`カードIDが重複しています: ${card.id}`);
    }
    byId.set(card.id, card);
  }
  return {
    get: (id) => byId.get(id),
    all: () => cards,
  };
}
