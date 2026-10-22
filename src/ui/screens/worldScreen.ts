import { getDungeon, ENCOUNTERS } from '../../data/dungeons.ts';
import { FRAGMENT_TOTAL } from '../../data/fragments.ts';
import { getMap, TOWN_SIGNS, type ChestObject, type EnemyObject, type MapDefinition, type MapObject, type NpcObject } from '../../data/maps.ts';
import type { SceneId } from '../../data/storyScenes.ts';
import { getMonster } from '../../data/cards.ts';
import { isDeckValid } from '../../game/deck/deck.ts';
import {
  changeFloor,
  defeatEnemy,
  isChestOpened,
  isEnemyActive,
  leaveDungeon,
  openChest,
} from '../../game/progress/dungeon.ts';
import { collectFragment, fragmentAt, fragmentCount } from '../../game/progress/fragments.ts';
import type { Direction, Location } from '../../game/save/saveData.ts';
import {
  adjacentCellOf,
  canStep,
  DIR_DELTA,
  findPath,
  findPathToObject,
  isBlocked,
  mapSize,
  objectsAt,
  type Point,
} from '../../game/world/world.ts';
import {
  applySceneEffects,
  isNpcPresent,
  sceneAfterPractice,
  sceneOnEnter,
  sceneOnTable,
  sceneOnTalk,
  showsPracticeGoal,
  startPractice,
} from '../../game/story/intro.ts';
import { playScene } from '../components/dialogue.ts';
import { confirmModal, messageModal, openModal } from '../components/modal.ts';
import { button, h } from '../dom.ts';
import maleSheet from '@assets/images/characters/player_male_sheet.png';
import femaleSheet from '@assets/images/characters/player_female_sheet.png';
import guideSheet from '@assets/images/characters/npc_neighbor_guide_walk.png';
import chestWood from '@assets/images/maps/dungeon/chest_01_base.webp';
import chestWood1 from '@assets/images/maps/dungeon/chest_01_anim_01.webp';
import chestWood2 from '@assets/images/maps/dungeon/chest_01_anim_02.webp';
import chestWood3 from '@assets/images/maps/dungeon/chest_01_anim_03.webp';
import chestWood4 from '@assets/images/maps/dungeon/chest_01_anim_04.webp';
import chestIron from '@assets/images/maps/dungeon/chest_02_base.webp';
import chestIron1 from '@assets/images/maps/dungeon/chest_02_anim_01.webp';
import chestIron2 from '@assets/images/maps/dungeon/chest_02_anim_02.webp';
import chestIron3 from '@assets/images/maps/dungeon/chest_02_anim_03.webp';
import chestIron4 from '@assets/images/maps/dungeon/chest_02_anim_04.webp';
import chestGold from '@assets/images/maps/dungeon/chest_03_base.webp';
import chestGold1 from '@assets/images/maps/dungeon/chest_03_anim_01.webp';
import chestGold2 from '@assets/images/maps/dungeon/chest_03_anim_02.webp';
import chestGold3 from '@assets/images/maps/dungeon/chest_03_anim_03.webp';
import chestGold4 from '@assets/images/maps/dungeon/chest_03_anim_04.webp';
import fieldMeadow from '@assets/images/backgrounds/battle_field_meadow.webp';
import fieldCoast from '@assets/images/backgrounds/battle_field_coast.webp';
import fieldVolcano from '@assets/images/backgrounds/battle_field_volcano.webp';
import { bgm } from '../bgm.ts';
import { coinIcon } from '../components/coinIcon.ts';
import { t, type Params } from '../../i18n/i18n.ts';
import type { MessageKey } from '../../i18n/messages/index.ts';
import { cardName, dungeonName, mapName, objectLabel, objectMessage, opponentName } from '../../i18n/content.ts';
import type { ScreenContext, ScreenDefinition } from './types.ts';

/** 仮マップ（ダンジョン）の1マスの大きさ（論理px） */
const TILE = 40;
/** 正式な絵の街：設計図の 1 単位 → 論理px（主人公 108×144 が 61×81 になる） */
const ART_SCALE = 0.5625;
/** 部屋は画面の高さに合わせて少し大きく見せる（街の何倍までか。人物の絵がぼやけない範囲） */
const ROOM_ZOOM_MAX = 1.35;
/** 部屋の絵が画面の高さのどれくらいを占めるか */
const ROOM_FILL = 0.9;
/** 場所を移るときの暗転（ミリ秒） */
const FADE_OUT_MS = 170;
/** 絵の読み込みを待つ上限（ミリ秒）。遅い回線でも操作できなくならないように */
const REVEAL_TIMEOUT_MS = 3000;
/** スティック：これ以上指を動かしたら移動の操作にする／スティックの半径／方向を決める最小の距離（論理px） */
const STICK_START = 12;
const STICK_RADIUS = 42;
const STICK_DEAD = 16;
/** 歩行速度（論理px/秒・仮。実機で調整）。2026-10-22 に街を詰めたとき 185 から 1.25 倍に（ユーザー指示） */
const WALK_PX = 231;
/** 歩行のコマ送り（コマ/秒。素材の推奨は約7） */
const WALK_FPS = 7;
/** 歩くときの上下の弾み（人物の背たけに対する割合）。2コマ目・4コマ目で少し体が上がる */
const WALK_BOB = 0.03;
/** 宝箱の絵（ミスモンの正式素材）：閉じた絵と、開く動きの4コマ（4コマ目が開いたあとの絵） */
const CHEST_ART: Readonly<Record<ChestObject['look'], { readonly closed: string; readonly opening: readonly string[] }>> = {
  wood: { closed: chestWood, opening: [chestWood1, chestWood2, chestWood3, chestWood4] },
  iron: { closed: chestIron, opening: [chestIron1, chestIron2, chestIron3, chestIron4] },
  gold: { closed: chestGold, opening: [chestGold1, chestGold2, chestGold3, chestGold4] },
};
/** 宝箱が開く動きの1コマの時間（ミリ秒） */
const CHEST_FRAME_MS = 110;
/** ダンジョンの階ごとの対戦の背景（ミスモンの野外のバトル背景。仮の割り当て） */
const DUNGEON_BATTLE_BG: Readonly<Record<string, string>> = {
  'dungeon-01-b1': fieldMeadow,
  'dungeon-01-b2': fieldCoast,
  'dungeon-01-b3': fieldVolcano,
};
/** 施設の看板を上の帯の下に保つ位置（論理px） */
const SIGN_MIN_BOTTOM = 98;
/**
 * 人物の歩行素材：1コマ 216×288、足元 (108, 270)。行＝方向（front/back/left/right）、列＝4コマ（シート 864×1152）。
 * 街・部屋では 108×144 単位（設計図どおり）、ダンジョン（仮マップ）では少し小さく描く
 */
const FRAME_W = 216;
const FRAME_H = 288;
const FOOT_X = 108;
const FOOT_Y = 270;
const DIR_ROW: Readonly<Record<Direction, number>> = { down: 0, up: 1, left: 2, right: 3 };
/** 待機の絵が歩行シートの何列目と同じか（案内役の待機は2コマ目と同じ絵） */
const NPC_IDLE_COL = 1;

/**
 * 主人公の絵：歩き4コマ＋立ち止まり1コマを1枚にまとめたシート（5列×4行。tools/art/walk_passing.py が作る）。
 * 歩く・止まるで別の画像に切り替えると、iPhone で読み込み直しの間だけ人物が消えるので、1枚の中で位置だけ動かす。
 * 横向きの2・4コマ目は、届いた絵（4コマとも足を開いた形）から足を寄せて作った「足がそろう」コマ（描き直しが届くまでの応急処置）
 */
const PLAYER_SHEET: Readonly<Record<'male' | 'female', string>> = { male: maleSheet, female: femaleSheet };
const PLAYER_SHEET_COLS = 5;
/** シートの立ち止まりの列 */
const IDLE_COL = 4;

const NPC_SHEET: Readonly<Record<NpcObject['npcId'], string>> = { neighbor_guide: guideSheet };

const TILE_CLASS: Readonly<Record<string, string>> = {
  '#': 'wall', '.': 'floor', ',': 'grass', '=': 'road', T: 'tree', '~': 'water', H: 'bld-hall', A: 'bld-home',
  B: 'bld-shop', P: 'bld-practice', N: 'bld-neighbor', D: 'door', d: 'exit', G: 'dungeon-gate', F: 'fountain', S: 'stairs-down', U: 'stairs-up', b: 'bed', M: 'wallmap',
  h: 'bookshelf', k: 'desk', s: 'shelf', c: 'counter', n: 'npc', g: 'gacha', x: 'table', r: 'rug',
};

const coins = (n: number): string => t('common.coins', { n } satisfies Params);

/** 向き → 1歩の向き（斜めの絵は無いので、斜めに歩くときは左右の絵） */
const facing = (dx: number, dy: number, prev: Direction): Direction =>
  dx > 0 ? 'right' : dx < 0 ? 'left' : dy > 0 ? 'down' : dy < 0 ? 'up' : prev;

export const worldScreen: ScreenDefinition = {
  id: 'world',
  titleKey: 'world.title',
  create(ctx) {
    const element = h('main', { class: 'screen world' });
    const world = new WorldView(ctx, element);
    world.load();
    return { element, destroy: () => world.destroy() };
  },
};

interface Move {
  readonly from: Point;
  readonly to: Point;
  /** 1歩の長さ（斜めは √2） */
  readonly len: number;
  t: number;
}

class WorldView {
  readonly #ctx: ScreenContext;
  readonly #root: HTMLElement;
  #map!: MapDefinition;
  #pos: Point = { x: 0, y: 0 };
  #tile: Point = { x: 0, y: 0 };
  #dir: Direction = 'down';
  #move: Move | null = null;
  #path: Point[] = [];
  /** 経路の最後に話しかける・調べる物 */
  #afterPath: MapObject | null = null;
  /** スティック・方向キーで歩く向き（8方向） */
  #held: Point | null = null;
  #keys = new Set<Direction>();
  #busy = false;
  #raf = 0;
  #last = 0;
  /** 歩いている時間（コマ送り用）・最後に歩いていた時刻 */
  #walkTime = 0;
  #lastMoving = 0;
  #playerLook = '';
  #destroyed = false;
  #mapLayer!: HTMLElement;
  #viewport!: HTMLElement;
  #player!: HTMLElement;
  #objectEls = new Map<string, HTMLElement>();
  /** 人物の足元の影（人物の要素 → 影） */
  #shadows = new Map<HTMLElement, HTMLElement>();
  /** 正式な絵の地図の表示倍率（設計図の単位 → 論理px） */
  #scale = ART_SCALE;
  /** 暗転の幕 */
  #fade: HTMLElement | null = null;
  /** 他の部屋の絵を先に読み込んだか（アプリを開いている間に1回） */
  static #preloaded = false;
  #stick!: HTMLElement;
  #examineBtn: HTMLElement | null = null;
  /** 施設の看板（上の帯に隠れないように位置を直す） */
  #signs: { el: HTMLElement; top: number; maxShift: number; shift: number }[] = [];
  /** しらべるボタンを光らせているマス（同じマスでは計算し直さない） */
  #nearKey = '';
  /** スティック操作中の指（1本だけ） */
  #touch: { id: number; x: number; y: number; dragging: boolean } | null = null;
  /** 一度スティックを使ったら操作の説明を出さない（アプリを開いている間） */
  static #stickUsed = false;
  readonly #onKeyDown = (e: KeyboardEvent): void => this.#key(e, true);
  readonly #onKeyUp = (e: KeyboardEvent): void => this.#key(e, false);

  constructor(ctx: ScreenContext, root: HTMLElement) {
    this.#ctx = ctx;
    this.#root = root;
    window.addEventListener('keydown', this.#onKeyDown);
    window.addEventListener('keyup', this.#onKeyUp);
  }

  get #store() {
    return this.#ctx.store;
  }

  destroy(): void {
    this.#destroyed = true;
    cancelAnimationFrame(this.#raf);
    window.removeEventListener('keydown', this.#onKeyDown);
    window.removeEventListener('keyup', this.#onKeyUp);
  }

  /** 1マスの大きさ（論理px） */
  get #cell(): number {
    return this.#map.art ? this.#map.art.cell * this.#scale : TILE;
  }

  /** 人物の絵の高さ（論理px）。街・部屋は設計図どおり 144 単位、仮マップは小さめ */
  get #figureH(): number {
    return this.#map.art ? 144 * this.#scale : 54;
  }

  /** マス (x, y) に立つ人の足元（論理px） */
  #foot(p: Point): Point {
    const c = this.#cell;
    return { x: (p.x + 0.5) * c, y: this.#map.art ? (p.y + 0.5) * c : (p.y + 0.9) * c };
  }

  /** 人物の絵の位置と大きさ（足元を合わせる）。lift は歩くときの弾み（影は地面に残す） */
  #placeFigure(el: HTMLElement, p: Point, lift = 0): void {
    const k = this.#figureH / (FRAME_H / 2);
    const f = this.#foot(p);
    el.style.transform = `translate(${f.x - (FOOT_X / 2) * k}px, ${f.y - (FOOT_Y / 2) * k - lift}px)`;
    el.style.zIndex = String(10 + Math.round(f.y));
    const shadow = this.#shadows.get(el);
    if (shadow) shadow.style.transform = `translate(${f.x}px, ${f.y}px)`;
  }

  /** 人物の足元の影（地面に置く。家具・人物より奥） */
  #addShadow(el: HTMLElement): void {
    const shadow = h('div', { class: 'world__shadow', attrs: { 'aria-hidden': 'true' } });
    const w = this.#figureH * 0.5;
    Object.assign(shadow.style, { width: `${w}px`, height: `${w * 0.32}px`, marginLeft: `${-w / 2}px`, marginTop: `${-w * 0.16}px` });
    this.#shadows.set(el, shadow);
    this.#mapLayer.append(shadow);
  }

  #sizeFigure(el: HTMLElement): void {
    const k = this.#figureH / (FRAME_H / 2);
    el.style.width = `${(FRAME_W / 2) * k}px`;
    el.style.height = `${(FRAME_H / 2) * k}px`;
  }

  /** セーブの現在地のマップを表示する */
  load(): void {
    const loc = this.#store.save.location;
    const map = getMap(loc.mapId);
    if (!map) return;
    this.#map = map;
    this.#tile = { x: loc.x, y: loc.y };
    this.#pos = { ...this.#tile };
    this.#dir = loc.dir;
    this.#move = null;
    this.#path = [];
    this.#afterPath = null;
    this.#busy = false;
    this.#scale = this.#artScale(map);
    bgm.play(map.area === 'dungeon' ? 'dungeon' : 'town');
    this.#build(true);
    cancelAnimationFrame(this.#raf);
    this.#last = performance.now();
    this.#raf = requestAnimationFrame((t) => this.#frame(t));
    const flash = this.#store.flashMessage;
    const scene = this.#sceneOnLoad();
    if (flash) {
      this.#store.flashMessage = null;
      this.#message(flash, scene ? () => this.#playScene(scene) : undefined);
    } else if (scene) {
      this.#playScene(scene);
    }
  }

  /** 正式な絵の表示倍率。部屋は画面の高さに合わせて大きくする（街の ROOM_ZOOM_MAX 倍まで） */
  #artScale(map: MapDefinition): number {
    if (!map.art || map.area !== 'interior') return ART_SCALE;
    const vh = (this.#root.clientHeight || 844) - 8;
    return Math.min(ART_SCALE * ROOM_ZOOM_MAX, Math.max(ART_SCALE, (vh * ROOM_FILL) / map.art.height));
  }

  /** 絵を読み込み終えてから幕を開ける（入った瞬間に家具だけ・背景だけが見えないように） */
  #reveal(): void {
    const fade = this.#fade;
    if (!fade) return;
    const imgs: HTMLImageElement[] = [...this.#mapLayer.querySelectorAll('img')];
    // 人物の絵（背景画像で表示しているもの）も読み込み終えてから見せる
    for (const el of [this.#player, ...this.#objectEls.values()]) {
      const m = /url\("(.+)"\)/.exec(el.style.backgroundImage);
      if (!m?.[1] || typeof Image === 'undefined') continue;
      const img = new Image();
      img.src = m[1];
      imgs.push(img);
    }
    const ready = Promise.all(imgs.map((img) => (img.decode ? img.decode().catch(() => undefined) : Promise.resolve())));
    const timeout = new Promise((r) => setTimeout(r, REVEAL_TIMEOUT_MS));
    void Promise.race([ready, timeout]).then(() => {
      if (this.#destroyed || this.#fade !== fade) return;
      fade.classList.remove('is-on');
      this.#preloadOthers();
    });
  }

  /** 他の街・部屋の絵を、あいている時間に読み込んでおく（入ったときにすぐ出るように） */
  #preloadOthers(): void {
    if (WorldView.#preloaded || typeof Image === 'undefined') return;
    WorldView.#preloaded = true;
    setTimeout(() => {
      const urls = new Set<string>();
      for (const id of ['town', 'home', 'neighbor', 'shop', 'lab', 'hall', 'practice', 'house-a']) {
        const art = getMap(id)?.art;
        for (const img of [...(art?.tiles ?? []), ...(art?.sprites ?? [])]) urls.add(img.file);
      }
      for (const url of urls) {
        const img = new Image();
        img.decoding = 'async';
        img.src = url;
      }
    }, 600);
  }

  /** 暗転してから別の場所へ */
  #goTo(next: () => void): void {
    this.#busy = true;
    this.#path = [];
    this.#held = null;
    this.#fade?.classList.add('is-on');
    setTimeout(() => {
      if (!this.#destroyed) next();
    }, FADE_OUT_MS);
  }

  /** このマップに来たときに始まる会話（練習試合のあと・最初に街へ出たとき・練習場に着いたとき） */
  #sceneOnLoad(): SceneId | null {
    const store = this.#store;
    const result = store.practiceResult;
    if (result) {
      store.practiceResult = null;
      return sceneAfterPractice(store.save, result);
    }
    return sceneOnEnter(store.save, this.#map.id);
  }

  /* ---------- 表示の組み立て ---------- */

  #isVisible = (obj: MapObject): boolean => {
    if (obj.type === 'enemy') return isEnemyActive(this.#store.save, obj.id);
    if (obj.type === 'npc') return isNpcPresent(this.#store.save, obj);
    return true;
  };

  #blocked = (x: number, y: number): boolean => isBlocked(this.#map, x, y, this.#isVisible);

  #build(fade = false): void {
    this.#touch = null;
    this.#shadows.clear();
    this.#held = null;
    this.#keys.clear();
    const map = this.#map;
    const { width, height } = mapSize(map);
    const save = this.#store.save;
    const dungeon = save.activeDungeon ? getDungeon(save.activeDungeon.dungeonId) : undefined;
    const title = map.area === 'dungeon' && dungeon ? t('world.placeDungeon', { dungeon: dungeonName(dungeon), floor: mapName(map) }) : mapName(map);
    const cell = this.#cell;

    this.#mapLayer = h('div', { class: `world__map world__map--${map.area}${map.art ? ' world__map--art' : ''}` });
    this.#mapLayer.style.width = `${width * cell}px`;
    this.#mapLayer.style.height = `${height * cell}px`;
    if (map.art) {
      // 正式な絵：背景（街は分割した絵・部屋は部屋の箱）＋家具（人と前後を比べて重ねる）
      for (const img of map.art.tiles) this.#mapLayer.append(this.#artImage(img.file, img, 'world__bg', 0));
      for (const img of map.art.sprites) {
        const z = img.z ? 10 + Math.round(img.z * this.#scale) : 1;
        this.#mapLayer.append(this.#artImage(img.file, img, 'world__furniture', z));
      }
    } else {
      const tiles = h('div', { class: 'world__tiles' });
      tiles.style.gridTemplateColumns = `repeat(${width}, ${TILE}px)`;
      for (const row of map.tiles) {
        for (const ch of row) tiles.append(h('div', { class: `tile tile--${TILE_CLASS[ch] ?? 'wall'}` }));
      }
      this.#mapLayer.append(tiles);
    }
    this.#addLabels();
    this.#objectEls.clear();
    for (const obj of map.objects) {
      const el = this.#objectElement(obj);
      if (el) {
        this.#objectEls.set(obj.id, el);
        this.#mapLayer.append(el);
      }
    }
    this.#player = h('div', { class: 'world__player', attrs: { 'aria-label': t('world.player') } });
    this.#sizeFigure(this.#player);
    // 絵は最初に1回だけ設定する（あとは位置だけ動かす）
    this.#player.style.backgroundImage = `url("${PLAYER_SHEET[save.player.gender === 'female' ? 'female' : 'male']}")`;
    this.#player.style.backgroundSize = `${parseFloat(this.#player.style.width) * PLAYER_SHEET_COLS}px ${parseFloat(this.#player.style.height) * 4}px`;
    this.#addShadow(this.#player);
    this.#playerLook = '';
    this.#mapLayer.append(this.#player);

    this.#viewport = h('div', { class: 'world__viewport' }, this.#mapLayer);

    const hud = h(
      'header',
      { class: 'world__hud' },
      h(
        'div',
        { class: 'world__place' },
        h('span', { class: 'world__place-name', text: title }),
        map.art ? null : h('span', { class: 'world__place-note', text: t('world.placeNote') }),
      ),
      h('span', { class: 'world__coins' }, coinIcon(), coins(save.coins)),
      map.area === 'dungeon' ? button(t('world.escape'), () => this.#confirmLeave(), 'btn btn--small') : null,
      button(t('world.menu'), () => this.#menu(), 'btn btn--small'),
    );

    // 移動：画面のどこでも指を置いてすべらせると、その方向へ歩く（指を置いた所に半透明のスティックが出る。8方向）。
    // すべらせずに離したら、これまでどおりタップ（その場所へ歩く・人や家具に話す・調べる）
    this.#stick = h('div', { class: 'world__stick', attrs: { 'aria-hidden': 'true' } }, h('div', { class: 'world__stick-knob' }));
    this.#viewport.append(this.#stick);
    this.#viewport.addEventListener('pointerdown', (e) => this.#pointerDown(e));
    this.#viewport.addEventListener('pointermove', (e) => this.#pointerMove(e));
    this.#viewport.addEventListener('pointerup', (e) => this.#pointerUp(e, true));
    this.#viewport.addEventListener('pointercancel', (e) => this.#pointerUp(e, false));

    const examine = (this.#examineBtn = h(
      'button',
      { class: 'world__action', attrs: { type: 'button', 'aria-label': t('world.examine') }, on: { click: () => this.#examine() } },
      h('span', { class: 'world__action-icon', attrs: { 'aria-hidden': 'true' } }),
      h('span', { class: 'world__action-label', text: t('world.examine') }),
    ));
    const hint = WorldView.#stickUsed ? null : h('div', { class: 'world__hint', text: t('world.hint') });

    const goal = showsPracticeGoal(save, map.id) ? h('div', { class: 'world__goal', text: t('story.goal.practice') }) : null;
    // 暗転の幕：場所に入ったときは閉じた状態から、絵を読み込み終えたら開ける
    const keepClosed = !fade && this.#fade?.classList.contains('is-on');
    this.#fade = h('div', { class: `world__fade${fade || keepClosed ? ' is-on' : ''}`, attrs: { 'aria-hidden': 'true' } });
    this.#nearKey = '';
    this.#root.replaceChildren(this.#viewport, hud, examine, hint ?? '', goal ?? '', this.#fade);
    this.#root.dataset.map = map.id;
    this.#root.dataset.intro = save.story.intro;
    this.#render();
    if (fade) this.#reveal();
  }

  #artImage(src: string, r: { x: number; y: number; w: number; h: number }, cls: string, z: number): HTMLElement {
    const img = h('img', { class: cls, attrs: { src, alt: '', draggable: 'false', decoding: 'async' } });
    Object.assign(img.style, {
      left: `${r.x * this.#scale}px`,
      top: `${r.y * this.#scale}px`,
      width: `${r.w * this.#scale}px`,
      height: `${r.h * this.#scale}px`,
      zIndex: String(z),
    });
    return img;
  }

  #addLabels(): void {
    const map = this.#map;
    const cell = this.#cell;
    const save = this.#store.save;
    this.#signs = [];
    if (map.id === 'town') {
      // 施設の名前（建物の絵の上端）
      for (const sign of TOWN_SIGNS) {
        const goal = sign.label === 'practice' && showsPracticeGoal(save, map.id);
        const el = h('div', { class: `world__sign${goal ? ' is-goal' : ''}`, text: t(`world.building.${sign.label}` as MessageKey) });
        Object.assign(el.style, { left: `${sign.x * this.#scale}px`, top: `${sign.y * this.#scale}px` });
        const door = map.art?.doors?.[sign.building];
        const top = sign.y * this.#scale;
        const maxShift = door ? Math.max(0, door.y * cell - 3 * this.#figureH * 0.5 - top) : 0;
        this.#signs.push({ el, top, maxShift, shift: 0 });
        this.#mapLayer.append(el);
      }
      return;
    }
    for (const obj of map.objects) {
      if (obj.type !== 'interact' && obj.type !== 'warp') continue;
      // 正式な絵の部屋では、使える家具（調べると画面が開く物）と出口だけに名前を出す
      if (map.art && obj.type === 'interact' && obj.action === 'message') continue;
      const el = map.art
        ? h('div', { class: `world__label world__label--${obj.type}` }, h('span', { class: 'world__label-text', text: objectLabel(obj) }))
        : h('div', { class: `world__label world__label--${obj.type}`, text: objectLabel(obj) });
      Object.assign(el.style, { left: `${obj.x * cell}px`, top: `${obj.y * cell}px`, width: `${obj.w * cell}px`, height: `${obj.h * cell}px` });
      this.#mapLayer.append(el);
    }
  }

  #objectElement(obj: MapObject): HTMLElement | null {
    const cell = this.#cell;
    const place = (el: HTMLElement, x: number, y: number): HTMLElement => {
      el.style.left = `${x * cell}px`;
      el.style.top = `${y * cell}px`;
      return el;
    };
    if (obj.type === 'enemy') {
      const enc = ENCOUNTERS[obj.encounterId];
      const el = h('div', {
        class: `world__enemy${obj.boss ? ' world__enemy--boss' : ''}`,
        text: obj.boss ? t('world.boss') : t('world.enemy'),
        attrs: { 'aria-label': enc ? opponentName(enc) : t('world.enemy') },
      });
      return place(el, obj.x, obj.y);
    }
    if (obj.type === 'npc') {
      if (!this.#isVisible(obj)) return null;
      // 人物の歩行の絵（待機の向き）。足元のマスに立つ
      const el = h('div', { class: 'world__npc', dataset: { npc: obj.npcId }, attrs: { 'aria-label': t('story.speaker.neighborGuide') } });
      this.#sizeFigure(el);
      this.#addShadow(el);
      el.style.backgroundImage = `url("${NPC_SHEET[obj.npcId]}")`;
      this.#faceNpc(el, 'down');
      this.#placeFigure(el, obj);
      return el;
    }
    if (obj.type === 'chest') {
      const save = this.#store.save;
      const opened = save.activeDungeon ? isChestOpened(save, save.activeDungeon.dungeonId, obj.id) : false;
      const art = CHEST_ART[obj.look];
      const el = h('div', { class: `world__chest${opened ? ' is-open' : ''}`, attrs: { 'aria-label': opened ? t('world.chestEmptyLabel') : t('world.chest') } });
      el.style.backgroundImage = `url("${opened ? art.opening[art.opening.length - 1] : art.closed}")`;
      return place(el, obj.x, obj.y);
    }
    return null;
  }

  #faceNpc(el: HTMLElement, dir: Direction): void {
    const w = parseFloat(el.style.width);
    const hgt = parseFloat(el.style.height);
    el.style.backgroundSize = `${w * 4}px ${hgt * 4}px`;
    el.style.backgroundPosition = `${-NPC_IDLE_COL * w}px ${-DIR_ROW[dir] * hgt}px`;
  }

  /* ---------- ループ ---------- */

  #frame(time: number): void {
    if (this.#destroyed) return;
    const dt = Math.min(0.05, (time - this.#last) / 1000);
    this.#last = time;
    if (!this.#busy) this.#step(dt);
    if (this.#move) {
      this.#walkTime += dt;
      this.#lastMoving = time;
    }
    this.#render(time);
    this.#raf = requestAnimationFrame((t) => this.#frame(t));
  }

  #step(dt: number): void {
    if (this.#move) {
      const speed = WALK_PX / this.#cell;
      this.#move.t += (dt * speed) / this.#move.len;
      if (this.#move.t >= 1) {
        this.#tile = this.#move.to;
        this.#pos = { ...this.#tile };
        this.#move = null;
        this.#arrive();
        return;
      }
      const { from, to, t } = this.#move;
      this.#pos = { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t };
      return;
    }
    const next = this.#path.shift();
    if (next) {
      const dx = next.x - this.#tile.x;
      const dy = next.y - this.#tile.y;
      if (!this.#tryStep(dx, dy, false)) this.#path = [];
      return;
    }
    if (this.#afterPath) {
      const cell = adjacentCellOf(this.#afterPath, this.#tile);
      this.#afterPath = null;
      if (cell) {
        this.#dir = this.#dirTo(cell);
        this.#interactAt(cell.x, cell.y);
      }
      return;
    }
    if (this.#held) this.#tryStep(this.#held.x, this.#held.y, true);
  }

  #dirTo(p: Point): Direction {
    const dx = p.x - this.#tile.x;
    const dy = p.y - this.#tile.y;
    if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? 'right' : 'left';
    return dy > 0 ? 'down' : 'up';
  }

  /** (dx, dy) へ1歩。斜めで進めないときは、進める方の縦か横へすべる（スティック操作のとき）。進めたら true */
  #tryStep(dx: number, dy: number, slide: boolean): boolean {
    this.#dir = facing(dx, dy, this.#dir);
    const from = this.#tile;
    const tries: [number, number][] = [[dx, dy]];
    if (slide && dx !== 0 && dy !== 0) tries.push([dx, 0], [0, dy]);
    for (const [sx, sy] of tries) {
      if (canStep(from, sx, sy, this.#blocked)) {
        this.#dir = facing(sx, sy, this.#dir);
        this.#move = { from, to: { x: from.x + sx, y: from.y + sy }, len: sx !== 0 && sy !== 0 ? Math.SQRT2 : 1, t: 0 };
        return true;
      }
    }
    // 進めない：その先が敵なら戦う
    const enemy = objectsAt(this.#map, from.x + dx, from.y + dy, this.#isVisible).find((o): o is EnemyObject => o.type === 'enemy');
    this.#path = [];
    if (enemy) this.#encounter(enemy);
    return false;
  }

  #arrive(): void {
    const loc: Location = { mapId: this.#map.id, x: this.#tile.x, y: this.#tile.y, dir: this.#dir };
    this.#store.update((s) => ({ ...s, location: loc }));
    const warp = objectsAt(this.#map, this.#tile.x, this.#tile.y).find((o) => o.type === 'warp');
    if (warp && warp.type === 'warp') {
      this.#path = [];
      this.#held = null;
      const target = warp.target;
      if (target.kind === 'map') {
        this.#store.update((s) => ({ ...s, location: { mapId: target.mapId, x: target.x, y: target.y, dir: target.dir } }));
        this.#goTo(() => this.load());
      } else if (target.kind === 'floor') {
        this.#store.update((s) => changeFloor(s, target.delta));
        this.#goTo(() => this.load());
      } else if (target.kind === 'dungeonGate') {
        // 入口の1マス手前（北）に戻してから選択画面へ。戻ってきたとき入口の上に立ったままにならないように
        const back: Location = { mapId: this.#map.id, x: this.#tile.x, y: this.#tile.y - 1, dir: 'up' };
        this.#store.update((s) => ({ ...s, location: back }));
        this.#busy = true;
        this.#ctx.navigate('dungeonSelect');
      } else {
        this.#confirmLeave(true);
      }
    }
  }

  #render(time = performance.now()): void {
    const p = this.#pos;
    // 歩いている間（と、歩き続けている途中のマスの切り替わり）は歩行シート、止まったら待機の絵
    const walking = this.#move !== null || time - this.#lastMoving < 90;
    const w = parseFloat(this.#player.style.width);
    const hgt = parseFloat(this.#player.style.height);
    if (!walking) this.#walkTime = 0;
    const col = walking ? Math.floor(this.#walkTime * WALK_FPS) % 4 : IDLE_COL;
    const look = `${this.#dir}:${col}`;
    if (look !== this.#playerLook) {
      this.#player.style.backgroundPosition = `${-col * w}px ${-DIR_ROW[this.#dir] * hgt}px`;
      this.#playerLook = look;
    }
    const step = Math.floor(this.#walkTime * WALK_FPS) % 4;
    this.#placeFigure(this.#player, p, walking && step % 2 === 1 ? this.#figureH * WALK_BOB : 0);
    const { width, height } = mapSize(this.#map);
    const cell = this.#cell;
    const vw = this.#viewport.clientWidth || 390;
    const vh = this.#viewport.clientHeight || 600;
    const mw = width * cell;
    const mh = height * cell;
    const f = this.#foot(p);
    // カメラは人物の体の真ん中を追う
    const fy = f.y - this.#figureH / 2;
    const cx = mw <= vw ? (vw - mw) / 2 : -Math.min(Math.max(f.x - vw / 2, 0), mw - vw);
    const cy = mh <= vh ? (vh - mh) / 2 : -Math.min(Math.max(fy - vh / 2, 0), mh - vh);
    this.#mapLayer.style.transform = `translate(${Math.round(cx)}px, ${Math.round(cy)}px)`;
    // 施設の看板が上の帯に隠れるときは、建物の上を少し下へずらす（玄関の上までは下げない）
    for (const sign of this.#signs) {
      const shift = Math.max(0, Math.min(SIGN_MIN_BOTTOM - (sign.top + cy), sign.maxShift));
      if (shift !== sign.shift) {
        sign.shift = shift;
        sign.el.style.transform = `translate(-50%, calc(-100% + ${shift.toFixed(1)}px))`;
      }
    }
    this.#root.dataset.px = String(this.#tile.x);
    this.#root.dataset.py = String(this.#tile.y);
    if (!this.#move) this.#updateNear();
  }

  /* ---------- 操作 ---------- */

  /* ---------- スティック（指を置いた所に出る） ---------- */

  #pointerDown(e: PointerEvent): void {
    if (this.#busy || this.#touch) return;
    this.#touch = { id: e.pointerId, x: e.clientX, y: e.clientY, dragging: false };
    try {
      this.#viewport.setPointerCapture(e.pointerId);
    } catch {
      // 取れなくても動く
    }
  }

  #pointerMove(e: PointerEvent): void {
    const touch = this.#touch;
    if (!touch || touch.id !== e.pointerId) return;
    // ステージは拡大縮小されているので、論理pxに直して判断する
    const scale = this.#stageScale();
    const dx = (e.clientX - touch.x) / scale;
    const dy = (e.clientY - touch.y) / scale;
    const dist = Math.hypot(dx, dy);
    if (!touch.dragging) {
      if (dist < STICK_START) return;
      touch.dragging = true;
      this.#path = [];
      this.#afterPath = null;
      const v = this.#viewport.getBoundingClientRect();
      this.#stick.style.left = `${(touch.x - v.left) / scale}px`;
      this.#stick.style.top = `${(touch.y - v.top) / scale}px`;
      this.#stick.classList.add('is-on');
      if (!WorldView.#stickUsed) {
        WorldView.#stickUsed = true;
        this.#root.querySelector('.world__hint')?.remove();
      }
    }
    const k = Math.min(1, STICK_RADIUS / Math.max(dist, 1));
    const knob = this.#stick.firstElementChild as HTMLElement | null;
    if (knob) knob.style.transform = `translate(${dx * k}px, ${dy * k}px)`;
    if (this.#busy || dist < STICK_DEAD) {
      this.#held = null;
      return;
    }
    // 8方向：45度ずつ
    const sector = Math.round(Math.atan2(dy, dx) / (Math.PI / 4));
    const a = (sector * Math.PI) / 4;
    this.#held = { x: Math.round(Math.cos(a)), y: Math.round(Math.sin(a)) };
  }

  #pointerUp(e: PointerEvent, tap: boolean): void {
    const touch = this.#touch;
    if (!touch || touch.id !== e.pointerId) return;
    this.#touch = null;
    this.#stick.classList.remove('is-on');
    if (touch.dragging) {
      this.#held = null;
      return;
    }
    if (tap) this.#tap(e);
  }

  #stageScale(): number {
    const w = this.#root.offsetWidth;
    return w > 0 ? this.#root.getBoundingClientRect().width / w : 1;
  }

  #key(e: KeyboardEvent, down: boolean): void {
    if (this.#busy || this.#root.querySelector('.modal')) return;
    const dir = ({ ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' } as const)[e.key as 'ArrowUp'];
    if (dir) {
      e.preventDefault();
      if (down) {
        this.#path = [];
        this.#keys.add(dir);
      } else this.#keys.delete(dir);
      // 押している方向キーを合わせて8方向に
      let x = 0;
      let y = 0;
      for (const k of this.#keys) {
        x += DIR_DELTA[k].x;
        y += DIR_DELTA[k].y;
      }
      this.#held = x === 0 && y === 0 ? null : { x: Math.sign(x), y: Math.sign(y) };
    } else if (down && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      this.#examine();
    }
  }

  #tap(e: MouseEvent): void {
    if (this.#busy) return;
    const rect = this.#mapLayer.getBoundingClientRect();
    const cell = this.#cell;
    const { width } = mapSize(this.#map);
    const scale = rect.width / (width * cell);
    const lx = (e.clientX - rect.left) / scale;
    const ly = (e.clientY - rect.top) / scale;
    const x = Math.floor(lx / cell);
    const y = Math.floor(ly / cell);
    // 人の絵（足元のマスより大きい）をタップしたら、その人に話しかける
    const person = this.#map.objects.find((o): o is NpcObject => {
      if (o.type !== 'npc' || !this.#isVisible(o)) return false;
      const f = this.#foot(o);
      const hw = this.#figureH * 0.3;
      return lx >= f.x - hw && lx <= f.x + hw && ly >= f.y - this.#figureH && ly <= f.y + cell / 2;
    });
    // 話しかけ・調べる対象（出入口は歩いて踏むので対象外）
    const target = person ?? objectsAt(this.#map, x, y, this.#isVisible).find((o) => o.type !== 'warp');
    const from = this.#move ? this.#move.to : this.#tile;
    if (target) {
      const here = adjacentCellOf(target, from);
      if (here && !this.#move) {
        this.#dir = this.#dirTo(here);
        this.#interactAt(here.x, here.y);
        return;
      }
      const path = findPathToObject(this.#map, from, target, this.#blocked);
      if (!path) return;
      this.#held = null;
      this.#path = path;
      this.#afterPath = target;
      return;
    }
    const path = findPath(this.#map, from, { x, y }, this.#blocked);
    if (!path) return;
    this.#held = null;
    this.#path = path;
    this.#afterPath = null;
  }

  /** 話しかけ・調べることができる、となりのマス（正面を先に） */
  #nearTarget(): Point | null {
    const order: Direction[] = [this.#dir, 'up', 'down', 'left', 'right'];
    for (const dir of order) {
      const d = DIR_DELTA[dir];
      const p = { x: this.#tile.x + d.x, y: this.#tile.y + d.y };
      if (objectsAt(this.#map, p.x, p.y, this.#isVisible).some((o) => o.type !== 'warp')) return p;
    }
    return null;
  }

  /** 調べられる物のとなりにいる間、しらべるボタンを光らせる */
  #updateNear(): void {
    const key = `${this.#map.id}:${this.#tile.x},${this.#tile.y}`;
    if (key === this.#nearKey) return;
    this.#nearKey = key;
    this.#examineBtn?.classList.toggle('is-ready', this.#nearTarget() !== null);
  }

  /** 正面（なければ、となり）と足元を調べる */
  #examine(): void {
    if (this.#busy || this.#move) return;
    const d = DIR_DELTA[this.#dir];
    const front = { x: this.#tile.x + d.x, y: this.#tile.y + d.y };
    const near = this.#nearTarget();
    if (near) {
      this.#dir = this.#dirTo(near);
      if (this.#interactAt(near.x, near.y)) return;
    }
    // 欠片：正式な絵の街ではマスが細かいので、まわり2マスまで
    const range = this.#map.art ? 2 : 0;
    for (const p of [this.#tile, front]) {
      const fragment = fragmentAt(this.#map.id, p.x, p.y, range);
      if (fragment) {
        const r = collectFragment(this.#store.save, fragment.id);
        if (r.collected) {
          this.#store.update(() => r.save);
          this.#message(t('world.fragmentFound', { n: fragmentCount(r.save), total: FRAGMENT_TOTAL }));
          return;
        }
      }
    }
    this.#message(t('world.nothingHere'));
  }

  /** そのマスの物に話しかける・調べる。何かあれば true */
  #interactAt(x: number, y: number): boolean {
    const objects = objectsAt(this.#map, x, y, this.#isVisible);
    for (const obj of objects) {
      if (obj.type === 'enemy') {
        this.#encounter(obj);
        return true;
      }
      if (obj.type === 'chest') {
        this.#openChest(obj);
        return true;
      }
      if (obj.type === 'npc') {
        this.#talk(obj);
        return true;
      }
      if (obj.type === 'interact') {
        this.#action(obj.action, objectMessage(obj));
        return true;
      }
    }
    return false;
  }

  /* ---------- 会話・練習試合（序盤イベント。進み具合は src/game/story/intro.ts） ---------- */

  #talk(npc: NpcObject): void {
    // 話しかけられた人は主人公の方を向く
    const el = this.#objectEls.get(npc.id);
    if (el) {
      const dx = this.#tile.x - npc.x;
      const dy = this.#tile.y - npc.y;
      this.#faceNpc(el, Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up');
    }
    if (npc.npcId === 'neighbor_guide') this.#playScene(sceneOnTalk(this.#store.save));
  }

  #playScene(id: SceneId): void {
    this.#busy = true;
    this.#held = null;
    this.#path = [];
    this.#afterPath = null;
    const store = this.#store;
    playScene(this.#root, id, {
      onEffects: (effects) => store.update((s) => applySceneEffects(s, effects)),
      onClose: (practice) => {
        if (this.#destroyed) return;
        // 案内役の場所・目的地の表示が変わることがあるので描き直す
        this.#build();
        this.#busy = false;
        if (practice) this.#startPractice(practice.tutorial);
      },
    });
  }

  /** 練習試合（報酬・戦績なし。勝ち負けで進行は止まらない） */
  #startPractice(tutorial: boolean): void {
    const store = this.#store;
    const opponent = ENCOUNTERS['enc-practice'];
    if (!opponent) return;
    if (!isDeckValid(store.save.deck, store.save.collection)) {
      this.#message(t('world.deckInvalidBattle'));
      return;
    }
    this.#busy = true;
    const ctx = this.#ctx;
    store.update((s) => startPractice(s, tutorial));
    store.pendingBattle = {
      title: t('story.practice.title'),
      opponent,
      allowSurrender: true,
      tutorial: tutorial && store.save.story.intro !== 'completed',
      onFinish: (winner) => {
        store.practiceResult = { winner, tutorial };
        ctx.reset('world');
      },
    };
    ctx.navigate('battle');
  }

  #action(action: string, message?: string): void {
    const nav = this.#ctx.navigate;
    switch (action) {
      case 'deck': return nav('deck');
      case 'dungeonSelect': return nav('dungeonSelect');
      case 'collection': return nav('collection');
      case 'settings': return nav('settings');
      case 'shopClerk': return nav('shopMenu');
      case 'gacha': return nav('gacha');
      case 'tournamentDesk': return nav('tournament');
      case 'practiceTable': return this.#playScene(sceneOnTable(this.#store.save));
      default: this.#message(message ?? '');
    }
  }

  #openChest(chest: ChestObject): void {
    const r = openChest(this.#store.save, chest);
    if (!r.opened) {
      this.#message(t('world.chestAlreadyEmpty'));
      return;
    }
    this.#store.update(() => r.save);
    const el = this.#objectEls.get(chest.id);
    if (el) {
      // 開く動き（4コマ）。最後のコマ（開いたあと）で止める
      el.classList.add('is-open');
      for (const [i, frame] of CHEST_ART[chest.look].opening.entries()) {
        setTimeout(() => (el.style.backgroundImage = `url("${frame}")`), i * CHEST_FRAME_MS);
      }
    }
    const parts: string[] = [];
    if (chest.reward.coins > 0) parts.push(coins(chest.reward.coins));
    for (const c of chest.reward.cards) parts.push(t(c.cardId.startsWith('skl') ? 'world.chestCardSkill' : 'world.chestCardMonster', { n: c.count }));
    this.#message(t('world.chestOpened', { items: parts.join(t('world.rewardSeparator')) }));
  }

  #encounter(enemy: EnemyObject): void {
    if (this.#busy) return;
    const opponent = ENCOUNTERS[enemy.encounterId];
    if (!opponent) return;
    const store = this.#store;
    if (!isDeckValid(store.save.deck, store.save.collection)) {
      this.#message(t('world.deckInvalidBattle'));
      return;
    }
    this.#busy = true;
    this.#held = null;
    this.#path = [];
    const ctx = this.#ctx;
    const names = opponent.monsters.map((m) => cardName(getMonster(m))).join(t('common.listSeparator'));
    store.pendingBattle = {
      title: enemy.boss ? t('world.bossBattle') : t('world.dungeonBattle'),
      opponent,
      allowSurrender: true,
      bgm: enemy.boss ? 'bossBattle' : 'battle',
      ...(DUNGEON_BATTLE_BG[this.#map.id] ? { background: DUNGEON_BATTLE_BG[this.#map.id] } : {}),
      onFinish: (winner) => {
        if (winner === 'player') {
          const r = defeatEnemy(store.save, enemy.id, enemy.boss);
          store.update((s) => ({ ...r.save, stats: { ...s.stats, battlesWon: s.stats.battlesWon + 1 } }));
          if (r.cleared) {
            store.update((s) => leaveDungeon(s));
            store.flashMessage = t(r.firstClear ? 'world.dungeonClearedFirst' : 'world.dungeonCleared', { coins: coins(r.coins) });
          } else {
            store.flashMessage = t('world.victory', { coins: coins(r.coins) });
          }
        } else {
          store.update((s) => ({ ...leaveDungeon(s), stats: { ...s.stats, battlesLost: s.stats.battlesLost + 1 } }));
          store.flashMessage = t('world.defeat');
        }
        ctx.reset('world');
      },
    };
    this.#message(t('world.encounter', { name: opponentName(opponent), monsters: names }), () => ctx.navigate('battle'));
  }

  #confirmLeave(fromStairs = false): void {
    this.#busy = true;
    confirmModal(
      this.#root,
      t('world.leaveTitle'),
      [h('p', { class: 'modal__text', text: t('world.leaveText') })],
      t('world.leaveOk'),
      () => {
        this.#store.update((s) => leaveDungeon(s));
        this.load();
      },
      fromStairs ? t('world.keepExploring') : t('common.cancel'),
      () => {
        this.#busy = false;
      },
    );
  }

  #message(text: string, onClose?: () => void): void {
    this.#busy = true;
    this.#held = null;
    messageModal(this.#root, text, () => {
      this.#busy = false;
      onClose?.();
    });
  }

  #menu(): void {
    const save = this.#store.save;
    const deckOk = isDeckValid(save.deck, save.collection);
    const fragments = fragmentCount(save);
    this.#busy = true;
    const handle = openModal(this.#root, {
      title: t('world.menu'),
      body: [
        h('p', { class: 'modal__text', text: t('world.menuStatus', { rank: save.rank, coins: coins(save.coins) }) }),
        h('p', { class: 'modal__text', text: t(deckOk ? 'world.menuDeckOk' : 'world.menuDeckNg') }),
        fragments > 0 ? h('p', { class: 'modal__text', text: t('world.menuFragments', { n: fragments, total: FRAGMENT_TOTAL }) }) : null,
        h('p', { class: 'modal__text modal__text--sub', text: t(this.#store.lastSaveOk ? 'world.autoSave' : 'world.autoSaveFailed') }),
      ],
      actions: [
        { label: t('common.toTitle'), onTap: () => { handle.close(); this.#ctx.reset('title'); } },
        { label: t('common.close'), primary: true, onTap: () => handle.close() },
      ],
      onClose: () => {
        this.#busy = false;
      },
    });
  }
}
