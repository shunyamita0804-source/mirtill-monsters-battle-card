import { getSkill } from '../../data/cards.ts';
import type { SkillCard } from '../cards/cardTypes.ts';
import {
  aliveMonsters,
  availableUsers,
  canConvertToMana,
  cardUsability,
  manaOf,
  otherSide,
  pendingDamage,
  targetsFor,
  type BattleAction,
  type BattleState,
  type HandCard,
  type Side,
} from './engine.ts';

/**
 * 対戦相手（およびQA用のオート操作）の思考。
 * 単純な優先順位で1手ずつ返す（強さの調整は仮）。返した行動は必ず applyAction で有効になるものを選ぶ。
 */
interface Option {
  readonly card: HandCard;
  readonly skill: SkillCard;
}

function usableOptions(state: BattleState, side: Side): Option[] {
  return state.sides[side].hand
    .filter((c) => cardUsability(state, side, c.uid).usable)
    .map((card) => ({ card, skill: getSkill(card.cardId) }));
}

export function chooseAction(state: BattleState, side: Side): BattleAction | null {
  if (state.phase === 'ended') return null;

  if (state.phase === 'defense') return chooseDefense(state, side);

  if (state.active !== side) return null;
  if (state.phase === 'mana') return chooseManaAction(state, side);
  const options = usableOptions(state, side);
  const mine = state.sides[side];
  const enemies = aliveMonsters(state.sides[otherSide(side)]);

  // 1. ライフが半分以下の味方を回復
  const wounded = aliveMonsters(mine)
    .filter((m) => m.life <= m.maxLife / 2)
    .sort((a, b) => a.life / a.maxLife - b.life / b.maxLife)[0];
  const heal = options.find((o) => o.skill.effect.type === 'heal');
  if (wounded && heal) {
    return { type: 'useCard', side, cardUid: heal.card.uid, targetUid: wounded.uid };
  }

  // 2. 攻撃：倒せる相手がいれば倒し、いなければ一番強い攻撃をライフの少ない相手へ
  const attacks = options.filter((o) => o.skill.effect.type === 'attack');
  if (attacks.length > 0 && enemies.length > 0) {
    const byPower = [...attacks].sort((a, b) => b.skill.stat.value - a.skill.stat.value);
    for (const option of byPower) {
      const kill = enemies.filter((e) => e.life <= option.skill.stat.value).sort((a, b) => b.life - a.life)[0];
      if (kill) return attackAction(state, side, option, kill.uid);
    }
    const weakest = [...enemies].sort((a, b) => a.life - b.life)[0];
    const strongest = byPower[0];
    if (weakest && strongest) return attackAction(state, side, strongest, weakest.uid);
  }

  // 3. マナ・ドロー
  // 山札が足りないと負けになるので、山札を動かす効果は山札に余裕があるときだけ
  const support = options.find(
    (o) => (o.skill.effect.type === 'mana' || o.skill.effect.type === 'draw') && mine.deck.length > o.skill.stat.value + 5,
  );
  if (support) return { type: 'useCard', side, cardUid: support.card.uid };

  // 4. 使えるカードがなければ攻撃を終えてマナ化へ
  return { type: 'endAttack', side };
}

/**
 * マナ化（仮の思考）：残す手札を最大2枚に絞り、残りをすべてマナにする。
 * - 防御・回避カード1枚：いまのマナで払える中で一番強いもの（相手の攻撃に備える）
 * - 技1枚：マナ化し終えたあとのマナで払える中で一番重いもの（次のターンに使う）
 * マナ化するたびにマナ+1・手札-1 なので「マナ化し終えたあとのマナ」は途中で変わらず、残す札が安定する。
 */
/** 防御・回避カードか */
const isGuard = (c: HandCard): boolean => ['defense', 'evade'].includes(getSkill(c.cardId).effect.type);

function chooseManaAction(state: BattleState, side: Side): BattleAction {
  const mine = state.sides[side];
  const mana = manaOf(mine);
  const byCost = (a: HandCard, b: HandCard): number => getSkill(b.cardId).cost - getSkill(a.cardId).cost;
  const keepDefense = mine.hand
    .filter((c) => isGuard(c) && getSkill(c.cardId).cost <= mana)
    .sort((a, b) => getSkill(b.cardId).stat.value - getSkill(a.cardId).stat.value)[0];
  const others = mine.hand.filter((c) => c !== keepDefense && !isGuard(c));
  const manaAfter = mana + mine.hand.length - (keepDefense ? 1 : 0) - 1;
  const keepSkill = [...others].sort(byCost).find((c) => getSkill(c.cardId).cost <= manaAfter);
  const convert = mine.hand.find((c) => c !== keepDefense && c !== keepSkill);
  if (convert && canConvertToMana(state, side)) return { type: 'convertToMana', side, cardUid: convert.uid };
  return { type: 'endTurn', side };
}

/**
 * 守備（仮の思考）：1枚ずつ選び、ダメージが0になるか使えるカードがなくなったら守備を終える。
 * 回避は倒されそうなときか大きなダメージのときに使い、そうでなければ防御で減らす。
 */
function chooseDefense(state: BattleState, side: Side): BattleAction | null {
  const pending = state.pending;
  if (!pending || pending.attacker === side) return null;
  const end: BattleAction = { type: 'defend', side, cardUid: null };
  const damage = pendingDamage(pending);
  if (damage === 0) return end;
  const target = state.sides[side].monsters.find((m) => m.uid === pending.targetUid);
  const options = usableOptions(state, side);
  const evade = options.filter((o) => o.skill.effect.type === 'evade').sort((a, b) => a.skill.cost - b.skill.cost)[0];
  if (evade && (damage >= 3 || (target !== undefined && damage >= target.life))) {
    return { type: 'defend', side, cardUid: evade.card.uid };
  }
  const defense = options.filter((o) => o.skill.effect.type === 'defense').sort((a, b) => b.skill.stat.value - a.skill.stat.value)[0];
  if (defense) return { type: 'defend', side, cardUid: defense.card.uid };
  return end;
}

function attackAction(state: BattleState, side: Side, option: Option, targetUid: string): BattleAction {
  const targets = targetsFor(state, side, option.skill);
  const target = targets.find((t) => t.uid === targetUid) ?? targets[0];
  const user = availableUsers(state, side, option.skill)[0];
  return {
    type: 'useCard',
    side,
    cardUid: option.card.uid,
    ...(user ? { userUid: user.uid } : {}),
    ...(target ? { targetUid: target.uid } : {}),
  };
}
