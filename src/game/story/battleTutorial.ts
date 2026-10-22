import type { BattleState } from '../battle/engine.ts';

/**
 * 最初の練習試合のヒント（バトルの場面に合わせて、それぞれ1回だけ）。DOM 非依存。
 * バトルのルール・操作は変えない。いまの場面で実際にできることだけを説明する。
 *
 * - monsters：最初に1回。自分と相手のモンスター3体とライフ
 * - firstMana：自分が先攻の1ターン目のマナ化（攻撃なし・2枚まで）。後攻なら出さない
 * - attack：自分の攻撃の場面
 * - mana：自分のマナ化（先攻1ターン目以外）。ターン終了の案内もここで
 * - defense：相手の攻撃で、守るカードを実際に選べるときだけ
 * - result：勝敗が決まったとき
 */
export type BattleHintId = 'monsters' | 'firstMana' | 'attack' | 'mana' | 'defense' | 'result';

export function nextBattleHint(state: BattleState, seen: ReadonlySet<BattleHintId>, canDefend: boolean): BattleHintId | null {
  const want = (id: BattleHintId): BattleHintId | null => (seen.has(id) ? null : id);
  if (state.phase === 'ended') return want('result');
  if (!seen.has('monsters')) return 'monsters';
  if (state.phase === 'defense') {
    return state.pending?.attacker === 'opponent' && canDefend ? want('defense') : null;
  }
  if (state.active !== 'player') return null;
  if (state.phase === 'mana') return state.manaConvertLimit !== null ? want('firstMana') : want('mana');
  if (state.phase === 'main') return want('attack');
  return null;
}
