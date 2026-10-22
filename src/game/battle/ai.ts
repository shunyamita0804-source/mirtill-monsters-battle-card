import { getPlayCard, getSupport, skillsOf } from '../../data/cards.ts';
import type { PlayCard, SkillCard, StatType, SupportCard } from '../cards/cardTypes.ts';
import {
  aliveMonsters,
  attackPower,
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
  readonly def: PlayCard;
}

interface SkillOption extends Option {
  readonly def: SkillCard;
}

const isSkillOption = (o: Option): o is SkillOption => o.def.kind === 'skill';

function usableOptions(state: BattleState, side: Side): Option[] {
  return state.sides[side].hand
    .filter((c) => cardUsability(state, side, c.uid).usable)
    .map((card) => ({ card, def: getPlayCard(card.cardId) }));
}

/** その能力の攻撃技を持つ、生きているモンスターの数（'all' はどれかの攻撃技を持つ数） */
function attackersWith(state: BattleState, side: Side, stat: StatType | 'all'): number {
  return aliveMonsters(state.sides[side]).filter((m) =>
    skillsOf(m.cardId).some((k) => k.effect.type === 'attack' && (stat === 'all' || k.stat.type === stat)),
  ).length;
}

/** 全体カードが自分にとってどれだけ得か（自分の攻撃が強くなる・相手の攻撃が弱くなるほど大きい） */
function fieldScore(state: BattleState, side: Side, card: SupportCard): number {
  const e = card.effect;
  if (e.type !== 'field') return 0;
  return e.modifier * (attackersWith(state, side, e.stat) - attackersWith(state, otherSide(side), e.stat));
}

/** 山札を動かす効果の枚数（ドロー・山札からマナ） */
function deckAmount(card: PlayCard): number {
  if (card.kind === 'skill') return card.stat.value;
  const e = card.effect;
  return e.type === 'draw' || e.type === 'mana' ? e.value : 0;
}

export function chooseAction(state: BattleState, side: Side): BattleAction | null {
  if (state.phase === 'ended') return null;

  if (state.phase === 'defense') return chooseDefense(state, side);

  if (state.active !== side) return null;
  if (state.phase === 'mana') return chooseManaAction(state, side);
  const options = usableOptions(state, side);
  const mine = state.sides[side];
  const enemies = aliveMonsters(state.sides[otherSide(side)]);

  // 1. ライフが半分以下の味方を回復（技・サポートどちらでも）
  const wounded = aliveMonsters(mine)
    .filter((m) => m.life <= m.maxLife / 2)
    .sort((a, b) => a.life / a.maxLife - b.life / b.maxLife)[0];
  const heal = options.find((o) => o.def.effect.type === 'heal');
  if (wounded && heal) {
    return { type: 'useCard', side, cardUid: heal.card.uid, targetUid: wounded.uid };
  }

  // 2. 全体カード：いまの場より自分に得になるときだけ出す（入れ替え合いでマナを無駄にしない）
  const current = state.field ? fieldScore(state, side, getSupport(state.field.cardId)) : 0;
  const field = options
    .filter((o): o is Option & { def: SupportCard } => o.def.kind === 'support' && o.def.duration === 'field')
    .map((o) => ({ o, score: fieldScore(state, side, o.def) }))
    .sort((a, b) => b.score - a.score)[0];
  if (field && field.score > 0 && field.score > current) return { type: 'useCard', side, cardUid: field.o.card.uid };

  // 3. 攻撃：倒せる相手がいれば倒し、いなければ一番強い攻撃をライフの少ない相手へ
  const attacks = options.filter(isSkillOption).filter((o) => o.def.effect.type === 'attack');
  if (attacks.length > 0 && enemies.length > 0) {
    const byPower = [...attacks].sort((a, b) => attackPower(state, b.def) - attackPower(state, a.def));
    for (const option of byPower) {
      const kill = enemies.filter((e) => e.life <= attackPower(state, option.def)).sort((a, b) => b.life - a.life)[0];
      if (kill) return attackAction(state, side, option, kill.uid);
    }
    const weakest = [...enemies].sort((a, b) => a.life - b.life)[0];
    const strongest = byPower[0];
    if (weakest && strongest) return attackAction(state, side, strongest, weakest.uid);
  }

  // 4. マナ・ドロー
  // 山札が足りないと負けになるので、山札を動かす効果は山札に余裕があるときだけ。
  // ドローは手札が少ないとき、山札からマナはマナが少ないときだけ使う
  const support = options.find((o) => {
    if (mine.deck.length <= deckAmount(o.def) + 15) return false;
    if (o.def.effect.type === 'draw') return mine.hand.length <= 3;
    if (o.def.effect.type === 'mana') return manaOf(mine) <= 2;
    return false;
  });
  if (support) return { type: 'useCard', side, cardUid: support.card.uid };

  // 5. 使えるカードがなければ攻撃を終えてマナ化へ
  return { type: 'endAttack', side };
}

/** 防御・回避カードか */
const isGuard = (c: HandCard): boolean => ['defense', 'evade'].includes(getPlayCard(c.cardId).effect.type);

/** 守備カードの強さ（並べ替え用） */
const guardValue = (c: HandCard): number => {
  const card = getPlayCard(c.cardId);
  return card.kind === 'skill' ? card.stat.value : 0;
};

/**
 * マナ化（仮の思考）：残す手札を最大2枚に絞り、残りをすべてマナにする。
 * - 防御・回避カード1枚：いまのマナで払える中で一番強いもの（相手の攻撃に備える）
 * - 技・サポート1枚：マナ化し終えたあとのマナで払える中で一番重いもの（次のターンに使う）
 * マナ化するたびにマナ+1・手札-1 なので「マナ化し終えたあとのマナ」は途中で変わらず、残す札が安定する。
 */
function chooseManaAction(state: BattleState, side: Side): BattleAction {
  const mine = state.sides[side];
  const mana = manaOf(mine);
  const cost = (c: HandCard): number => getPlayCard(c.cardId).cost;
  const keepDefense = mine.hand.filter((c) => isGuard(c) && cost(c) <= mana).sort((a, b) => guardValue(b) - guardValue(a))[0];
  const others = mine.hand.filter((c) => c !== keepDefense && !isGuard(c));
  const manaAfter = mana + mine.hand.length - (keepDefense ? 1 : 0) - 1;
  const keepSkill = [...others].sort((a, b) => cost(b) - cost(a)).find((c) => cost(c) <= manaAfter);
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
  const options = usableOptions(state, side).filter(isSkillOption);
  const evade = options.filter((o) => o.def.effect.type === 'evade').sort((a, b) => a.def.cost - b.def.cost)[0];
  if (evade && (damage >= 3 || (target !== undefined && damage >= target.life))) {
    return { type: 'defend', side, cardUid: evade.card.uid };
  }
  const defense = options.filter((o) => o.def.effect.type === 'defense').sort((a, b) => b.def.stat.value - a.def.stat.value)[0];
  if (defense) return { type: 'defend', side, cardUid: defense.card.uid };
  return end;
}

function attackAction(state: BattleState, side: Side, option: SkillOption, targetUid: string): BattleAction {
  const targets = targetsFor(state, side, option.def);
  const target = targets.find((t) => t.uid === targetUid) ?? targets[0];
  const user = availableUsers(state, side, option.def)[0];
  return {
    type: 'useCard',
    side,
    cardUid: option.card.uid,
    ...(user ? { userUid: user.uid } : {}),
    ...(target ? { targetUid: target.uid } : {}),
  };
}
