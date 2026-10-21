import { describe, expect, it } from 'vitest';
import { HIDDEN_MONSTER_ID } from '../src/data/cards.ts';
import { getPack, PACKS } from '../src/data/economy.ts';
import { drawPack, packCardRates, purchasePack } from '../src/game/economy/gacha.ts';
import { createNewSave } from '../src/game/save/saveData.ts';

const PACK1 = getPack('pack-01');

describe('ガチャ（カードパック）', () => {
  it('提供割合の合計は100％', () => {
    for (const pack of PACKS) {
      const sum = packCardRates(pack).reduce((s, c) => s + c.rate, 0);
      expect(sum).toBeCloseTo(100, 9);
    }
  });

  it('1パックで決まった枚数が出て、収録カードだけが出る', () => {
    if (!PACK1) throw new Error('pack-01');
    for (let seed = 1; seed < 200; seed++) {
      const { cards } = drawPack(PACK1, seed);
      expect(cards).toHaveLength(PACK1.cardsPerPack);
      for (const c of cards) expect(PACK1.cardIds).toContain(c);
    }
  });

  it('隠しモンスター本体は大量に引いても出ない', () => {
    for (const pack of PACKS) {
      for (let seed = 1; seed < 300; seed++) expect(drawPack(pack, seed).cards).not.toContain(HIDDEN_MONSTER_ID);
    }
  });

  it('レアリティの出現頻度が設定の割合に近い', () => {
    if (!PACK1) throw new Error('pack-01');
    const rates = new Map(packCardRates(PACK1).map((c) => [c.cardId, c.rarity]));
    const counts = { C: 0, U: 0, R: 0 };
    let total = 0;
    let seed = 42;
    for (let i = 0; i < 4000; i++) {
      const r = drawPack(PACK1, seed);
      seed = r.seed;
      for (const c of r.cards) {
        counts[rates.get(c) ?? 'C']++;
        total++;
      }
    }
    expect(counts.C / total).toBeCloseTo(0.7, 1);
    expect(counts.U / total).toBeCloseTo(0.25, 1);
    expect(counts.R / total).toBeCloseTo(0.05, 1);
  });

  it('購入で所持金が減り、カードが所持に反映される', () => {
    const save = createNewSave();
    const result = purchasePack(save, 'pack-01', 'tx-1', 7);
    expect(result.status).toBe('ok');
    if (result.status !== 'ok') return;
    expect(result.save.coins).toBe(save.coins - (PACK1?.price ?? 0));
    const before = Object.values(save.collection).reduce((a, b) => a + b, 0);
    const after = Object.values(result.save.collection).reduce((a, b) => a + b, 0);
    expect(after - before).toBe(PACK1?.cardsPerPack);
  });

  it('同じ購入IDで2回呼んでも1回分しか処理しない（二重決済防止）', () => {
    const first = purchasePack(createNewSave(), 'pack-01', 'tx-dup', 7);
    expect(first.status).toBe('ok');
    const second = purchasePack(first.save, 'pack-01', 'tx-dup', 8);
    expect(second.status).toBe('duplicate');
    expect(second.save).toBe(first.save);
  });

  it('未解放パック・所持金不足は購入できない', () => {
    const save = createNewSave();
    expect(purchasePack(save, 'pack-02', 'tx-a', 1).status).toBe('error');
    expect(purchasePack({ ...save, coins: 10 }, 'pack-01', 'tx-b', 1).status).toBe('error');
  });
});
