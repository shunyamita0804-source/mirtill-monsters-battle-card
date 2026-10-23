import { cardCatalog } from '../../data/cards.ts';
import { getPack, NEVER_IN_PACKS, type PackDefinition } from '../../data/economy.ts';
import type { Rarity } from '../cards/cardTypes.ts';
import { t } from '../../i18n/i18n.ts';
import { nextRandom } from '../rng.ts';
import { addCards, hasProcessed, markProcessed, type SaveData } from '../save/saveData.ts';

export interface CardRate {
  readonly cardId: string;
  readonly rarity: Rarity;
  /** 1枚あたりの排出割合（％） */
  readonly rate: number;
}

const RARITIES: readonly Rarity[] = ['C', 'U', 'R'];

function cardsByRarity(pack: PackDefinition): Record<Rarity, string[]> {
  const result: Record<Rarity, string[]> = { C: [], U: [], R: [] };
  for (const id of pack.cardIds) {
    const card = cardCatalog.get(id);
    // レアリティ未定の正式カードはパックに入れない（validatePack が知らせる）
    if (card?.rarity) result[card.rarity].push(id);
  }
  return result;
}

/** 収録カードごとの提供割合（1枠あたり）。合計は100％になる */
export function packCardRates(pack: PackDefinition): CardRate[] {
  const groups = cardsByRarity(pack);
  return RARITIES.flatMap((rarity) =>
    groups[rarity].map((cardId) => ({ cardId, rarity, rate: pack.rarityRates[rarity] / groups[rarity].length })),
  );
}

/** パック定義の検査（テスト用）。問題があればメッセージを返す */
export function validatePack(pack: PackDefinition): string[] {
  const issues: string[] = [];
  const total = RARITIES.reduce((sum, r) => sum + pack.rarityRates[r], 0);
  if (Math.abs(total - 100) > 1e-9) issues.push(`${pack.id}: レアリティ割合の合計が100%ではありません（${total}）`);
  const groups = cardsByRarity(pack);
  for (const r of RARITIES) {
    if (pack.rarityRates[r] > 0 && groups[r].length === 0) issues.push(`${pack.id}: ${r} のカードがありません`);
  }
  for (const id of pack.cardIds) {
    if (!cardCatalog.get(id)) issues.push(`${pack.id}: 存在しないカード ${id}`);
    if (NEVER_IN_PACKS.includes(id)) issues.push(`${pack.id}: 排出禁止カード ${id} が入っています`);
    if (cardCatalog.get(id)?.rarity === null) issues.push(`${pack.id}: レアリティ未定のカード ${id} が入っています`);
  }
  const sum = packCardRates(pack).reduce((s, c) => s + c.rate, 0);
  if (Math.abs(sum - 100) > 1e-6) issues.push(`${pack.id}: カード別割合の合計が100%ではありません（${sum}）`);
  return issues;
}

/** パックを1つ開けた結果のカード（seed は乱数の状態） */
export function drawPack(pack: PackDefinition, seed: number): { cards: string[]; seed: number } {
  const rates = packCardRates(pack).filter((c) => !NEVER_IN_PACKS.includes(c.cardId));
  const total = rates.reduce((s, c) => s + c.rate, 0);
  const cards: string[] = [];
  let s = seed;
  for (let i = 0; i < pack.cardsPerPack; i++) {
    const r = nextRandom(s);
    s = r.seed;
    let point = r.value * total;
    let picked = rates[rates.length - 1]?.cardId;
    for (const c of rates) {
      point -= c.rate;
      if (point < 0) {
        picked = c.cardId;
        break;
      }
    }
    if (picked) cards.push(picked);
  }
  return { cards, seed: s };
}

export type PurchaseResult =
  | { readonly status: 'ok'; readonly save: SaveData; readonly cards: readonly string[] }
  | { readonly status: 'duplicate'; readonly save: SaveData }
  | { readonly status: 'error'; readonly save: SaveData; readonly message: string };

/**
 * パックを購入して開ける。
 * transactionId は購入確認を開いたときに1回だけ作るID。同じIDで2回呼ばれても2回目は何もしない（二重決済防止）。
 */
export function purchasePack(save: SaveData, packId: string, transactionId: string, seed: number): PurchaseResult {
  if (hasProcessed(save, transactionId)) return { status: 'duplicate', save };
  const pack = getPack(packId);
  if (!pack) return { status: 'error', save, message: t('gacha.error.noPack') };
  if (!save.unlockedPacks.includes(packId)) return { status: 'error', save, message: t('gacha.error.locked') };
  if (save.coins < pack.price) return { status: 'error', save, message: t('gacha.error.coins') };
  const { cards } = drawPack(pack, seed);
  let next = addCards(
    { ...save, coins: save.coins - pack.price },
    cards.map((cardId) => ({ cardId, count: 1 })),
  );
  next = markProcessed(next, transactionId);
  next = { ...next, stats: { ...next.stats, packsOpened: next.stats.packsOpened + 1 } };
  return { status: 'ok', save: next, cards };
}
