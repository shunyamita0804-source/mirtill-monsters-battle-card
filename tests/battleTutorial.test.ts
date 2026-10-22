import { describe, expect, it } from 'vitest';
import { ENCOUNTERS } from '../src/data/dungeons.ts';
import { applyAction, createBattle, type BattleState } from '../src/game/battle/engine.ts';
import { buildAutoDeck, createStarterDeck } from '../src/game/deck/deck.ts';
import { nextBattleHint, type BattleHintId } from '../src/game/story/battleTutorial.ts';

const practice = ENCOUNTERS['enc-practice'];
const start = (first: 'player' | 'opponent'): BattleState => {
  if (!practice) throw new Error('enc-practice');
  return createBattle(
    { name: 'P', deck: createStarterDeck() },
    { name: 'O', deck: buildAutoDeck(practice.monsters), lifeScale: practice.lifeScale },
    7,
    first,
  );
};
const seen = (...ids: BattleHintId[]): Set<BattleHintId> => new Set(ids);

describe('練習試合のヒント', () => {
  it('練習相手はスターターと同じモンスター3体（新しいカードは作らない）', () => {
    expect(practice?.monsters).toEqual(createStarterDeck().monsters);
  });

  it('最初はモンスターとライフの説明', () => {
    expect(nextBattleHint(start('player'), seen(), false)).toBe('monsters');
    expect(nextBattleHint(start('opponent'), seen(), false)).toBe('monsters');
  });

  it('先攻の1ターン目は「攻撃なし・マナ化2枚まで」の説明', () => {
    expect(nextBattleHint(start('player'), seen('monsters'), false)).toBe('firstMana');
  });

  it('後攻なら先攻だけの説明は出さず、相手の番は何も出さない', () => {
    const s = start('opponent');
    expect(nextBattleHint(s, seen('monsters'), false)).toBeNull();
    // 相手が1ターン目を終えると、自分（後攻）の番：攻撃の説明
    const mine = applyAction(s, { type: 'endTurn', side: 'opponent' });
    expect(mine.active).toBe('player');
    expect(mine.phase).toBe('main');
    expect(nextBattleHint(mine, seen('monsters'), false)).toBe('attack');
    // 攻撃を終えてマナ化：先攻1ターン目ではないので、ふつうのマナ化の説明
    const mana = applyAction(mine, { type: 'endAttack', side: 'player' });
    expect(mana.manaConvertLimit).toBeNull();
    expect(nextBattleHint(mana, seen('monsters', 'attack'), false)).toBe('mana');
  });

  it('守備の説明は、守るカードを選べるときだけ', () => {
    const s: BattleState = { ...start('opponent'), phase: 'defense', pending: { attacker: 'opponent' } as BattleState['pending'] };
    expect(nextBattleHint(s, seen('monsters'), true)).toBe('defense');
    expect(nextBattleHint(s, seen('monsters'), false)).toBeNull();
  });

  it('同じヒントは2度出さない。勝敗が決まったら勝ち方の説明', () => {
    expect(nextBattleHint(start('player'), seen('monsters', 'firstMana'), false)).toBeNull();
    const ended: BattleState = { ...start('player'), phase: 'ended', winner: 'opponent', endReason: 'knockout' };
    expect(nextBattleHint(ended, seen(), false)).toBe('result');
    expect(nextBattleHint(ended, seen('result'), false)).toBeNull();
  });
});
