import { describe, expect, it } from 'vitest';
import { getSkill, monsterId, skillId, SKILLS, supportId } from '../src/data/cards.ts';
import { BATTLE_RULES } from '../src/data/rules.ts';
import { skillValue } from '../src/game/cards/cardTypes.ts';
import { chooseAction } from '../src/game/battle/ai.ts';
import {
  actingSide,
  applyAction,
  canConvertToMana,
  cardUsability,
  createBattle,
  manaOf,
  type BattleState,
  type Side,
} from '../src/game/battle/engine.ts';
import { buildAutoDeck, createPlaceholderStarterDeck, type Deck } from '../src/game/deck/deck.ts';

const playerDeck = createPlaceholderStarterDeck();
const enemyDeck = buildAutoDeck(['d', 'e', 'f'].map(monsterId));

function battle(seed = 1, first: Side = 'player'): BattleState {
  return createBattle({ name: 'P', deck: playerDeck }, { name: 'O', deck: enemyDeck }, seed, first);
}

/** マナ用のカード（中身は何でもよい） */
const MANA_CARD = skillId('a', 1);

/** 手札とマナを差し替えたテスト用の状態（攻撃の場面にする） */
function withHand(state: BattleState, side: Side, cardIds: string[], mana: number): BattleState {
  return {
    ...state,
    phase: 'main',
    manaConvertLimit: null,
    sides: {
      ...state.sides,
      [side]: {
        ...state.sides[side],
        hand: cardIds.map((cardId, i) => ({ uid: `t${i}`, cardId })),
        manaPile: Array.from({ length: mana }, () => MANA_CARD),
      },
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
  it('双方モンスター3体・マナ0。最初に手札を引くのは先攻だけ（後攻は自分の最初のドローで5枚）', () => {
    const s = battle();
    for (const side of ['player', 'opponent'] as const) {
      expect(s.sides[side].monsters).toHaveLength(3);
      expect(manaOf(s.sides[side])).toBe(0);
    }
    expect(s.sides.player.hand).toHaveLength(BATTLE_RULES.initialHand);
    expect(s.sides.player.deck).toHaveLength(60 - BATTLE_RULES.initialHand);
    expect(s.sides.opponent.hand).toHaveLength(0);
    expect(s.sides.opponent.deck).toHaveLength(60);
  });

  it('先攻の1ターン目はドロー・攻撃なしで、すぐマナ化。マナにできるのは2枚まで', () => {
    let s = battle();
    expect(s.active).toBe('player');
    expect(s.phase).toBe('mana');
    expect(s.sides.player.hand).toHaveLength(5);
    expect(applyAction(s, { type: 'endAttack', side: 'player' })).toBe(s);
    const uids = s.sides.player.hand.map((c) => c.uid);
    for (const uid of uids) s = applyAction(s, { type: 'convertToMana', side: 'player', cardUid: uid });
    expect(manaOf(s.sides.player)).toBe(BATTLE_RULES.firstTurnManaLimit);
    expect(s.sides.player.hand).toHaveLength(5 - BATTLE_RULES.firstTurnManaLimit);
    expect(canConvertToMana(s, 'player')).toBe(false);
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

/** 相手の、指定モンスターの uid */
function enemyUid(s: BattleState, key: string): string {
  return s.sides.opponent.monsters.find((m) => m.cardId === monsterId(key))?.uid ?? '';
}

const lifeOf = (s: BattleState, uid: string): number => s.sides.opponent.monsters.find((m) => m.uid === uid)?.life ?? -1;

describe('攻撃と守備', () => {
  it('攻撃 → 守備待ち → 防御カードを2枚使い、守備を終えてからまとめてダメージ', () => {
    let s = withHand(battle(), 'player', [skillId('a', 2)], 5); // a-2: ちから5の攻撃
    s = withHand(s, 'opponent', [skillId('e', 4), skillId('e', 4)], 3); // e-4: ちから防御（-2）
    const target = enemyUid(s, 'e');
    const before = lifeOf(s, target);
    s = applyAction(s, { type: 'useCard', side: 'player', cardUid: 't0', targetUid: target });
    expect(s.phase).toBe('defense');
    const cost = getSkill(skillId('a', 2)).cost;
    expect(manaOf(s.sides.player)).toBe(5 - cost);
    // 使った技と、支払ったマナのカードは捨て札へ
    expect(s.sides.player.discard).toHaveLength(1 + cost);
    expect(actingSide(s)).toBe('opponent');
    s = applyAction(s, { type: 'defend', side: 'opponent', cardUid: 't0' });
    // 1枚使っても守備は続く（まだダメージは入らない）
    expect(s.phase).toBe('defense');
    expect(lifeOf(s, target)).toBe(before);
    s = applyAction(s, { type: 'defend', side: 'opponent', cardUid: 't1' });
    expect(s.pending?.responses).toHaveLength(2);
    s = applyAction(s, { type: 'defend', side: 'opponent', cardUid: null });
    expect(s.phase).toBe('main');
    const reduction = skillValue(getSkill(skillId('e', 4))) * 2;
    expect(lifeOf(s, target)).toBe(before - (skillValue(getSkill(skillId('a', 2))) - reduction));
    expect(manaOf(s.sides.opponent)).toBe(3 - getSkill(skillId('e', 4)).cost * 2);
  });

  it('回避カードを使うとダメージ0', () => {
    let s = withHand(battle(), 'player', [skillId('a', 2)], 5);
    s = withHand(s, 'opponent', [skillId('f', 5)], 2); // f-5: ちから攻撃の回避
    expect(getSkill(skillId('f', 5)).effect.type).toBe('evade');
    const target = enemyUid(s, 'f');
    const before = lifeOf(s, target);
    s = applyAction(s, { type: 'useCard', side: 'player', cardUid: 't0', targetUid: target });
    s = applyAction(s, { type: 'defend', side: 'opponent', cardUid: 't0' });
    s = applyAction(s, { type: 'defend', side: 'opponent', cardUid: null });
    expect(lifeOf(s, target)).toBe(before);
  });

  it('能力が違う守備カードと、狙われていないモンスターの守備カードは使えない', () => {
    let s = withHand(battle(), 'player', [skillId('a', 2)], 5);
    s = withHand(s, 'opponent', [skillId('f', 4), skillId('e', 4)], 3); // f-4: かしこさ防御、e-4: Eのちから防御
    const target = enemyUid(s, 'f');
    s = applyAction(s, { type: 'useCard', side: 'player', cardUid: 't0', targetUid: target });
    expect(cardUsability(s, 'opponent', 't0')).toMatchObject({ usable: false, reason: 'ちから攻撃には使えません' });
    expect(cardUsability(s, 'opponent', 't1')).toMatchObject({ usable: false, reason: '狙われたモンスターの守備カードではありません' });
    expect(applyAction(s, { type: 'defend', side: 'opponent', cardUid: 't0' })).toBe(s);
    const before = lifeOf(s, target);
    s = applyAction(s, { type: 'defend', side: 'opponent', cardUid: null });
    expect(lifeOf(s, target)).toBe(before - skillValue(getSkill(skillId('a', 2))));
  });

  it('防御も回避もできない攻撃は、守備を待たずにすぐダメージ', () => {
    let s = withHand(battle(), 'player', [skillId('d', 6)], 10); // d-6: 守備されない攻撃
    s = { ...s, sides: { ...s.sides, player: { ...s.sides.player, monsters: [...buildD(s)] } } };
    const target = s.sides.opponent.monsters[1];
    s = applyAction(s, { type: 'useCard', side: 'player', cardUid: 't0', targetUid: target?.uid ?? '' });
    expect(s.phase).toBe('main');
    expect(s.sides.opponent.monsters[1]?.life).toBe(Math.max(0, (target?.life ?? 0) - skillValue(getSkill(skillId('d', 6)))));
  });

  it('防御・回避カードは自分のターンには使えない', () => {
    const s = withHand(battle(), 'player', [skillId('a', 4), skillId('a', 5)], 5);
    expect(cardUsability(s, 'player', 't0').reason).toBe('防御・回避カードは相手の攻撃を受けたときに使います');
    expect(cardUsability(s, 'player', 't1').reason).toBe('防御・回避カードは相手の攻撃を受けたときに使います');
  });
});

/** プレイヤーの1体目を仮モンスターDに替える（守備されない攻撃のテスト用） */
function buildD(s: BattleState) {
  return s.sides.player.monsters.map((m, i) => (i === 0 ? { ...m, cardId: monsterId('d') } : m));
}

describe('使用不可状態', () => {
  it('マナ不足・行動済み・防御カード・相手のターン', () => {
    let s = withHand(battle(), 'player', [skillId('a', 3), skillId('a', 1), skillId('a', 1), skillId('a', 4)], 2);
    expect(cardUsability(s, 'player', 't0')).toMatchObject({ usable: false, reason: 'マナが足りません' });
    expect(cardUsability(s, 'player', 't3').usable).toBe(false); // 防御カード
    s = withHand(s, 'opponent', [skillId('d', 1)], 0);
    expect(cardUsability(s, 'opponent', 't0').reason).toBe('相手のターンです');
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

describe('ターン進行とドロー', () => {
  it('後攻の最初のドロー：手札0枚から5枚引く（マナは増えない）', () => {
    let s = battle();
    s = applyAction(s, { type: 'endTurn', side: 'player' });
    expect(s.active).toBe('opponent');
    expect(s.phase).toBe('main');
    expect(s.turn).toBe(2);
    expect(s.sides.opponent.hand).toHaveLength(5);
    expect(s.sides.opponent.manaPile).toEqual([]);
    expect(s.sides.opponent.deck).toHaveLength(55);
  });

  it('ドローで手札が5枚のままなら、山札の一番上を1枚マナにする', () => {
    let s = battle();
    s = applyAction(s, { type: 'endTurn', side: 'player' });
    s = applyAction(s, { type: 'endAttack', side: 'opponent' });
    const top = s.sides.player.deck[0];
    s = applyAction(s, { type: 'endTurn', side: 'opponent' });
    expect(s.sides.player.hand).toHaveLength(5);
    expect(s.sides.player.manaPile).toEqual([top]);
  });

  it('攻撃中はターン終了できない。攻撃終了でマナ化 → ターン終了。手札が減っていれば5枚まで引く', () => {
    let s = battle();
    s = applyAction(s, { type: 'endTurn', side: 'player' });
    expect(applyAction(s, { type: 'endTurn', side: 'opponent' })).toBe(s);
    s = applyAction(s, { type: 'endAttack', side: 'opponent' });
    expect(s.phase).toBe('mana');
    // 2ターン目以降はマナ化の枚数に制限なし
    for (const c of s.sides.opponent.hand) s = applyAction(s, { type: 'convertToMana', side: 'opponent', cardUid: c.uid });
    expect(s.sides.opponent.hand).toHaveLength(0);
    expect(manaOf(s.sides.opponent)).toBe(5);
    s = applyAction(s, { type: 'endTurn', side: 'opponent' });
    // 先攻は手札5枚のまま → 山札の一番上をマナに
    expect(s.active).toBe('player');
    expect(manaOf(s.sides.player)).toBe(1);
    s = applyAction(s, { type: 'endAttack', side: 'player' });
    s = applyAction(s, { type: 'endTurn', side: 'player' });
    // 後攻は手札0枚 → 5枚引く。マナは自動では増えない
    expect(s.sides.opponent.hand).toHaveLength(5);
    expect(manaOf(s.sides.opponent)).toBe(5);
  });

  it('マナ化の間は技を使えない。マナにしたカードは捨て札ではなくマナの山へ', () => {
    let s = battle();
    const first = s.sides.player.hand[0]?.uid ?? '';
    expect(cardUsability(s, 'player', first)).toMatchObject({ usable: false, reason: 'マナ化の間はカードを使えません' });
    s = applyAction(s, { type: 'convertToMana', side: 'player', cardUid: first });
    expect(s.sides.player.discard).toHaveLength(0);
    expect(s.sides.player.manaPile).toHaveLength(1);
  });

  it('マナに上限はない', () => {
    let s = withHand(battle(), 'player', [], 12);
    expect(manaOf(s.sides.player)).toBe(12);
    s = applyAction(s, { type: 'endAttack', side: 'player' });
    s = { ...s, sides: { ...s.sides, player: { ...s.sides.player, hand: [{ uid: 'x1', cardId: MANA_CARD }] } } };
    s = applyAction(s, { type: 'convertToMana', side: 'player', cardUid: 'x1' });
    expect(manaOf(s.sides.player)).toBe(13);
  });

  it('マナは新しくマナにしたカードから支払い、捨て札へ', () => {
    let s = withHand(battle(), 'player', [skillId('a', 2)], 0);
    s = { ...s, sides: { ...s.sides, player: { ...s.sides.player, manaPile: ['m1', 'm2', 'm3'] } } };
    const target = s.sides.opponent.monsters[0]?.uid ?? '';
    s = applyAction(s, { type: 'useCard', side: 'player', cardUid: 't0', targetUid: target });
    expect(getSkill(skillId('a', 2)).cost).toBe(2);
    expect(s.sides.player.manaPile).toEqual(['m1']);
    expect(s.sides.player.discard).toEqual([skillId('a', 2), 'm2', 'm3']);
  });

  it('マナの技（仮）は山札の上からカードをマナにする', () => {
    const manaSkill = SKILLS.find((k) => k.effect.type === 'mana');
    if (!manaSkill) throw new Error('mana skill');
    let s = withSkillUser(withHand(battle(), 'player', [manaSkill.id], manaSkill.cost), manaSkill.monsterId);
    const top = s.sides.player.deck.slice(0, skillValue(manaSkill));
    const deck = s.sides.player.deck.length;
    s = applyAction(s, { type: 'useCard', side: 'player', cardUid: 't0' });
    expect(s.sides.player.manaPile).toEqual(top);
    expect(s.sides.player.deck).toHaveLength(deck - skillValue(manaSkill));
  });

  it('手番の上限はない（手番が進んでも打ち切られない）', () => {
    let s: BattleState = { ...battle(), turn: 200 };
    s = applyAction(s, { type: 'endTurn', side: 'player' });
    expect(s.phase).toBe('main');
    expect(s.turn).toBe(201);
  });
});

/** プレイヤーの1体目を指定モンスターに替える */
function withSkillUser(s: BattleState, monster: string): BattleState {
  return {
    ...s,
    sides: {
      ...s.sides,
      player: { ...s.sides.player, monsters: s.sides.player.monsters.map((m, i) => (i === 0 ? { ...m, cardId: monster } : m)) },
    },
  };
}

/** 山札の枚数を減らしたテスト用の状態 */
function withDeck(s: BattleState, side: Side, count: number): BattleState {
  return { ...s, sides: { ...s.sides, [side]: { ...s.sides[side], deck: s.sides[side].deck.slice(0, count) } } };
}

describe('山札切れ', () => {
  it('ドローで5枚まで引けなければ、その時点で負け', () => {
    let s = battle();
    s = applyAction(s, { type: 'endTurn', side: 'player' });
    s = applyAction(s, { type: 'endAttack', side: 'opponent' });
    s = applyAction(s, { type: 'endTurn', side: 'opponent' });
    s = applyAction(s, { type: 'endAttack', side: 'player' });
    const two = s.sides.player.hand.slice(0, 2).map((c) => c.uid);
    for (const uid of two) s = applyAction(s, { type: 'convertToMana', side: 'player', cardUid: uid });
    s = applyAction(s, { type: 'endTurn', side: 'player' });
    s = applyAction(s, { type: 'endAttack', side: 'opponent' });
    s = withDeck(s, 'player', 1); // 2枚引く必要があるのに1枚しかない
    s = applyAction(s, { type: 'endTurn', side: 'opponent' });
    expect(s.phase).toBe('ended');
    expect(s.winner).toBe('opponent');
    expect(s.endReason).toBe('deckOut');
  });

  it('手札5枚で山札が0枚なら、山札の一番上をマナにできず負け', () => {
    let s = withDeck(battle(), 'opponent', 0);
    s = applyAction(s, { type: 'endTurn', side: 'player' });
    expect(s.winner).toBe('player');
    expect(s.endReason).toBe('deckOut');
  });

  it('カードの効果で指示された枚数を引けなくても負け', () => {
    const drawSkill = SKILLS.find((k) => k.effect.type === 'draw');
    if (!drawSkill) throw new Error('draw skill');
    let s = withSkillUser(withHand(battle(), 'player', [drawSkill.id], drawSkill.cost), drawSkill.monsterId);
    s = withDeck(s, 'player', skillValue(drawSkill) - 1);
    s = applyAction(s, { type: 'useCard', side: 'player', cardUid: 't0' });
    expect(s.winner).toBe('opponent');
    expect(s.endReason).toBe('deckOut');
  });
});

describe('サポートカード', () => {
  it('旧ブリーダーにあたるサポートは、モンスターの行動を使わず、まとめて1ターンに1回まで', () => {
    let s = withHand(battle(), 'player', [supportId(2), supportId(3)], 5); // 仮サポート2：2枚引く、3：山札2枚をマナに
    s = applyAction(s, { type: 'useCard', side: 'player', cardUid: 't0' });
    expect(s.sides.player.hand).toHaveLength(1 + 2);
    expect(s.sides.player.monsters.every((m) => !m.acted)).toBe(true);
    expect(cardUsability(s, 'player', 't1')).toMatchObject({ usable: false, reason: 'このターンはもう使えません（1ターンに1回）' });
    // 次の自分のターンにはまた使える
    s = applyAction(s, { type: 'endAttack', side: 'player' });
    s = applyAction(s, { type: 'endTurn', side: 'player' });
    s = applyAction(s, { type: 'endAttack', side: 'opponent' });
    s = applyAction(s, { type: 'endTurn', side: 'opponent' });
    expect(cardUsability(s, 'player', 't1').usable).toBe(true);
  });

  it('回復のサポートは味方を選んでライフを戻す（上限は最初のライフ）', () => {
    let s = withHand(battle(), 'player', [supportId(1)], 5);
    const m = s.sides.player.monsters[0];
    if (!m) throw new Error('monster');
    s = { ...s, sides: { ...s.sides, player: { ...s.sides.player, monsters: s.sides.player.monsters.map((x, i) => (i === 0 ? { ...x, life: x.maxLife - 1 } : x)) } } };
    s = applyAction(s, { type: 'useCard', side: 'player', cardUid: 't0', targetUid: m.uid });
    expect(s.sides.player.monsters[0]?.life).toBe(m.maxLife);
  });

  it('全体カードは場に1枚だけ残り、双方の攻撃のダメージを変える。新しく出すと古い方は持ち主の捨て札へ', () => {
    let s = withHand(battle(), 'player', [supportId(4), skillId('a', 2)], 10); // 仮全体1：ちから攻撃-1
    s = applyAction(s, { type: 'useCard', side: 'player', cardUid: 't0' });
    expect(s.field).toEqual({ cardId: supportId(4), owner: 'player' });
    expect(s.sides.player.discard).not.toContain(supportId(4));
    // ちから5の攻撃が4になる
    const target = enemyUid(s, 'e');
    s = applyAction(s, { type: 'useCard', side: 'player', cardUid: 't1', targetUid: target });
    expect(s.pending?.power).toBe(skillValue(getSkill(skillId('a', 2))) - 1);
    s = applyAction(s, { type: 'defend', side: 'opponent', cardUid: null });
    // 相手が別の全体カードを出すと入れ替わる
    s = applyAction(s, { type: 'endAttack', side: 'player' });
    s = applyAction(s, { type: 'endTurn', side: 'player' });
    s = withHand(s, 'opponent', [supportId(6)], 3);
    s = { ...s, active: 'opponent' };
    s = applyAction(s, { type: 'useCard', side: 'opponent', cardUid: 't0' });
    expect(s.field).toEqual({ cardId: supportId(6), owner: 'opponent' });
    expect(s.sides.player.discard).toContain(supportId(4));
  });

  it('サポートは守備には使えない', () => {
    let s = withHand(battle(), 'player', [skillId('a', 2)], 5);
    s = withHand(s, 'opponent', [supportId(2)], 5);
    s = applyAction(s, { type: 'useCard', side: 'player', cardUid: 't0', targetUid: enemyUid(s, 'e') });
    expect(cardUsability(s, 'opponent', 't0').usable).toBe(false);
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

describe('効果音のきっかけ（1つの結果につき1回）', () => {
  const kinds = (s: BattleState, after: number): string[] => s.fx.filter((f) => f.seq > after).map((f) => f.kind);

  it('命中：必要マナ2の技は通常、3以上は強攻撃（仮の基準）。マナの支払いは1回の使用で1件', () => {
    let s = withHand(battle(), 'player', [skillId('a', 2), skillId('b', 3)], 9);
    s = withHand(s, 'opponent', [], 0);
    s = { ...s, sides: { ...s.sides, player: { ...s.sides.player, hand: [{ uid: 't0', cardId: skillId('a', 2) }, { uid: 't1', cardId: skillId('b', 3) }] } } };
    const target = enemyUid(s, 'e');
    let seq = s.fxSeq;
    s = applyAction(s, { type: 'useCard', side: 'player', cardUid: 't0', targetUid: target });
    expect(kinds(s, seq)).toEqual(['manaSpend']);
    seq = s.fxSeq;
    s = applyAction(s, { type: 'defend', side: 'opponent', cardUid: null });
    expect(kinds(s, seq)).toEqual(['hitNormal']);
    seq = s.fxSeq;
    s = applyAction(s, { type: 'useCard', side: 'player', cardUid: 't1', targetUid: target });
    s = applyAction(s, { type: 'defend', side: 'opponent', cardUid: null });
    expect(kinds(s, seq)).toEqual(['manaSpend', 'hitStrong']);
  });

  it('回避成功（ダメージ0）は回避の音だけ。命中の音は出ない', () => {
    let s = withHand(battle(), 'player', [skillId('a', 2)], 5);
    s = withHand(s, 'opponent', [skillId('f', 5)], 2);
    s = applyAction(s, { type: 'useCard', side: 'player', cardUid: 't0', targetUid: enemyUid(s, 'f') });
    s = applyAction(s, { type: 'defend', side: 'opponent', cardUid: 't0' });
    const seq = s.fxSeq;
    s = applyAction(s, { type: 'defend', side: 'opponent', cardUid: null });
    expect(kinds(s, seq)).toEqual(['evade']);
  });

  it('防御でダメージ0は無音（防御の音は未承認）', () => {
    let s = withHand(battle(), 'player', [skillId('a', 1)], 5); // ちから3
    s = withHand(s, 'opponent', [skillId('e', 4), skillId('e', 4)], 3); // -2 を2枚
    s = applyAction(s, { type: 'useCard', side: 'player', cardUid: 't0', targetUid: enemyUid(s, 'e') });
    s = applyAction(s, { type: 'defend', side: 'opponent', cardUid: 't0' });
    s = applyAction(s, { type: 'defend', side: 'opponent', cardUid: 't1' });
    const seq = s.fxSeq;
    s = applyAction(s, { type: 'defend', side: 'opponent', cardUid: null });
    expect(kinds(s, seq)).toEqual([]);
  });

  it('マナ化は1枚につきマナ化の音を1件。マナ消費の音は出さない', () => {
    let s = battle();
    const seq = s.fxSeq;
    const [c0, c1] = s.sides.player.hand;
    if (!c0 || !c1) throw new Error('hand');
    s = applyAction(s, { type: 'convertToMana', side: 'player', cardUid: c0.uid });
    expect(manaOf(s.sides.player)).toBe(1);
    expect(kinds(s, seq)).toEqual(['manaConvert']);
    s = applyAction(s, { type: 'convertToMana', side: 'player', cardUid: c1.uid });
    expect(kinds(s, seq)).toEqual(['manaConvert', 'manaConvert']);
  });

  it('マナ化できなかったとき（手札にないカード・上限を超えた）は音のきっかけを残さない', () => {
    let s = battle();
    const before = s.fxSeq;
    expect(applyAction(s, { type: 'convertToMana', side: 'player', cardUid: 'none' })).toBe(s);
    for (const c of s.sides.player.hand) s = applyAction(s, { type: 'convertToMana', side: 'player', cardUid: c.uid });
    // 最初のターンは決まった枚数まで。それ以上は記録しない
    expect(kinds(s, before)).toEqual(Array.from({ length: BATTLE_RULES.firstTurnManaLimit }, () => 'manaConvert'));
  });

  it('山札からマナが増えたとき（手札5枚のドロー・カードの効果）は、マナ化ではなく従来のマナ獲得', () => {
    // 手札5枚で相手の番が始まる → 山札の一番上が1枚マナに
    let s = withHand(battle(), 'opponent', Array.from({ length: BATTLE_RULES.refillHandTo }, () => MANA_CARD), 0);
    s = { ...s, phase: 'mana', active: 'player' };
    let seq = s.fxSeq;
    s = applyAction(s, { type: 'endTurn', side: 'player' });
    expect(manaOf(s.sides.opponent)).toBe(1);
    expect(kinds(s, seq)).toEqual(['manaGain']);
    // 「山札3枚をマナに」の技：支払いの音と、マナ獲得の音が1件ずつ
    s = withHand(battle(), 'player', [skillId('b', 6)], 1);
    seq = s.fxSeq;
    s = applyAction(s, { type: 'useCard', side: 'player', cardUid: 't0' });
    expect(manaOf(s.sides.player)).toBe(3);
    expect(kinds(s, seq)).toEqual(['manaSpend', 'manaGain']);
  });
});
