import { describe, expect, it } from 'vitest';
import { getSkill, monsterId, skillId } from '../src/data/cards.ts';
import { BATTLE_RULES } from '../src/data/rules.ts';
import { chooseAction } from '../src/game/battle/ai.ts';
import {
  actingSide,
  applyAction,
  canDiscardForMana,
  cardUsability,
  createBattle,
  type BattleState,
  type Side,
} from '../src/game/battle/engine.ts';
import { buildAutoDeck, createStarterDeck, type Deck } from '../src/game/deck/deck.ts';

const playerDeck = createStarterDeck();
const enemyDeck = buildAutoDeck(['d', 'e', 'f'].map(monsterId));

function battle(seed = 1, first: Side = 'player'): BattleState {
  return createBattle({ name: 'P', deck: playerDeck }, { name: 'O', deck: enemyDeck }, seed, first);
}

/** 手札を差し替えたテスト用の状態 */
function withHand(state: BattleState, side: Side, cardIds: string[], mana: number): BattleState {
  return {
    ...state,
    sides: {
      ...state.sides,
      [side]: { ...state.sides[side], hand: cardIds.map((cardId, i) => ({ uid: `t${i}`, cardId })), mana },
    },
  };
}

function playOut(state: BattleState, maxSteps = 5000): { state: BattleState; steps: number } {
  let s = state;
  let steps = 0;
  while (s.phase !== 'ended' && steps < maxSteps) {
    const side = actingSide(s);
    if (!side) break;
    const action = chooseAction(s, side);
    if (!action) break;
    const next = applyAction(s, action);
    if (next === s) throw new Error(`AI の行動が無効: ${JSON.stringify(action)}`);
    s = next;
    steps++;
  }
  return { state: s, steps };
}

describe('バトル開始', () => {
  it('双方モンスター3体、手札5枚、山札55枚。先攻はマナ1から', () => {
    const s = battle();
    for (const side of ['player', 'opponent'] as const) {
      expect(s.sides[side].monsters).toHaveLength(3);
      expect(s.sides[side].hand).toHaveLength(BATTLE_RULES.initialHand);
      expect(s.sides[side].deck).toHaveLength(60 - BATTLE_RULES.initialHand);
    }
    expect(s.sides.player.mana).toBe(BATTLE_RULES.firstTurnMana);
    expect(s.sides.opponent.mana).toBe(0);
  });

  it('同じシードなら同じ展開（再現性）', () => {
    expect(battle(99)).toEqual(battle(99));
  });

  it('先攻を指定しなければシードで決まる', () => {
    const firsts = new Set<Side>();
    for (let seed = 1; seed < 40; seed++) {
      firsts.add(createBattle({ name: 'P', deck: playerDeck }, { name: 'O', deck: enemyDeck }, seed).first);
    }
    expect(firsts).toEqual(new Set(['player', 'opponent']));
  });
});

describe('攻撃と防御', () => {
  it('攻撃 → 防御待ち → 防御カードでダメージ軽減', () => {
    let s = withHand(battle(), 'player', [skillId('a', 2)], 5); // a-2: ちから攻撃
    s = withHand(s, 'opponent', [skillId('e', 4)], 3); // e-4: ちから防御
    const target = s.sides.opponent.monsters[0];
    if (!target) throw new Error('target');
    s = applyAction(s, { type: 'useCard', side: 'player', cardUid: 't0', targetUid: target.uid });
    expect(s.phase).toBe('defense');
    expect(s.sides.player.mana).toBe(5 - getSkill(skillId('a', 2)).cost);
    expect(actingSide(s)).toBe('opponent');
    s = applyAction(s, { type: 'defend', side: 'opponent', cardUid: 't0' });
    expect(s.phase).toBe('main');
    const dmg = getSkill(skillId('a', 2)).stat.value - getSkill(skillId('e', 4)).stat.value;
    expect(s.sides.opponent.monsters[0]?.life).toBe(target.life - dmg);
  });

  it('能力が違う防御カードは使えない', () => {
    let s = withHand(battle(), 'player', [skillId('a', 2)], 5);
    s = withHand(s, 'opponent', [skillId('e', 5)], 3); // e-5: かしこさ防御
    const target = s.sides.opponent.monsters[0];
    s = applyAction(s, { type: 'useCard', side: 'player', cardUid: 't0', targetUid: target?.uid ?? '' });
    expect(cardUsability(s, 'opponent', 't0').usable).toBe(false);
    expect(applyAction(s, { type: 'defend', side: 'opponent', cardUid: 't0' })).toBe(s);
    s = applyAction(s, { type: 'defend', side: 'opponent', cardUid: null });
    expect(s.sides.opponent.monsters[0]?.life).toBe((target?.life ?? 0) - getSkill(skillId('a', 2)).stat.value);
  });

  it('防御されない攻撃（貫通）はすぐにダメージ', () => {
    let s = withHand(battle(), 'player', [skillId('d', 6)], 10); // d-6: 貫通
    s = { ...s, sides: { ...s.sides, player: { ...s.sides.player, monsters: [...buildD(s)] } } };
    const target = s.sides.opponent.monsters[1];
    s = applyAction(s, { type: 'useCard', side: 'player', cardUid: 't0', targetUid: target?.uid ?? '' });
    expect(s.phase).toBe('main');
    expect(s.sides.opponent.monsters[1]?.life).toBe(Math.max(0, (target?.life ?? 0) - getSkill(skillId('d', 6)).stat.value));
  });
});

/** プレイヤーの1体目を仮モンスターDに替える（貫通技のテスト用） */
function buildD(s: BattleState) {
  return s.sides.player.monsters.map((m, i) => (i === 0 ? { ...m, cardId: monsterId('d') } : m));
}

describe('使用不可状態', () => {
  it('マナ不足・行動済み・防御カード・相手のターン', () => {
    let s = withHand(battle(), 'player', [skillId('a', 3), skillId('a', 1), skillId('a', 1), skillId('a', 4)], 2);
    expect(cardUsability(s, 'player', 't0')).toMatchObject({ usable: false, reason: 'マナが足りません' });
    expect(cardUsability(s, 'player', 't3').usable).toBe(false); // 防御カード
    expect(cardUsability(s, 'opponent', s.sides.opponent.hand[0]?.uid ?? '').reason).toBe('相手のターンです');
    const target = s.sides.opponent.monsters[0]?.uid ?? '';
    s = applyAction(s, { type: 'useCard', side: 'player', cardUid: 't1', targetUid: target });
    s = applyAction(s, { type: 'defend', side: 'opponent', cardUid: null });
    expect(cardUsability(s, 'player', 't2')).toMatchObject({ usable: false, reason: '使えるモンスターは行動済みです' });
  });

  it('倒れたモンスターの技は使えない', () => {
    let s = withHand(battle(), 'player', [skillId('a', 1)], 5);
    s = { ...s, sides: { ...s.sides, player: { ...s.sides.player, monsters: s.sides.player.monsters.map((m, i) => (i === 0 ? { ...m, life: 0 } : m)) } } };
    expect(cardUsability(s, 'player', 't0')).toMatchObject({ usable: false, reason: '使えるモンスターが倒れています' });
  });

  it('無効な行動は無視される（状態は変わらない）', () => {
    const s = battle();
    expect(applyAction(s, { type: 'endTurn', side: 'opponent' })).toBe(s);
    expect(applyAction(s, { type: 'useCard', side: 'player', cardUid: 'nope' })).toBe(s);
    expect(applyAction(s, { type: 'defend', side: 'opponent', cardUid: null })).toBe(s);
  });
});

describe('ターン進行', () => {
  it('ターン終了で相手の手番。マナ+2、手札を5枚まで補充、行動済みが戻る', () => {
    let s = battle();
    const oppDeck = s.sides.opponent.deck.length;
    s = applyAction(s, { type: 'endTurn', side: 'player' });
    expect(s.active).toBe('opponent');
    expect(s.turn).toBe(2);
    expect(s.sides.opponent.mana).toBe(BATTLE_RULES.manaPerTurn);
    expect(s.sides.opponent.hand).toHaveLength(5);
    expect(s.sides.opponent.deck).toHaveLength(oppDeck);
  });

  it('1ターンに1回だけ、カードを捨ててマナ+1', () => {
    let s = battle();
    const uid = s.sides.player.hand[0]?.uid ?? '';
    s = applyAction(s, { type: 'discardForMana', side: 'player', cardUid: uid });
    expect(s.sides.player.mana).toBe(BATTLE_RULES.firstTurnMana + 1);
    expect(s.sides.player.hand).toHaveLength(4);
    expect(canDiscardForMana(s, 'player')).toBe(false);
  });
});

describe('勝敗（AI 同士で最後まで対戦）', () => {
  it.each([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])('シード %i：必ず決着がつく', (seed) => {
    const { state, steps } = playOut(battle(seed, seed % 2 ? 'player' : 'opponent'));
    expect(state.phase).toBe('ended');
    expect(state.winner).not.toBeNull();
    expect(steps).toBeLessThan(5000);
  });

  it('ノックアウト勝ちは、負けた側のモンスターが全員ライフ0', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const { state } = playOut(battle(seed));
      if (state.endReason !== 'knockout' || state.winner === 'draw' || !state.winner) continue;
      const loser = state.winner === 'player' ? 'opponent' : 'player';
      expect(state.sides[loser].monsters.every((m) => m.life === 0)).toBe(true);
    }
  });

  it('決着後は行動できない', () => {
    const { state } = playOut(battle(3));
    expect(applyAction(state, { type: 'endTurn', side: state.active })).toBe(state);
  });

  it('ライフ倍率で敵の強さを調整できる', () => {
    const weak: Deck = enemyDeck;
    const s = createBattle({ name: 'P', deck: playerDeck }, { name: 'O', deck: weak, lifeScale: 0.5 }, 1, 'player');
    const full = battle(1);
    expect(s.sides.opponent.monsters[0]?.maxLife).toBeLessThan(full.sides.opponent.monsters[0]?.maxLife ?? 0);
  });
});
