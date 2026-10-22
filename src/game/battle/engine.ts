import { cardCatalog, getMonster, getSkill } from '../../data/cards.ts';
import { BATTLE_RULES } from '../../data/rules.ts';
import { STAT_LABEL, type SkillCard, type StatType } from '../cards/cardTypes.ts';
import type { Deck } from '../deck/deck.ts';
import { nextRandom, shuffle } from '../rng.ts';

/**
 * カードバトルのルール（DOM 非依存の純粋関数）。
 *
 * 【仮実装】指示書の構成（双方モンスター3体・ライフ・手札・マナ・攻撃/防御・対象選択・使用不可状態・
 * ターン進行・勝敗）に沿っているが、数値と細部は src/data/rules.ts の仮ルール。正式ルール資料が届いたら合わせる。
 */
export type Side = 'player' | 'opponent';

export const SIDE_LABEL: Readonly<Record<Side, string>> = { player: 'あなた', opponent: '相手' };

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
}

/** いまのマナの量 */
export function manaOf(side: BattleSide): number {
  return side.manaPile.length;
}

/** 防御待ちの攻撃 */
export interface PendingAttack {
  readonly attacker: Side;
  readonly userUid: string;
  readonly targetUid: string;
  readonly cardId: string;
  readonly stat: StatType;
  readonly power: number;
}

/** main＝技を使う（攻撃）、defense＝相手の防御待ち、mana＝攻撃のあとのマナ化 */
export type BattlePhase = 'main' | 'defense' | 'mana' | 'ended';
export type BattleWinner = Side | 'draw';

export interface LogEntry {
  readonly turn: number;
  readonly text: string;
}

export interface BattleState {
  readonly seed: number;
  /** 手番の通し番号（1から） */
  readonly turn: number;
  readonly active: Side;
  readonly first: Side;
  readonly phase: BattlePhase;
  readonly pending: PendingAttack | null;
  readonly sides: Readonly<Record<Side, BattleSide>>;
  readonly winner: BattleWinner | null;
  readonly endReason: 'knockout' | 'turnLimit' | null;
  readonly log: readonly LogEntry[];
  readonly nextUid: number;
}

export type BattleAction =
  | {
      readonly type: 'useCard';
      readonly side: Side;
      readonly cardUid: string;
      /** 技を使うモンスター（省略時は使えるモンスターを自動で選ぶ） */
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
  });
  let uid = 1;
  const p = drawCards(base(player, 'p', pShuffle.items), BATTLE_RULES.initialHand, uid);
  uid = p.nextUid;
  const o = drawCards(base(opponent, 'o', oShuffle.items), BATTLE_RULES.initialHand, uid);
  uid = o.nextUid;
  const sides: Record<Side, BattleSide> = { player: p.side, opponent: o.side };
  // 先攻・後攻ともマナ0から（先攻初手の特例は PS版の確認待ちのため入れていない）
  return {
    seed: s,
    turn: 1,
    active: firstSide,
    first: firstSide,
    phase: 'main',
    pending: null,
    sides,
    winner: null,
    endReason: null,
    log: [{ turn: 1, text: `${SIDE_LABEL[firstSide]}の先攻で始まった。` }],
    nextUid: uid,
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

/** 手札のカードを今使えるか（使用不可状態の表示に使う） */
export function cardUsability(state: BattleState, side: Side, cardUid: string): Usability {
  if (state.phase === 'ended') return NO('対戦は終了しました');
  const hand = findHandCard(state, side, cardUid);
  if (!hand) return NO('手札にありません');
  const skill = getSkill(hand.cardId);
  const owner = state.sides[side].monsters.filter((m) => m.cardId === skill.monsterId);
  if (owner.length === 0) return NO('このカードを使えるモンスターがいません');
  if (owner.every((m) => m.life <= 0)) return NO('使えるモンスターが倒れています');

  if (state.phase === 'defense') {
    const pending = state.pending;
    if (!pending || pending.attacker === side) return NO('相手の防御を待っています');
    if (skill.effect.type !== 'defense') return NO('いまは防御カードしか使えません');
    if (skill.stat.type !== pending.stat) return NO(`${STAT_LABEL[pending.stat]}攻撃は防げません`);
    if (manaOf(state.sides[side]) < skill.cost) return NO('マナが足りません');
    return YES;
  }

  if (state.active !== side) return NO('相手のターンです');
  if (state.phase === 'mana') return NO('マナ化の間は技を使えません');
  if (skill.effect.type === 'defense') return NO('防御カードは相手の攻撃を受けたときに使います');
  if (manaOf(state.sides[side]) < skill.cost) return NO('マナが足りません');
  if (availableUsers(state, side, skill).length === 0) return NO('使えるモンスターは行動済みです');
  if (skill.effect.type === 'attack' && aliveMonsters(state.sides[otherSide(side)]).length === 0) {
    return NO('攻撃できる相手がいません');
  }
  return YES;
}

/** 対象を選ぶ必要がある技なら、選べる対象を返す */
export function targetsFor(state: BattleState, side: Side, skill: SkillCard): BattleMonster[] {
  if (skill.effect.type === 'attack') return aliveMonsters(state.sides[otherSide(side)]);
  if (skill.effect.type === 'heal') return aliveMonsters(state.sides[side]);
  return [];
}

/** 手札をマナにできるか（攻撃のあとのマナ化の間だけ。枚数の制限なし） */
export function canConvertToMana(state: BattleState, side: Side): boolean {
  return state.phase === 'mana' && state.active === side && state.sides[side].hand.length > 0;
}

/* ---------- 進行 ---------- */

function addLog(state: BattleState, text: string): BattleState {
  return { ...state, log: [...state.log, { turn: state.turn, text }] };
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
  return updateSide(state, side, { manaPile, discard: [...s.discard, ...paid] });
}

const nameOf = (cardId: string): string => cardCatalog.get(cardId)?.name ?? cardId;

function checkKnockout(state: BattleState): BattleState {
  const pAlive = aliveMonsters(state.sides.player).length;
  const oAlive = aliveMonsters(state.sides.opponent).length;
  if (pAlive > 0 && oAlive > 0) return state;
  const winner: BattleWinner = pAlive === 0 && oAlive === 0 ? 'draw' : pAlive === 0 ? 'opponent' : 'player';
  const ended: BattleState = { ...state, phase: 'ended', pending: null, winner, endReason: 'knockout' };
  return addLog(ended, winner === 'draw' ? '相打ちで引き分け。' : `${SIDE_LABEL[winner]}の勝ち！`);
}

function applyDamage(state: BattleState, targetUid: string, damage: number): BattleState {
  const found = findMonster(state, targetUid);
  if (!found) return state;
  const life = Math.max(0, found.monster.life - damage);
  let next = updateMonster(state, targetUid, { life });
  next = addLog(next, `${nameOf(found.monster.cardId)}に${damage}ダメージ。${life === 0 ? '倒れた！' : ''}`);
  return checkKnockout(next);
}

function resolvePending(state: BattleState, reduction: number): BattleState {
  const pending = state.pending;
  if (!pending) return state;
  const damage = Math.max(0, pending.power - reduction);
  const next: BattleState = { ...state, phase: 'main', pending: null };
  return applyDamage(next, pending.targetUid, damage);
}

function startTurn(state: BattleState, side: Side): BattleState {
  const s = state.sides[side];
  const monsters = s.monsters.map((m) => ({ ...m, acted: false }));
  const need = Math.max(0, BATTLE_RULES.refillHandTo - s.hand.length);
  const drawn = drawCards({ ...s, monsters }, need, state.nextUid);
  let next: BattleState = { ...state, active: side, phase: 'main', nextUid: drawn.nextUid };
  next = updateSide(next, side, drawn.side);
  return addLog(next, `${SIDE_LABEL[side]}のターン。`);
}

function judgeByLife(state: BattleState): BattleState {
  const total = (side: Side): number => state.sides[side].monsters.reduce((sum, m) => sum + m.life, 0);
  const p = total('player');
  const o = total('opponent');
  const winner: BattleWinner = p === o ? 'draw' : p > o ? 'player' : 'opponent';
  const ended: BattleState = { ...state, phase: 'ended', winner, endReason: 'turnLimit' };
  return addLog(ended, `手番の上限に達した。残りライフ ${p} 対 ${o} で${winner === 'draw' ? '引き分け' : `${SIDE_LABEL[winner]}の勝ち`}。`);
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
      return addLog({ ...state, phase: 'mana' }, `${SIDE_LABEL[action.side]}のマナ化。`);
    }
    case 'convertToMana': {
      if (!canConvertToMana(state, action.side)) return state;
      const s = state.sides[action.side];
      const card = s.hand.find((c) => c.uid === action.cardUid);
      if (!card) return state;
      const next = updateSide(state, action.side, {
        hand: s.hand.filter((c) => c.uid !== action.cardUid),
        manaPile: [...s.manaPile, card.cardId],
      });
      return addLog(next, `${SIDE_LABEL[action.side]}は${nameOf(card.cardId)}をマナにした（マナ${manaOf(next.sides[action.side])}）。`);
    }
    case 'endTurn': {
      if (state.phase !== 'mana' || state.active !== action.side) return state;
      const turn = state.turn + 1;
      if (turn > BATTLE_RULES.turnLimit) return judgeByLife({ ...state, turn });
      return startTurn({ ...state, turn }, otherSide(action.side));
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
  const skill = getSkill(hand.cardId);
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
  next = addLog(next, `${nameOf(user.cardId)}の「${skill.name}」！`);

  switch (skill.effect.type) {
    case 'attack': {
      if (!target) return state;
      if (skill.effect.pierce) return applyDamage(next, target.uid, skill.stat.value);
      return {
        ...next,
        phase: 'defense',
        pending: {
          attacker: side,
          userUid: user.uid,
          targetUid: target.uid,
          cardId: skill.id,
          stat: skill.stat.type,
          power: skill.stat.value,
        },
      };
    }
    case 'heal': {
      if (!target) return state;
      const healed = Math.min(target.maxLife, target.life + skill.stat.value);
      next = updateMonster(next, target.uid, { life: healed });
      return addLog(next, `${nameOf(target.cardId)}のライフが${healed - target.life}回復。`);
    }
    case 'mana': {
      // 仮カードの効果：山札の上から数枚をそのままマナにする（マナは必ずカード1枚＝1マナ）
      const s = next.sides[side];
      const moved = s.deck.slice(0, skill.stat.value);
      next = updateSide(next, side, { deck: s.deck.slice(moved.length), manaPile: [...s.manaPile, ...moved] });
      return addLog(next, `山札の上から${moved.length}枚をマナにした。`);
    }
    case 'draw': {
      const drawn = drawCards(next.sides[side], skill.stat.value, next.nextUid);
      next = updateSide({ ...next, nextUid: drawn.nextUid }, side, drawn.side);
      return addLog(next, `カードを${drawn.drawn}枚引いた。`);
    }
    case 'defense':
      return state;
  }
}

function defend(state: BattleState, side: Side, cardUid: string | null): BattleState {
  const pending = state.pending;
  if (state.phase !== 'defense' || !pending || pending.attacker === side) return state;
  if (cardUid === null) return resolvePending(addLog(state, `${SIDE_LABEL[side]}は防御しなかった。`), 0);
  if (!cardUsability(state, side, cardUid).usable) return state;
  const hand = findHandCard(state, side, cardUid);
  if (!hand) return state;
  const skill = getSkill(hand.cardId);
  let next = removeFromHand(state, side, cardUid);
  next = payMana(next, side, skill.cost);
  next = addLog(next, `${SIDE_LABEL[side]}は「${skill.name}」で防御！ダメージ-${skill.stat.value}。`);
  return resolvePending(next, skill.stat.value);
}

/** 行動を待っている側（防御待ちなら防御側） */
export function actingSide(state: BattleState): Side | null {
  if (state.phase === 'ended') return null;
  if (state.phase === 'defense' && state.pending) return otherSide(state.pending.attacker);
  return state.active;
}
