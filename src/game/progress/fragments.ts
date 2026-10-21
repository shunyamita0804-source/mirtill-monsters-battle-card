import { HIDDEN_MONSTER_ID } from '../../data/cards.ts';
import { FRAGMENTS, FRAGMENT_TOTAL } from '../../data/fragments.ts';
import { addCards, hasProcessed, markProcessed, type SaveData } from '../save/saveData.ts';

/**
 * 欠片：欠片限定の隠しモンスター1体だけのための追加探索要素。
 * - 街・ダンジョンの隠し場所に計10個。各欠片は1度だけ入手できる
 * - 10個集めるとショップの「特別復元」で隠しモンスターカード1枚だけを受け取れる（技カードは付与しない）
 * - 本編・大会の進行には必須ではない
 */
export function fragmentAt(mapId: string, x: number, y: number): (typeof FRAGMENTS)[number] | undefined {
  return FRAGMENTS.find((f) => f.mapId === mapId && f.x === x && f.y === y);
}

export function collectFragment(save: SaveData, fragmentId: string): { save: SaveData; collected: boolean } {
  if (!FRAGMENTS.some((f) => f.id === fragmentId)) return { save, collected: false };
  if (save.fragments.includes(fragmentId)) return { save, collected: false };
  return { save: { ...save, fragments: [...save.fragments, fragmentId] }, collected: true };
}

export function fragmentCount(save: SaveData): number {
  return save.fragments.filter((id) => FRAGMENTS.some((f) => f.id === id)).length;
}

export function canRestoreHidden(save: SaveData): boolean {
  return !save.hiddenRestored && fragmentCount(save) >= FRAGMENT_TOTAL;
}

export type RestoreResult =
  | { readonly status: 'ok'; readonly save: SaveData }
  | { readonly status: 'duplicate' | 'notReady' | 'alreadyRestored'; readonly save: SaveData };

/** 特別復元：隠しモンスターカード1枚だけを付与する（1度だけ） */
export function restoreHidden(save: SaveData, transactionId: string): RestoreResult {
  if (hasProcessed(save, transactionId)) return { status: 'duplicate', save };
  if (save.hiddenRestored) return { status: 'alreadyRestored', save };
  if (fragmentCount(save) < FRAGMENT_TOTAL) return { status: 'notReady', save };
  let next = addCards(save, [{ cardId: HIDDEN_MONSTER_ID, count: 1 }]);
  next = markProcessed({ ...next, hiddenRestored: true }, transactionId);
  return { status: 'ok', save: next };
}
