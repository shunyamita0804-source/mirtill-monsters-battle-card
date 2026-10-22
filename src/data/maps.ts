import type { Direction } from '../game/save/saveData.ts';
import type { CardReward } from './tournaments.ts';

/**
 * 【仮マップ】街・家・カードショップ・大会会場・ダンジョンの歩行用マップ。
 *
 * 正式な街マップ・家・ショップ・大会会場の背景画像はこのリポジトリにないため（不足素材一覧を参照）、
 * 歩行・当たり判定・入口の確認用に、地形を記号で表した仮マップで実装している。
 * 正式背景が届いたら、背景画像を敷き、この記号マップは当たり判定用として位置を合わせ直す。
 *
 * 記号（TILE_INFO）：# 壁 / . 床 / , 草 / = 道 / T 木 / ~ 水 / H 大会会場 / A 家 / B ショップ / P カード練習場 / N となりの家
 *                  D 入口 / d 出口 / G ダンジョン入口
 *                  F 噴水 / S 下り階段 / U 上り階段・出口 / b ベッド / M 壁の地図 / h 本棚 / k 机 / s 棚・客席
 *                  c カウンター / n 人 / g ガチャマシン / x 対戦テーブル / r じゅうたん
 */
export interface TileInfo {
  readonly solid: boolean;
  readonly name: string;
}

export const TILE_INFO: Readonly<Record<string, TileInfo>> = {
  '#': { solid: true, name: '壁' },
  '.': { solid: false, name: '床' },
  ',': { solid: false, name: '草' },
  '=': { solid: false, name: '道' },
  T: { solid: true, name: '木' },
  '~': { solid: true, name: '水' },
  H: { solid: true, name: '大会会場' },
  A: { solid: true, name: '家' },
  B: { solid: true, name: 'カードショップ' },
  P: { solid: true, name: 'カード練習場' },
  N: { solid: true, name: 'となりの家' },
  D: { solid: false, name: '入口' },
  d: { solid: false, name: '出口' },
  F: { solid: true, name: '噴水' },
  S: { solid: false, name: '下り階段' },
  U: { solid: false, name: '上り階段' },
  G: { solid: false, name: 'ダンジョン入口' },
  b: { solid: true, name: 'ベッド' },
  M: { solid: true, name: '壁の地図' },
  h: { solid: true, name: '本棚' },
  k: { solid: true, name: '机' },
  s: { solid: true, name: '棚' },
  c: { solid: true, name: 'カウンター' },
  n: { solid: true, name: '人' },
  g: { solid: true, name: 'ガチャマシン' },
  x: { solid: true, name: '対戦テーブル' },
  r: { solid: false, name: 'じゅうたん' },
};

export type InteractAction =
  | 'deck'
  | 'dungeonSelect'
  | 'collection'
  | 'settings'
  | 'shopClerk'
  | 'gacha'
  | 'tournamentDesk'
  /** カード練習場の練習テーブル（練習試合） */
  | 'practiceTable'
  | 'message';

export type WarpTarget =
  | { readonly kind: 'map'; readonly mapId: string; readonly x: number; readonly y: number; readonly dir: Direction }
  | { readonly kind: 'floor'; readonly delta: 1 | -1 }
  | { readonly kind: 'leaveDungeon' }
  /** ダンジョン選択画面を開く（街のダンジョン入口） */
  | { readonly kind: 'dungeonGate' };

interface Rect {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

export interface InteractObject extends Rect {
  readonly type: 'interact';
  readonly id: string;
  readonly label: string;
  readonly action: InteractAction;
  readonly message?: string;
}

export interface WarpObject extends Rect {
  readonly type: 'warp';
  readonly id: string;
  readonly label: string;
  readonly target: WarpTarget;
}

export interface EnemyObject {
  readonly type: 'enemy';
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly encounterId: string;
  readonly boss: boolean;
}

export interface ChestObject {
  readonly type: 'chest';
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly reward: { readonly coins: number; readonly cards: readonly CardReward[] };
}

/**
 * 人（NPC）。表示するかどうか・話しかけたときの会話は、物語の進み具合で決まる（src/game/story/）。
 * 絵が届くまでは仮の印で表示する。
 */
export interface NpcObject extends Rect {
  readonly type: 'npc';
  readonly id: string;
  /** どの人物か（会話の名前・顔の絵の参照に使う） */
  readonly npcId: 'neighbor_guide';
}

export type MapObject = InteractObject | WarpObject | EnemyObject | ChestObject | NpcObject;

export interface MapDefinition {
  readonly id: string;
  readonly name: string;
  readonly area: 'town' | 'interior' | 'dungeon';
  readonly tiles: readonly string[];
  readonly objects: readonly MapObject[];
  /** 既定の出現位置 */
  readonly spawn: { readonly x: number; readonly y: number; readonly dir: Direction };
  /** 階段を上って戻ってきたときの出現位置（ダンジョンのみ） */
  readonly upArrival?: { readonly x: number; readonly y: number; readonly dir: Direction };
}

const interact = (
  id: string,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  action: InteractAction,
  message?: string,
): InteractObject => ({ type: 'interact', id, x, y, w, h, label, action, ...(message ? { message } : {}) });

const warp = (id: string, x: number, y: number, w: number, label: string, target: WarpTarget): WarpObject => ({
  type: 'warp',
  id,
  x,
  y,
  w,
  h: 1,
  label,
  target,
});

const enemy = (id: string, x: number, y: number, encounterId: string, boss = false): EnemyObject => ({
  type: 'enemy',
  id,
  x,
  y,
  encounterId,
  boss,
});

const npc = (id: string, x: number, y: number, npcId: NpcObject['npcId']): NpcObject => ({ type: 'npc', id, x, y, w: 1, h: 1, npcId });

const chest = (id: string, x: number, y: number, coins: number, cards: readonly CardReward[] = []): ChestObject => ({
  type: 'chest',
  id,
  x,
  y,
  reward: { coins, cards },
});

/**
 * 街（仮マップ）。並びは新しい街の設計図（docs/design/seimon-town/）に近づけてある：
 * 北西＝カード練習場、北中央＝大会会場、中央＝噴水広場、南西＝カードショップ、南東＝主人公の家ととなりの家、南＝草原（ダンジョン方面）。
 * 正式な街の絵が届いたら、設計図の座標で作り直す。
 */
export const TOWN: MapDefinition = {
  id: 'town',
  name: '街（仮マップ）',
  area: 'town',
  tiles: [
    'TTTTTTTTTTTTTTTTTTTT',
    'T,PPPPP,HHHHHH,,,,,T',
    'T,PPPPP,HHHHHH,,T,,T',
    'T,PPPPP,HHHHHH,,,,,T',
    'T,PPDPP,HHDDHH,,,T,T',
    'T,,,=,,,,,==,,,,,,,T',
    'T,,,=,,,,,==,,,,,,,T',
    'T,,,=,,,,====,,,,,,T',
    'T,,,======FF=======T',
    'T,,,,,,,,=FF=,,,,,,T',
    'T,,,,,,,,====,,,,,,T',
    'T,,,,,,,,,==,,,,,,,T',
    'T,BBBB,,,,==,AAA,NNT',
    'T,BBBB,,,,==,AAA,NNT',
    'T,BBDB,,,,==,ADA,NNT',
    'T,,,=,,,,,==,,=,,,,T',
    'T,,,============,,,T',
    'T,,,,,,,,,==,,,,,,,T',
    'T,TT,,,,,,==,,,,TT,T',
    'T,,,,,,,,,==,,,,,,,T',
    'TTTTTTTTTTGGTTTTTTTT',
  ],
  objects: [
    warp('door-practice', 4, 4, 1, 'カード練習場', { kind: 'map', mapId: 'practice', x: 4, y: 7, dir: 'up' }),
    warp('door-hall', 10, 4, 2, '大会会場', { kind: 'map', mapId: 'hall', x: 5, y: 10, dir: 'up' }),
    // 中央の道を南へまっすぐ進んだ突き当たり（草原の方角）。踏むと既存のダンジョン選択（家の壁の地図と同じ画面）へ
    warp('door-dungeon', 10, 20, 2, 'ダンジョン入口', { kind: 'dungeonGate' }),
    warp('door-home', 14, 14, 1, '家', { kind: 'map', mapId: 'home', x: 4, y: 7, dir: 'up' }),
    warp('door-shop', 4, 14, 1, 'カードショップ', { kind: 'map', mapId: 'shop', x: 4, y: 7, dir: 'up' }),
    interact('sign-fountain', 10, 8, 2, 2, '噴水', 'message', '街の中央の噴水。（仮マップ：正式な街背景は制作中）'),
    // となりの家の女性（案内役）。物語の進み具合で、街か練習場のどちらかにいる
    npc('guide-town', 16, 15, 'neighbor_guide'),
  ],
  spawn: { x: 10, y: 18, dir: 'up' },
};

export const HOME: MapDefinition = {
  id: 'home',
  name: '家（仮マップ）',
  area: 'interior',
  tiles: [
    '##########',
    '#bb..MM.h#',
    '#bb.....h#',
    '#........#',
    '#..rrrr..#',
    '#..rrrr..#',
    '#kk......#',
    '#........#',
    '####dd####',
  ],
  objects: [
    interact('home-bed', 1, 1, 2, 2, 'ベッド', 'settings'),
    interact('home-map', 5, 1, 2, 1, '壁の地図', 'dungeonSelect'),
    interact('home-shelf', 8, 1, 1, 2, '本棚', 'collection'),
    interact('home-desk', 1, 6, 2, 1, '机', 'deck'),
    warp('home-exit', 4, 8, 2, '外へ', { kind: 'map', mapId: 'town', x: 14, y: 15, dir: 'down' }),
  ],
  spawn: { x: 4, y: 7, dir: 'up' },
};

export const SHOP: MapDefinition = {
  id: 'shop',
  name: 'カードショップ（仮マップ）',
  area: 'interior',
  tiles: [
    '##########',
    '#ssss..gg#',
    '#...n..gg#',
    '#.ccccc..#',
    '#........#',
    '#........#',
    '#........#',
    '#........#',
    '####dd####',
  ],
  objects: [
    interact('shop-clerk', 4, 2, 1, 1, '店員', 'shopClerk'),
    interact('shop-counter', 2, 3, 5, 1, 'カウンター', 'shopClerk'),
    interact('shop-gacha', 7, 1, 2, 2, 'カードガチャマシン', 'gacha'),
    interact('shop-shelf', 1, 1, 4, 1, '商品棚', 'message', 'カードがきれいに並んでいる。'),
    warp('shop-exit', 4, 8, 2, '外へ', { kind: 'map', mapId: 'town', x: 4, y: 15, dir: 'down' }),
  ],
  spawn: { x: 4, y: 7, dir: 'up' },
};

export const HALL: MapDefinition = {
  id: 'hall',
  name: '大会会場（仮マップ）',
  area: 'interior',
  tiles: [
    '############',
    '#,,,,,,,,,,#',
    '#,,,,,,,,,,#',
    '#,,,xxxx,,,#',
    '#,,,xxxx,,,#',
    '#,,,,,,,,,,#',
    '#..........#',
    '#ss..n...ss#',
    '#ss.ccc..ss#',
    '#..........#',
    '#..........#',
    '#####dd#####',
  ],
  objects: [
    interact('hall-receptionist', 5, 7, 1, 1, '受付', 'tournamentDesk'),
    interact('hall-desk', 4, 8, 3, 1, '受付カウンター', 'tournamentDesk'),
    interact('hall-table', 4, 3, 4, 2, '対戦テーブル', 'message', '屋根付きの会場の中央にある対戦テーブル。大会の対戦はここで行われる。'),
    interact('hall-seats-l', 1, 7, 2, 2, '客席', 'message', '観客席。'),
    interact('hall-seats-r', 9, 7, 2, 2, '客席', 'message', '観客席。'),
    warp('hall-exit', 5, 11, 2, '外へ', { kind: 'map', mapId: 'town', x: 10, y: 5, dir: 'down' }),
  ],
  spawn: { x: 5, y: 10, dir: 'up' },
};

/** カード練習場（仮マップ）。初心者がカードを学ぶ場所。練習テーブルで練習試合ができる */
export const PRACTICE: MapDefinition = {
  id: 'practice',
  name: 'カード練習場（仮マップ）',
  area: 'interior',
  tiles: [
    '##########',
    '#ss.MMM..#',
    '#........#',
    '#.xx..xx.#',
    '#.xx..xx.#',
    '#........#',
    '#ss....ss#',
    '#........#',
    '####dd####',
  ],
  objects: [
    interact('practice-shelf', 1, 1, 2, 1, '教材の棚', 'message', '練習用のカードがきちんと並んでいる。'),
    interact('practice-board', 4, 1, 3, 1, '黒板', 'message', 'カードの並べ方の図が描いてある。'),
    interact('practice-table-1', 2, 3, 2, 2, '練習テーブル', 'practiceTable'),
    interact('practice-table-2', 6, 3, 2, 2, '練習テーブル', 'practiceTable'),
    interact('practice-bench-l', 1, 6, 2, 1, 'ベンチ', 'message', '順番を待つ人のためのベンチ。'),
    interact('practice-bench-r', 7, 6, 2, 1, 'ベンチ', 'message', '順番を待つ人のためのベンチ。'),
    npc('guide-practice', 8, 2, 'neighbor_guide'),
    warp('practice-exit', 4, 8, 2, '外へ', { kind: 'map', mapId: 'town', x: 4, y: 5, dir: 'down' }),
  ],
  spawn: { x: 4, y: 7, dir: 'up' },
};

export const DUNGEON_B1: MapDefinition = {
  id: 'dungeon-01-b1',
  name: 'B1F',
  area: 'dungeon',
  tiles: [
    '############',
    '#....#.....#',
    '#.S..#.....#',
    '#....#.....#',
    '#..........#',
    '####.####..#',
    '#........#.#',
    '#.######.#.#',
    '#.#......#.#',
    '#.#.######.#',
    '#.#........#',
    '#.######.###',
    '#..........#',
    '#.###..###.#',
    '#....U.....#',
    '############',
  ],
  objects: [
    warp('b1-down', 2, 2, 1, 'B2Fへ', { kind: 'floor', delta: 1 }),
    warp('b1-exit', 5, 14, 1, '街へ帰る', { kind: 'leaveDungeon' }),
    enemy('b1-enemy-1', 4, 5, 'enc-b1-a'),
    enemy('b1-enemy-2', 6, 8, 'enc-b1-b'),
  ],
  spawn: { x: 5, y: 13, dir: 'up' },
  upArrival: { x: 3, y: 2, dir: 'down' },
};

export const DUNGEON_B2: MapDefinition = {
  id: 'dungeon-01-b2',
  name: 'B2F',
  area: 'dungeon',
  tiles: [
    '##############',
    '#...#....#...#',
    '#...#....#...#',
    '#...#.S..#...#',
    '##.###..###.##',
    '#............#',
    '#.####..####.#',
    '#.#........#.#',
    '#.#.######.#.#',
    '#...#....#...#',
    '###.#....#.###',
    '#...#....#...#',
    '#.###.##.###.#',
    '#............#',
    '#.####..####.#',
    '#......U.....#',
    '#............#',
    '##############',
  ],
  objects: [
    warp('b2-down', 6, 3, 1, 'B3Fへ', { kind: 'floor', delta: 1 }),
    warp('b2-up', 7, 15, 1, 'B1Fへ', { kind: 'floor', delta: -1 }),
    enemy('b2-enemy-1', 2, 4, 'enc-b2-a'),
    enemy('b2-enemy-2', 11, 4, 'enc-b2-b'),
    enemy('b2-enemy-3', 7, 4, 'enc-b2-c'),
    chest('b2-chest-1', 3, 1, 80),
    chest('b2-chest-2', 12, 1, 0, [{ cardId: 'skl-a-5', count: 2 }]),
    chest('b2-chest-3', 6, 10, 50),
  ],
  spawn: { x: 7, y: 14, dir: 'up' },
  upArrival: { x: 7, y: 3, dir: 'down' },
};

export const DUNGEON_B3: MapDefinition = {
  id: 'dungeon-01-b3',
  name: 'B3F',
  area: 'dungeon',
  tiles: [
    '############',
    '#....##....#',
    '#..........#',
    '#....##....#',
    '###.####.###',
    '#..........#',
    '#.###..###.#',
    '#.#......#.#',
    '#.#.####.#.#',
    '#...#..#...#',
    '###.#..#.###',
    '#...#..#...#',
    '#.###..###.#',
    '#..........#',
    '#####..#####',
    '#....U.....#',
    '#..........#',
    '############',
  ],
  objects: [
    warp('b3-up', 5, 15, 1, 'B2Fへ', { kind: 'floor', delta: -1 }),
    enemy('b3-enemy-1', 5, 6, 'enc-b3-a'),
    enemy('b3-enemy-2', 3, 4, 'enc-b3-b'),
    enemy('b3-boss', 5, 2, 'enc-b3-boss', true),
    chest('b3-chest-1', 10, 9, 0, [{ cardId: 'skl-b-5', count: 2 }]),
  ],
  spawn: { x: 6, y: 14, dir: 'up' },
};

export const MAPS: readonly MapDefinition[] = [TOWN, HOME, SHOP, HALL, PRACTICE, DUNGEON_B1, DUNGEON_B2, DUNGEON_B3];

export function getMap(id: string): MapDefinition | undefined {
  return MAPS.find((m) => m.id === id);
}
