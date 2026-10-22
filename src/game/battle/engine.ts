import { getMonster, getPlayCard, getSkill, getSupport } from '../../data/cards.ts';
import { BATTLE_RULES } from '../../data/rules.ts';
import { cardName } from '../../i18n/content.ts';
import { t } from '../../i18n/i18n.ts';
import { statLabel, type PlayCard, type SkillCard, type StatType, type SupportCard } from '../cards/cardTypes.ts';
import type { Deck } from '../deck/deck.ts';
import { nextRandom, shuffle } from '../rng.ts';

/**
 * カードバトルのルール（DOM 非依存の純粋関数）。
 *
 * 【仮実装】指示書の構成（双方モンスター3体・ライフ・手札・マナ・攻撃/防御・対象選択・使用不可状態・
 * ターン進行・勝敗）に沿っているが、数値と細部は src/data/rules.ts の仮ルール。正式ルール資料が届いたら合わせる。
 */
export type Side = 'player' | 'opponent';

/** 陣営の呼び名（いまの言語。「あなた」「相手」） */
export function sideLabel(side: Side): string {
  return t(`battle.side.${side}`);
}

export function otherSide(side: Side): Side {
  return side === 'player' ? 'opponent' : 'player';
}

export interface BattleMonster {
  readonly uid: string;
  readonly cardId: string;
  readonly maxLife: number;
  readonly life: number;
  /** このターンに技を使ったか */
  readonly acted: boolean;
}

export interface HandCard {
  readonly uid: string;
  readonly cardId: string;
}

export interface BattleSide {
  readonly name: string;
  readonly monsters: readonly BattleMonster[];
  /** 山札（先頭が一番上） */
  readonly deck: readonly string[];
  readonly hand: readonly HandCard[];
  readonly discard: readonly string[];
  /** マナにしたカード（積んだ順。先頭が一番古い）。マナの量＝枚数 */
  readonly manaPile: readonly string[];
  /** このターンに使ったサポートの回数（回数制限のまとまりごと）。ターン開始で空に戻す */
  readonly turnUsage: Readonly<Record<string, number>>;
}

/** 場に出ている全体カード（場に1枚だけ） */
export interface FieldCard {
  readonly cardId: string;
  readonly owner: Side;
}

/** いまのマナの量 */
export function manaOf(side: BattleSide): number {
  return side.manaPile.length;
}

/** 守備待ちの攻撃 */
export interface PendingAttack {
  readonly attacker: Side;
  readonly userUid: string;
  readonly targetUid: string;
  readonly cardId: string;
  readonly stat: StatType;
  /** 攻撃の威力（場の全体カードの増減を反映した値） */
  readonly power: number;
  /** 守備側がこの攻撃に使ったカード（使った順）。守備がすべて終わってからまとめてダメージを計算する */
  readonly responses: readonly string[];
}

/** main＝技を使う（攻撃）、defense＝相手の防御待ち、mana＝攻撃のあとのマナ化 */
export type BattlePhase = 'main' | 'defense' | 'mana' | 'ended';
export type BattleWinner = Side | 'draw';

export interface LogEntry {
  readonly turn: number;
  readonly text: string;
}

/**
 * 効果音を鳴らすきっかけ（ルール上の結果が確定した瞬間に1件ずつ記録する。画面は seq で「まだ鳴らしていない分」だけ鳴らす）
 * - manaSpend：マナを支払った（1回の支払いで1件。何枚でも1件）
 * - evade：回避が成功してダメージ0が確定した
 * - hit：攻撃が命中してダメージを与えた（strong＝強攻撃。いまは仮に「必要マナ3以上の技」）
 * 防御でダメージ0になったときは記録しない（防御の音は未承認のため無音）
 */
export type BattleFxKind = 'manaSpend' | 'evade' | 'hitNormal' | 'hitStrong';
export interface BattleFx {
  readonly seq: number;
  readonly kind: BattleFxKind;
  readonly side: Side;
}

/** 強攻撃（命中の音を「強」にする）とみなす必要マナ。仮の基準（ユーザー指定 2026-10-22。正式な技が決まったら見直す） */
export const STRONG_ATTACK_COST = 3;

export interface BattleState {
  readonly seed: number;
  /** 手番の通し番号（1から） */
  readonly turn: number;
  readonly active: Side;
  readonly first: Side;
  readonly phase: BattlePhase;
  readonly pending: PendingAttack | null;
  readonly sides: Readonly<Record<Side, BattleSide>>;
  /** 場の全体カード（なければ null） */
  readonly field: FieldCard | null;
  readonly winner: BattleWinner | null;
  /** knockout＝3体KO、deckOut＝引くべきカードを引けなかった（山札切れ） */
  readonly endReason: 'knockout' | 'deckOut' | null;
  /** このターンにあと何枚マナにできるか（null＝制限なし。先攻1ターン目だけ制限あり） */
  readonly manaConvertLimit: number | null;
  readonly log: readonly LogEntry[];
  readonly nextUid: number;
  /** 効果音のきっかけ（新しい順に最大20件だけ残す） */
  readonly fx: readonly BattleFx[];
  readonly fxSeq: number;
}

export type BattleAction =
  | {
      readonly type: 'useCard';
      readonly side: Side;
      readonly cardUid: string;
      /** 技を使うモンスター（省略時は使えるモンスターを自動で選ぶ。サポートには不要） */
      readonly userUid?: string;
      /** 対象（攻撃：相手モンスター、回復：味方モンスター） */
      readonly targetUid?: string;
    }
  | { readonly type: 'defend'; readonly side: Side; readonly cardUid: string | null }
  /** 攻撃を終えてマナ化へ進む */
  | { readonly type: 'endAttack'; readonly side: Side }
  /** マナ化：手札1枚をマナにする（マナ化の間は何回でも） */
  | { readonly type: 'convertToMana'; readonly side: Side; readonly cardUid: string }
  | { readonly type: 'endTurn'; readonly side: Side };

export interface CombatantSetup {
  readonly name: string;
  readonly deck: Deck;
  /** ライフ倍率（敵の強さ調整・仮） */
  readonly lifeScale?: number;
}

/* ---------- 開始 ---------- */

function makeMonsters(prefix: string, ids: readonly string[], scale: number): BattleMonster[] {
  return ids.map((cardId, i) => {
    const maxLife = Math.max(1, Math.round(getMonster(cardId).life * scale));
    return { uid: `${prefix}-m${i + 1}`, cardId, maxLife, life: maxLife, acted: false };
  });
}

function drawCards(side: BattleSide, count: number, nextUid: number): { side: BattleSide; nextUid: number; drawn: number } {
  const n = Math.max(0, Math.min(count, side.deck.length));
  const drawnIds = side.deck.slice(0, n);
  let uid = nextUid;
  const hand = [...side.hand, ...drawnIds.map((cardId) => ({ uid: `c${uid++}`, cardId }))];
  return { side: { ...side, deck: side.deck.slice(n), hand }, nextUid: uid, drawn: n };
}

export function createBattle(
  player: CombatantSetup,
  opponent: CombatantSetup,
  seed: number,
  first?: Side,
): BattleState {
  let s = seed;
  const pShuffle = shuffle(player.deck.skills, s);
  s = pShuffle.seed;
  const oShuffle = shuffle(opponent.deck.skills, s);
  s = oShuffle.seed;
  let firstSide = first;
  if (!firstSide) {
    const r = nextRandom(s);
    s = r.seed;
    firstSide = r.value < 0.5 ? 'player' : 'opponent';
  }
  const base = (setup: CombatantSetup, prefix: string, deck: string[]): BattleSide => ({
    name: setup.name,
    monsters: makeMonsters(prefix, setup.deck.monsters, setup.lifeScale ?? 1),
    deck,
    hand: [],
    discard: [],
    manaPile: [],
    turnUsage: {},
  });
  const sides: Record<Side, BattleSide> = { player: base(player, 'p', pShuffle.items), opponent: base(opponent, 'o', oShuffle.items) };
  // PS版：最初に手札を引くのは先攻だけ。後攻は自分の最初のドローで5枚引く
  const dealt = drawCards(sides[firstSide], BATTLE_RULES.initialHand, 1);
  sides[firstSide] = dealt.side;
  const uid = dealt.nextUid;
  // 先攻1ターン目（PS版）：攻撃はなく、すぐマナ化。マナにできるのは決まった枚数まで
  return {
    seed: s,
    turn: 1,
    active: firstSide,
    first: firstSide,
    phase: 'mana',
    pending: null,
    sides,
    field: null,
    winner: null,
    endReason: null,
    manaConvertLimit: BATTLE_RULES.firstTurnManaLimit,
    log: [
      { turn: 1, text: t(`battle.log.start.${firstSide}`) },
      { turn: 1, text: t('battle.log.firstTurnMana', { n: BATTLE_RULES.firstTurnManaLimit }) },
    ],
    nextUid: uid,
    fx: [],
    fxSeq: 0,
  };
}

/* ---------- 参照用 ---------- */

export function aliveMonsters(side: BattleSide): BattleMonster[] {
  return side.monsters.filter((m) => m.life > 0);
}

export function findMonster(state: BattleState, uid: string): { side: Side; monster: BattleMonster } | null {
  for (const side of ['player', 'opponent'] as const) {
    const monster = state.sides[side].monsters.find((m) => m.uid === uid);
    if (monster) return { side, monster };
  }
  return null;
}

export function findHandCard(state: BattleState, side: Side, cardUid: string): HandCard | undefined {
  return state.sides[side].hand.find((c) => c.uid === cardUid);
}

/** その技を使えるモンスター（適合・生存・未行動） */
export function availableUsers(state: BattleState, side: Side, skill: SkillCard): BattleMonster[] {
  return state.sides[side].monsters.filter((m) => m.cardId === skill.monsterId && m.life > 0 && !m.acted);
}

export interface Usability {
  readonly usable: boolean;
  readonly reason: string | null;
}

const NO: (reason: string) => Usability = (reason) => ({ usable: false, reason });
const YES: Usability = { usable: true, reason: null };

/** サポートの残り使用回数（制限なしなら null） */
export function supportUsesLeft(state: BattleState, side: Side, card: SupportCard): number | null {
  if (!card.limitGroup || card.limitPerTurn === undefined) return null;
  return card.limitPerTurn - (state.sides[side].turnUsage[card.limitGroup] ?? 0);
}

function supportUsability(state: BattleState, side: Side, card: SupportCard): Usability {
  if (state.phase === 'defense') return NO(t('battle.ng.defenseOnly'));
  if (state.active !== side) return NO(t('battle.ng.opponentTurn'));
  if (state.phase === 'mana') return NO(t('battle.ng.manaPhase'));
  if (manaOf(state.sides[side]) < card.cost) return NO(t('battle.ng.noMana'));
  const left = supportUsesLeft(state, side, card);
  if (left !== null && left <= 0) return NO(t('battle.ng.usedThisTurn'));
  if (card.effect.type === 'heal' && aliveMonsters(state.sides[side]).length === 0) return NO(t('battle.ng.noHealTarget'));
  return YES;
}

/** 手札のカードを今使えるか（使用不可状態の表示に使う） */
export function cardUsability(state: BattleState, side: Side, cardUid: string): Usability {
  if (state.phase === 'ended') return NO(t('battle.ng.ended'));
  const hand = findHandCard(state, side, cardUid);
  if (!hand) return NO(t('battle.ng.notInHand'));
  const card = getPlayCard(hand.cardId);
  if (card.kind === 'support') return supportUsability(state, side, card);
  const skill = card;
  const owner = state.sides[side].monsters.filter((m) => m.cardId === skill.monsterId);
  if (owner.length === 0) return NO(t('battle.ng.noOwner'));
  if (owner.every((m) => m.life <= 0)) return NO(t('battle.ng.ownerDown'));

  if (state.phase === 'defense') {
    const pending = state.pending;
    if (!pending || pending.attacker === side) return NO(t('battle.ng.waitDefense'));
    const type = skill.effect.type;
    if (type !== 'defense' && type !== 'evade') return NO(t('battle.ng.defenseOnly'));
    // 守備に使えるのは、狙われたモンスターの防御・回避カードだけ
    const target = state.sides[side].monsters.find((m) => m.uid === pending.targetUid);
    if (!target || target.cardId !== skill.monsterId) return NO(t('battle.ng.notTarget'));
    if (skill.stat.type !== pending.stat) return NO(t('battle.ng.wrongStat', { stat: statLabel(pending.stat) }));
    const attack = getSkill(pending.cardId).effect;
    if (attack.type === 'attack' && type === 'defense' && attack.unblockable) return NO(t('battle.ng.unblockable'));
    if (attack.type === 'attack' && type === 'evade' && attack.undodgeable) return NO(t('battle.ng.undodgeable'));
    if (manaOf(state.sides[side]) < skill.cost) return NO(t('battle.ng.noMana'));
    return YES;
  }

  if (state.active !== side) return NO(t('battle.ng.opponentTurn'));
  if (state.phase === 'mana') return NO(t('battle.ng.manaPhase'));
  if (skill.effect.type === 'defense' || skill.effect.type === 'evade') return NO(t('battle.ng.defenseOnAttack'));
  if (manaOf(state.sides[side]) < skill.cost) return NO(t('battle.ng.noMana'));
  if (availableUsers(state, side, skill).length === 0) return NO(t('battle.ng.acted'));
  if (skill.effect.type === 'attack' && aliveMonsters(state.sides[otherSide(side)]).length === 0) {
    return NO(t('battle.ng.noAttackTarget'));
  }
  return YES;
}

/** 対象を選ぶ必要があるカードなら、選べる対象を返す */
export function targetsFor(state: BattleState, side: Side, card: PlayCard): BattleMonster[] {
  if (card.effect.type === 'attack') return aliveMonsters(state.sides[otherSide(side)]);
  if (card.effect.type === 'heal') return aliveMonsters(state.sides[side]);
  return [];
}

/** 場の全体カードによる、その能力の攻撃のダメージの増減 */
export function fieldModifier(state: BattleState, stat: StatType): number {
  if (!state.field) return 0;
  const e = getSupport(state.field.cardId).effect;
  if (e.type !== 'field') return 0;
  return e.stat === 'all' || e.stat === stat ? e.modifier : 0;
}

/** 攻撃の威力（場の増減を反映。0未満にはならない） */
export function attackPower(state: BattleState, skill: SkillCard): number {
  return Math.max(0, skill.stat.value + fieldModifier(state, skill.stat.type));
}

/** 手札をマナにできるか（攻撃のあとのマナ化の間だけ。枚数の制限なし） */
export function canConvertToMana(state: BattleState, side: Side): boolean {
  return (
    state.phase === 'mana' &&
    state.active === side &&
    state.sides[side].hand.length > 0 &&
    (state.manaConvertLimit === null || state.manaConvertLimit > 0)
  );
}

/* ---------- 進行 ---------- */

function addLog(state: BattleState, text: string): BattleState {
  return { ...state, log: [...state.log, { turn: state.turn, text }] };
}

function addFx(state: BattleState, kind: BattleFxKind, side: Side): BattleState {
  const seq = (state.fxSeq ?? 0) + 1;
  return { ...state, fxSeq: seq, fx: [...(state.fx ?? []), { seq, kind, side }].slice(-20) };
}

function updateSide(state: BattleState, side: Side, patch: Partial<BattleSide>): BattleState {
  return { ...state, sides: { ...state.sides, [side]: { ...state.sides[side], ...patch } } };
}

function updateMonster(state: BattleState, uid: string, patch: Partial<BattleMonster>): BattleState {
  const found = findMonster(state, uid);
  if (!found) return state;
  const monsters = state.sides[found.side].monsters.map((m) => (m.uid === uid ? { ...m, ...patch } : m));
  return updateSide(state, found.side, { monsters });
}

function removeFromHand(state: BattleState, side: Side, cardUid: string): BattleState {
  const s = state.sides[side];
  const card = s.hand.find((c) => c.uid === cardUid);
  if (!card) return state;
  return updateSide(state, side, {
    hand: s.hand.filter((c) => c.uid !== cardUid),
    discard: [...s.discard, card.cardId],
  });
}

/** マナを支払う。支払ったカードはマナから捨て札へ移す（呼ぶ前に足りることを確認しておく） */
function payMana(state: BattleState, side: Side, cost: number): BattleState {
  const s = state.sides[side];
  const n = Math.max(0, Math.min(cost, s.manaPile.length));
  const oldest = BATTLE_RULES.manaPayOrder === 'oldest';
  const paid = oldest ? s.manaPile.slice(0, n) : s.manaPile.slice(s.manaPile.length - n);
  const manaPile = oldest ? s.manaPile.slice(n) : s.manaPile.slice(0, s.manaPile.length - n);
  const next = updateSide(state, side, { manaPile, discard: [...s.discard, ...paid] });
  return n > 0 ? addFx(next, 'manaSpend', side) : next;
}

const nameOf = (cardId: string): string => cardName(cardId);

function checkKnockout(state: BattleState): BattleState {
  const pAlive = aliveMonsters(state.sides.player).length;
  const oAlive = aliveMonsters(state.sides.opponent).length;
  if (pAlive > 0 && oAlive > 0) return state;
  // 双方が同時に全滅したら攻撃側（いまの手番の側）の勝ち。引き分けにはならない
  const winner: Side = pAlive === 0 && oAlive === 0 ? state.active : pAlive === 0 ? 'opponent' : 'player';
  const ended: BattleState = { ...state, phase: 'ended', pending: null, winner, endReason: 'knockout' };
  return addLog(ended, t(`battle.log.win.${winner}`));
}

/** 引くべきカードを引けなかった側の負け */
function loseByDeckOut(state: BattleState, loser: Side): BattleState {
  const winner = otherSide(loser);
  const ended: BattleState = { ...state, phase: 'ended', pending: null, winner, endReason: 'deckOut' };
  return addLog(ended, t(`battle.log.deckOut.${loser}`));
}

function applyDamage(state: BattleState, targetUid: string, damage: number): BattleState {
  const found = findMonster(state, targetUid);
  if (!found) return state;
  const life = Math.max(0, found.monster.life - damage);
  let next = updateMonster(state, targetUid, { life });
  next = addLog(next, t(life === 0 ? 'battle.log.damageDown' : 'battle.log.damage', { name: nameOf(found.monster.cardId), n: damage }));
  return checkKnockout(next);
}

/**
 * 守備がすべて終わったあとのダメージ計算。
 * 回避が1枚でもあれば0（「回避しても半分」の攻撃なら半分・端数切り捨て）。なければ防御の合計だけ減らす。
 * 反射・無効などは正式カードが決まってから足す。
 */
export function pendingDamage(pending: PendingAttack): number {
  const cards = pending.responses.map(getSkill);
  if (cards.some((c) => c.effect.type === 'evade')) {
    const attack = getSkill(pending.cardId).effect;
    return attack.type === 'attack' && attack.halfOnEvade ? Math.floor(pending.power / 2) : 0;
  }
  const reduction = cards.filter((c) => c.effect.type === 'defense').reduce((sum, c) => sum + c.stat.value, 0);
  return Math.max(0, pending.power - reduction);
}

function resolvePending(state: BattleState): BattleState {
  const pending = state.pending;
  if (!pending) return state;
  const next: BattleState = { ...state, phase: 'main', pending: null };
  const damage = pendingDamage(pending);
  const target = findMonster(state, pending.targetUid);
  const evaded = pending.responses.some((id) => getSkill(id).effect.type === 'evade');
  let withFx = next;
  if (damage > 0) withFx = addFx(next, hitKind(pending.cardId), pending.attacker);
  else if (evaded) withFx = addFx(next, 'evade', target?.side ?? otherSide(pending.attacker));
  return applyDamage(withFx, pending.targetUid, damage);
}

/** 命中の音の種類（強攻撃は仮に必要マナ STRONG_ATTACK_COST 以上の技） */
function hitKind(skillId: string): BattleFxKind {
  return getSkill(skillId).cost >= STRONG_ATTACK_COST ? 'hitStrong' : 'hitNormal';
}

/**
 * ターン開始とドローステップ。
 * 手札が5枚より少なければ5枚まで引く。5枚あれば山札の一番上を1枚そのままマナにする。
 * どちらも山札が足りなければ、その時点で負け。
 */
function startTurn(state: BattleState, side: Side): BattleState {
  const s = state.sides[side];
  const monsters = s.monsters.map((m) => ({ ...m, acted: false }));
  let next: BattleState = { ...state, active: side, phase: 'main', manaConvertLimit: null };
  next = addLog(updateSide(next, side, { monsters, turnUsage: {} }), t(`battle.log.turn.${side}`));
  const need = BATTLE_RULES.refillHandTo - s.hand.length;
  if (need > 0) {
    if (s.deck.length < need) return loseByDeckOut(next, side);
    const drawn = drawCards(next.sides[side], need, next.nextUid);
    return updateSide({ ...next, nextUid: drawn.nextUid }, side, drawn.side);
  }
  const top = s.deck[0];
  if (top === undefined) return loseByDeckOut(next, side);
  next = updateSide(next, side, { deck: s.deck.slice(1), manaPile: [...s.manaPile, top] });
  return addLog(next, t('battle.log.fullHandMana', { n: BATTLE_RULES.refillHandTo }));
}

/**
 * 行動を適用する。ルール上できない行動は無視して state をそのまま返す
 * （UI の二重タップや AI の誤りで状態が壊れないようにする）。
 */
export function applyAction(state: BattleState, action: BattleAction): BattleState {
  if (state.phase === 'ended') return state;
  switch (action.type) {
    case 'useCard':
      return useCard(state, action.side, action.cardUid, action.userUid, action.targetUid);
    case 'defend':
      return defend(state, action.side, action.cardUid);
    case 'endAttack': {
      if (state.phase !== 'main' || state.active !== action.side) return state;
      return addLog({ ...state, phase: 'mana' }, t(`battle.log.manaPhase.${action.side}`));
    }
    case 'convertToMana': {
      if (!canConvertToMana(state, action.side)) return state;
      const s = state.sides[action.side];
      const card = s.hand.find((c) => c.uid === action.cardUid);
      if (!card) return state;
      const limit = state.manaConvertLimit;
      const next = updateSide({ ...state, manaConvertLimit: limit === null ? null : limit - 1 }, action.side, {
        hand: s.hand.filter((c) => c.uid !== action.cardUid),
        manaPile: [...s.manaPile, card.cardId],
      });
      return addLog(
        next,
        t('battle.log.convert', { side: sideLabel(action.side), card: nameOf(card.cardId), n: manaOf(next.sides[action.side]) }),
      );
    }
    case 'endTurn': {
      if (state.phase !== 'mana' || state.active !== action.side) return state;
      return startTurn({ ...state, turn: state.turn + 1 }, otherSide(action.side));
    }
  }
}

function useCard(
  state: BattleState,
  side: Side,
  cardUid: string,
  userUid: string | undefined,
  targetUid: string | undefined,
): BattleState {
  if (state.phase !== 'main') return state;
  if (!cardUsability(state, side, cardUid).usable) return state;
  const hand = findHandCard(state, side, cardUid);
  if (!hand) return state;
  const card = getPlayCard(hand.cardId);
  if (card.kind === 'support') return useSupport(state, side, cardUid, card, targetUid);
  const skill = card;
  const users = availableUsers(state, side, skill);
  const user = userUid ? users.find((m) => m.uid === userUid) : users[0];
  if (!user) return state;

  const targets = targetsFor(state, side, skill);
  let target: BattleMonster | undefined;
  if (skill.effect.type === 'attack' || skill.effect.type === 'heal') {
    target = targetUid ? targets.find((m) => m.uid === targetUid) : undefined;
    if (!target) return state;
  }

  let next = removeFromHand(state, side, cardUid);
  next = payMana(next, side, skill.cost);
  next = updateMonster(next, user.uid, { acted: true });
  next = addLog(next, t('battle.log.skill', { name: nameOf(user.cardId), skill: cardName(skill) }));

  switch (skill.effect.type) {
    case 'attack': {
      if (!target) return state;
      const power = attackPower(state, skill);
      // 防御も回避もできない攻撃は、守備を待たずにダメージ
      if (skill.effect.unblockable && skill.effect.undodgeable) {
        return applyDamage(power > 0 ? addFx(next, hitKind(skill.id), side) : next, target.uid, power);
      }
      return {
        ...next,
        phase: 'defense',
        pending: {
          attacker: side,
          userUid: user.uid,
          targetUid: target.uid,
          cardId: skill.id,
          stat: skill.stat.type,
          power,
          responses: [],
        },
      };
    }
    case 'heal':
      return target ? healMonster(next, target, skill.stat.value) : state;
    case 'mana':
      return deckToMana(next, side, skill.stat.value);
    case 'draw':
      return drawByEffect(next, side, skill.stat.value);
    case 'defense':
    case 'evade':
      return state;
  }
}

function healMonster(state: BattleState, target: BattleMonster, value: number): BattleState {
  const healed = Math.min(target.maxLife, target.life + value);
  const next = updateMonster(state, target.uid, { life: healed });
  return addLog(next, t('battle.log.heal', { name: nameOf(target.cardId), n: healed - target.life }));
}

/** 山札の上から数枚をそのままマナにする（マナは必ずカード1枚＝1マナ）。決められた枚数を動かせなければ負け */
function deckToMana(state: BattleState, side: Side, count: number): BattleState {
  const s = state.sides[side];
  if (s.deck.length < count) return loseByDeckOut(state, side);
  const moved = s.deck.slice(0, count);
  const next = updateSide(state, side, { deck: s.deck.slice(moved.length), manaPile: [...s.manaPile, ...moved] });
  return addLog(next, t('battle.log.deckToMana', { n: moved.length }));
}

/** 効果のドロー。指示された枚数を引けなければ負け */
function drawByEffect(state: BattleState, side: Side, count: number): BattleState {
  if (state.sides[side].deck.length < count) return loseByDeckOut(state, side);
  const drawn = drawCards(state.sides[side], count, state.nextUid);
  const next = updateSide({ ...state, nextUid: drawn.nextUid }, side, drawn.side);
  return addLog(next, t('battle.log.draw', { n: drawn.drawn }));
}

/**
 * サポートを使う。モンスターの行動は使わない。回数制限のあるものは使用回数を数える。
 * 全体カードは場に残り、すでに場にあったカードは持ち主の捨て札へ。
 */
function useSupport(state: BattleState, side: Side, cardUid: string, card: SupportCard, targetUid: string | undefined): BattleState {
  let target: BattleMonster | undefined;
  if (card.effect.type === 'heal') {
    target = targetUid ? targetsFor(state, side, card).find((m) => m.uid === targetUid) : undefined;
    if (!target) return state;
  }
  const s = state.sides[side];
  let next: BattleState;
  if (card.duration === 'field') {
    // 場に置く（捨て札には行かない）
    next = updateSide(state, side, { hand: s.hand.filter((c) => c.uid !== cardUid) });
  } else {
    next = removeFromHand(state, side, cardUid);
  }
  next = payMana(next, side, card.cost);
  if (card.limitGroup) {
    const usage = next.sides[side].turnUsage;
    next = updateSide(next, side, { turnUsage: { ...usage, [card.limitGroup]: (usage[card.limitGroup] ?? 0) + 1 } });
  }
  next = addLog(next, t('battle.log.support', { side: sideLabel(side), card: cardName(card) }));
  const e = card.effect;
  switch (e.type) {
    case 'heal':
      return target ? healMonster(next, target, e.value) : state;
    case 'draw':
      return drawByEffect(next, side, e.value);
    case 'mana':
      return deckToMana(next, side, e.value);
    case 'field': {
      const old = next.field;
      if (old) {
        const owner = next.sides[old.owner];
        next = updateSide(next, old.owner, { discard: [...owner.discard, old.cardId] });
        next = addLog(next, t('battle.log.fieldDiscard', { card: nameOf(old.cardId) }));
      }
      return addLog({ ...next, field: { cardId: card.id, owner: side } }, t('battle.log.fieldEnter', { card: cardName(card) }));
    }
  }
}

/**
 * 守備：防御・回避カードを1枚使う（条件を満たす限り1回の攻撃に何枚でも）。
 * cardUid が null なら守備を終えて、ダメージを計算する。
 */
function defend(state: BattleState, side: Side, cardUid: string | null): BattleState {
  const pending = state.pending;
  if (state.phase !== 'defense' || !pending || pending.attacker === side) return state;
  if (cardUid === null) {
    const text = t(pending.responses.length === 0 ? 'battle.log.noDefense' : 'battle.log.defenseDone', { side: sideLabel(side) });
    return resolvePending(addLog(state, text));
  }
  if (!cardUsability(state, side, cardUid).usable) return state;
  const hand = findHandCard(state, side, cardUid);
  if (!hand) return state;
  const skill = getSkill(hand.cardId);
  let next = removeFromHand(state, side, cardUid);
  next = payMana(next, side, skill.cost);
  next = { ...next, pending: { ...pending, responses: [...pending.responses, skill.id] } };
  const params = { side: sideLabel(side), skill: cardName(skill), v: skill.stat.value };
  return addLog(next, t(skill.effect.type === 'evade' ? 'battle.log.evade' : 'battle.log.guard', params));
}

/** 行動を待っている側（防御待ちなら防御側） */
export function actingSide(state: BattleState): Side | null {
  if (state.phase === 'ended') return null;
  if (state.phase === 'defense' && state.pending) return otherSide(state.pending.attacker);
  return state.active;
}
