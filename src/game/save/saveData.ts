import { cardCatalog } from '../../data/cards.ts';
import { CURRENCY, PACKS, RANK_ORDER, type RankId } from '../../data/economy.ts';
import {
  buildDeckFromCollection,
  countCards,
  createStarterCollection,
  createStarterDeck,
  isDeckValid,
  type Deck,
} from '../deck/deck.ts';

/**
 * セーブデータ（カード所持・通貨・パック解放・欠片・大会実績・ダンジョン進捗・デッキを一元管理）。
 *
 * - version で形式を管理し、古い形式は MIGRATIONS で順に変換する
 * - 読み込み時は normalizeSave() で型・範囲を確認し、壊れた値は既定値に戻す
 * - 変更はすべて「古いセーブを受け取り新しいセーブを返す」純粋関数で行う
 */
export const SAVE_VERSION = 2;

export type Gender = 'male' | 'female';
export type Direction = 'down' | 'up' | 'left' | 'right';

export interface Location {
  readonly mapId: string;
  readonly x: number;
  readonly y: number;
  readonly dir: Direction;
}

export interface TournamentRecord {
  /** 参加回数 */
  readonly entries: number;
  readonly wins: number;
  /** 初回優勝の景品を受け取ったか */
  readonly firstWinClaimed: boolean;
}

/** 進行中（または景品受け取り前）の大会 */
export interface ActiveTournament {
  readonly tournamentId: string;
  /** 参加ごとに一意のID。景品の二重受け取り防止に使う */
  readonly entryId: string;
  /** 次に戦う回戦（0始まり） */
  readonly round: number;
  readonly status: 'inProgress' | 'won' | 'lost';
}

export interface DungeonRecord {
  /** 開けた宝箱（恒久的に1回だけ） */
  readonly openedChests: readonly string[];
  readonly bossDefeated: boolean;
  readonly clears: number;
}

/** 探索中のダンジョン（倒した敵は探索ごとに復活する） */
export interface ActiveDungeon {
  readonly dungeonId: string;
  readonly floor: number;
  readonly defeatedEnemies: readonly string[];
}

export interface SaveData {
  readonly version: number;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly player: { readonly gender: Gender | null };
  readonly coins: number;
  readonly collection: Readonly<Record<string, number>>;
  readonly deck: Deck;
  readonly rank: RankId;
  readonly unlockedPacks: readonly string[];
  readonly tournaments: Readonly<Record<string, TournamentRecord>>;
  readonly activeTournament: ActiveTournament | null;
  /** 景品を受け取り済みの大会参加ID（二重受け取り防止） */
  readonly claimedEntries: readonly string[];
  readonly dungeons: Readonly<Record<string, DungeonRecord>>;
  readonly activeDungeon: ActiveDungeon | null;
  /** 集めた欠片ID */
  readonly fragments: readonly string[];
  /** 隠しモンスターを特別復元したか */
  readonly hiddenRestored: boolean;
  readonly location: Location;
  /** 処理済みの購入・受け取りID（二重決済・二重タップ防止。新しい順に最大 TRANSACTION_LOG_SIZE 件） */
  readonly processedTransactions: readonly string[];
  readonly stats: {
    readonly battlesWon: number;
    readonly battlesLost: number;
    readonly packsOpened: number;
  };
}

export const TRANSACTION_LOG_SIZE = 100;

export const DEFAULT_LOCATION: Location = { mapId: 'town', x: 7, y: 21, dir: 'up' };

export function createNewSave(now: Date = new Date()): SaveData {
  const iso = now.toISOString();
  return {
    version: SAVE_VERSION,
    createdAt: iso,
    updatedAt: iso,
    player: { gender: null },
    coins: CURRENCY.initial,
    collection: createStarterCollection(),
    deck: createStarterDeck(),
    rank: 'E',
    unlockedPacks: PACKS.filter((p) => p.unlockedFromStart).map((p) => p.id),
    tournaments: {},
    activeTournament: null,
    claimedEntries: [],
    dungeons: {},
    activeDungeon: null,
    fragments: [],
    hiddenRestored: false,
    location: DEFAULT_LOCATION,
    processedTransactions: [],
    stats: { battlesWon: 0, battlesLost: 0, packsOpened: 0 },
  };
}

/* ---------- 形式の変換（マイグレーション） ---------- */

type RawObject = Record<string, unknown>;

/**
 * version 1 → 2（2026-10-22）：同じカードの上限が4枚→3枚になり、スターターデッキも変わった。
 * 4枚入りのデッキのままだと大会・ダンジョンに出られなくなるので、1回だけ次のことをする（version で1回だけ）。
 * - 新しいスターターデッキのカードで足りない分を所持カードに足す（上限変更の補填）
 * - デッキが新しいルールで使えなければ、同じモンスター3体で所持カードから組み直す。それでも無理ならスターターデッキにする
 */
function migrateDeckRulesV2(raw: RawObject): RawObject {
  const collection: Record<string, number> = isObject(raw.collection) ? { ...(raw.collection as Record<string, number>) } : {};
  for (const [id, count] of Object.entries(countCards(createStarterDeck().skills))) {
    const owned = typeof collection[id] === 'number' ? collection[id] : 0;
    collection[id] = Math.max(owned, count);
  }
  const old = isObject(raw.deck) ? raw.deck : {};
  const deck: Deck = { monsters: asStringArray(old.monsters), skills: asStringArray(old.skills) };
  let next: Deck = deck;
  if (!isDeckValid(deck, collection)) {
    const rebuilt = buildDeckFromCollection(deck.monsters, collection);
    next = isDeckValid(rebuilt, collection) ? rebuilt : createStarterDeck();
  }
  return { ...raw, collection, deck: next };
}

/** version n → n+1 の変換。形式を変えるときはここに足し、SAVE_VERSION を上げる */
const MIGRATIONS: Readonly<Record<number, (raw: RawObject) => RawObject>> = {
  1: migrateDeckRulesV2,
};

export function migrate(raw: RawObject): RawObject | null {
  let current = raw;
  let version = typeof current.version === 'number' ? current.version : NaN;
  if (!Number.isInteger(version) || version < 1) return null;
  if (version > SAVE_VERSION) return null; // 新しいバージョンのセーブは読めない（上書きしない）
  while (version < SAVE_VERSION) {
    const step = MIGRATIONS[version];
    if (!step) return null;
    current = step(current);
    version += 1;
    current = { ...current, version };
  }
  return current;
}

/* ---------- 安全な読み込み ---------- */

const isObject = (v: unknown): v is RawObject => typeof v === 'object' && v !== null && !Array.isArray(v);
const asString = (v: unknown, fallback: string): string => (typeof v === 'string' ? v : fallback);
const asBool = (v: unknown, fallback: boolean): boolean => (typeof v === 'boolean' ? v : fallback);
const asCount = (v: unknown, fallback = 0): number =>
  typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.floor(v) : fallback;
const asStringArray = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);
const unique = (items: readonly string[]): string[] => [...new Set(items)];

const DIRECTIONS: readonly Direction[] = ['down', 'up', 'left', 'right'];

function normalizeCollection(v: unknown): Record<string, number> {
  const result: Record<string, number> = {};
  if (!isObject(v)) return result;
  for (const [id, count] of Object.entries(v)) {
    const n = asCount(count);
    if (n > 0 && cardCatalog.get(id)) result[id] = n;
  }
  return result;
}

function normalizeDeck(v: unknown): Deck {
  if (!isObject(v)) return createStarterDeck();
  const known = (id: string): boolean => cardCatalog.get(id) !== undefined;
  return {
    monsters: asStringArray(v.monsters).filter(known),
    skills: asStringArray(v.skills).filter(known),
  };
}

function normalizeLocation(v: unknown): Location {
  if (!isObject(v)) return DEFAULT_LOCATION;
  const dir = DIRECTIONS.includes(v.dir as Direction) ? (v.dir as Direction) : 'down';
  const x = typeof v.x === 'number' && Number.isFinite(v.x) ? Math.round(v.x) : NaN;
  const y = typeof v.y === 'number' && Number.isFinite(v.y) ? Math.round(v.y) : NaN;
  if (typeof v.mapId !== 'string' || Number.isNaN(x) || Number.isNaN(y)) return DEFAULT_LOCATION;
  return { mapId: v.mapId, x, y, dir };
}

function normalizeTournaments(v: unknown): Record<string, TournamentRecord> {
  const result: Record<string, TournamentRecord> = {};
  if (!isObject(v)) return result;
  for (const [id, r] of Object.entries(v)) {
    if (!isObject(r)) continue;
    result[id] = {
      entries: asCount(r.entries),
      wins: asCount(r.wins),
      firstWinClaimed: asBool(r.firstWinClaimed, false),
    };
  }
  return result;
}

function normalizeActiveTournament(v: unknown): ActiveTournament | null {
  if (!isObject(v) || typeof v.tournamentId !== 'string' || typeof v.entryId !== 'string') return null;
  const status = v.status === 'won' || v.status === 'lost' ? v.status : 'inProgress';
  return { tournamentId: v.tournamentId, entryId: v.entryId, round: asCount(v.round), status };
}

function normalizeDungeons(v: unknown): Record<string, DungeonRecord> {
  const result: Record<string, DungeonRecord> = {};
  if (!isObject(v)) return result;
  for (const [id, r] of Object.entries(v)) {
    if (!isObject(r)) continue;
    result[id] = {
      openedChests: unique(asStringArray(r.openedChests)),
      bossDefeated: asBool(r.bossDefeated, false),
      clears: asCount(r.clears),
    };
  }
  return result;
}

function normalizeActiveDungeon(v: unknown): ActiveDungeon | null {
  if (!isObject(v) || typeof v.dungeonId !== 'string') return null;
  return { dungeonId: v.dungeonId, floor: asCount(v.floor), defeatedEnemies: unique(asStringArray(v.defeatedEnemies)) };
}

/** 生データ（JSON.parse の結果）を検証してセーブデータにする。読めない場合は null */
export function normalizeSave(raw: unknown): SaveData | null {
  if (!isObject(raw)) return null;
  const migrated = migrate(raw);
  if (!migrated) return null;
  const base = createNewSave();
  const player = isObject(migrated.player) ? migrated.player : {};
  const stats = isObject(migrated.stats) ? migrated.stats : {};
  const rank = RANK_ORDER.includes(migrated.rank as RankId) ? (migrated.rank as RankId) : 'E';
  const startPacks = PACKS.filter((p) => p.unlockedFromStart).map((p) => p.id);
  return {
    version: SAVE_VERSION,
    createdAt: asString(migrated.createdAt, base.createdAt),
    updatedAt: asString(migrated.updatedAt, base.updatedAt),
    player: { gender: player.gender === 'male' || player.gender === 'female' ? player.gender : null },
    coins: asCount(migrated.coins, base.coins),
    collection: normalizeCollection(migrated.collection),
    deck: normalizeDeck(migrated.deck),
    rank,
    unlockedPacks: unique([
      ...startPacks,
      ...asStringArray(migrated.unlockedPacks).filter((id) => PACKS.some((p) => p.id === id)),
    ]),
    tournaments: normalizeTournaments(migrated.tournaments),
    activeTournament: normalizeActiveTournament(migrated.activeTournament),
    claimedEntries: unique(asStringArray(migrated.claimedEntries)),
    dungeons: normalizeDungeons(migrated.dungeons),
    activeDungeon: normalizeActiveDungeon(migrated.activeDungeon),
    fragments: unique(asStringArray(migrated.fragments)),
    hiddenRestored: asBool(migrated.hiddenRestored, false),
    location: normalizeLocation(migrated.location),
    processedTransactions: unique(asStringArray(migrated.processedTransactions)).slice(0, TRANSACTION_LOG_SIZE),
    stats: {
      battlesWon: asCount(stats.battlesWon),
      battlesLost: asCount(stats.battlesLost),
      packsOpened: asCount(stats.packsOpened),
    },
  };
}

/* ---------- よく使う変更 ---------- */

export function touch(save: SaveData, now: Date = new Date()): SaveData {
  return { ...save, updatedAt: now.toISOString() };
}

export function addCards(save: SaveData, cards: readonly { cardId: string; count: number }[]): SaveData {
  const collection = { ...save.collection };
  for (const { cardId, count } of cards) {
    if (count <= 0) continue;
    collection[cardId] = (collection[cardId] ?? 0) + count;
  }
  return { ...save, collection };
}

export function addCoins(save: SaveData, amount: number): SaveData {
  return { ...save, coins: Math.max(0, save.coins + amount) };
}

export function hasProcessed(save: SaveData, transactionId: string): boolean {
  return save.processedTransactions.includes(transactionId);
}

export function markProcessed(save: SaveData, transactionId: string): SaveData {
  return {
    ...save,
    processedTransactions: [transactionId, ...save.processedTransactions.filter((t) => t !== transactionId)].slice(
      0,
      TRANSACTION_LOG_SIZE,
    ),
  };
}

export function unlockPacks(save: SaveData, packIds: readonly string[]): SaveData {
  return { ...save, unlockedPacks: unique([...save.unlockedPacks, ...packIds]) };
}
