import { getSkill } from '../../data/cards.ts';
import type { SkillCard } from '../cards/cardTypes.ts';
import {
  aliveMonsters,
  availableUsers,
  canDiscardForMana,
  cardUsability,
  otherSide,
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

  if (state.phase === 'defense') {
    const pending = state.pending;
    if (!pending || pending.attacker === side) return null;
    const defenses = usableOptions(state, side).sort((a, b) => b.skill.stat.value - a.skill.stat.value);
    const best = defenses[0];
    return { type: 'defend', side, cardUid: best ? best.card.uid : null };
  }

  if (state.active !== side) return null;
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
  const support = options.find((o) => o.skill.effect.type === 'mana' || o.skill.effect.type === 'draw');
  if (support) return { type: 'useCard', side, cardUid: support.card.uid };

  // 4. 使えるカードがなければ1枚捨ててマナを得る（防御カードが余っていればそれ、なければ一番重いカード）
  if (canDiscardForMana(state, side) && mine.hand.length > 0) {
    const defenses = mine.hand.filter((c) => getSkill(c.cardId).effect.type === 'defense');
    const pool = defenses.length > 2 ? defenses : mine.hand;
    const discard = [...pool].sort((a, b) => getSkill(b.cardId).cost - getSkill(a.cardId).cost)[0];
    if (discard) return { type: 'discardForMana', side, cardUid: discard.uid };
  }

  return { type: 'endTurn', side };
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
