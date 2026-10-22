import { getDungeon, ENCOUNTERS } from '../../data/dungeons.ts';
import { FRAGMENT_TOTAL } from '../../data/fragments.ts';
import { getMap, type ChestObject, type EnemyObject, type MapDefinition, type MapObject, type NpcObject } from '../../data/maps.ts';
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
import maleSheet from '@assets/images/characters/player_male_walk_qa.png';
import femaleSheet from '@assets/images/characters/player_female_walk_qa.png';
import { t, type Params } from '../../i18n/i18n.ts';
import type { MessageKey } from '../../i18n/messages/index.ts';
import { cardName, dungeonName, mapName, objectLabel, objectMessage, opponentName } from '../../i18n/content.ts';
import type { ScreenContext, ScreenDefinition } from './types.ts';

/** 1マスの大きさ（論理px） */
const TILE = 40;
/** スティック：これ以上指を動かしたら移動の操作にする／スティックの半径／方向を決める最小の距離（論理px） */
const STICK_START = 12;
const STICK_RADIUS = 42;
const STICK_DEAD = 16;
/** 歩行速度（マス/秒・仮。実機で調整） */
const WALK_SPEED = 4.5;
/** 歩行素材：128×144 を 40×45 に縮小。行＝方向（front/back/left/right）、列＝4コマ */
const SPRITE_W = 40;
const SPRITE_H = 45;
const DIR_ROW: Readonly<Record<Direction, number>> = { down: 0, up: 1, left: 2, right: 3 };

const TILE_CLASS: Readonly<Record<string, string>> = {
  '#': 'wall', '.': 'floor', ',': 'grass', '=': 'road', T: 'tree', '~': 'water', H: 'bld-hall', A: 'bld-home',
  B: 'bld-shop', P: 'bld-practice', N: 'bld-neighbor', D: 'door', d: 'exit', G: 'dungeon-gate', F: 'fountain', S: 'stairs-down', U: 'stairs-up', b: 'bed', M: 'wallmap',
  h: 'bookshelf', k: 'desk', s: 'shelf', c: 'counter', n: 'npc', g: 'gacha', x: 'table', r: 'rug',
};

/** 建物（同じ記号のかたまり）の名前ラベル */
const BUILDING_LABEL: Readonly<Record<string, MessageKey>> = {
  H: 'world.building.hall',
  A: 'world.building.home',
  B: 'world.building.shop',
  P: 'world.building.practice',
  N: 'world.building.neighbor',
};

const coins = (n: number): string => t('common.coins', { n } satisfies Params);

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
  #held: Direction | null = null;
  #busy = false;
  #raf = 0;
  #last = 0;
  #walked = 0;
  #destroyed = false;
  #mapLayer!: HTMLElement;
  #viewport!: HTMLElement;
  #player!: HTMLElement;
  #objectEls = new Map<string, HTMLElement>();
  #stick!: HTMLElement;
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
    this.#build();
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

  #build(): void {
    this.#touch = null;
    this.#held = null;
    const map = this.#map;
    const { width, height } = mapSize(map);
    const save = this.#store.save;
    const dungeon = save.activeDungeon ? getDungeon(save.activeDungeon.dungeonId) : undefined;
    const title = map.area === 'dungeon' && dungeon ? t('world.placeDungeon', { dungeon: dungeonName(dungeon), floor: mapName(map) }) : mapName(map);

    const tiles = h('div', { class: 'world__tiles' });
    tiles.style.gridTemplateColumns = `repeat(${width}, ${TILE}px)`;
    for (const row of map.tiles) {
      for (const ch of row) tiles.append(h('div', { class: `tile tile--${TILE_CLASS[ch] ?? 'wall'}` }));
    }

    this.#mapLayer = h('div', { class: `world__map world__map--${map.area}` }, tiles);
    this.#mapLayer.style.width = `${width * TILE}px`;
    this.#mapLayer.style.height = `${height * TILE}px`;
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
    this.#player.style.backgroundImage = `url("${save.player.gender === 'female' ? femaleSheet : maleSheet}")`;
    this.#mapLayer.append(this.#player);

    this.#viewport = h('div', { class: 'world__viewport' }, this.#mapLayer);

    const hud = h(
      'header',
      { class: 'world__hud' },
      h('div', { class: 'world__place' }, h('span', { class: 'world__place-name', text: title }), h('span', { class: 'world__place-note', text: t('world.placeNote') })),
      h('span', { class: 'world__coins', text: coins(save.coins) }),
      map.area === 'dungeon' ? button(t('world.escape'), () => this.#confirmLeave(), 'btn btn--small') : null,
      button(t('world.menu'), () => this.#menu(), 'btn btn--small'),
    );

    // 移動：画面のどこでも指を置いてすべらせると、その方向へ歩く（指を置いた所に半透明のスティックが出る）。
    // すべらせずに離したら、これまでどおりタップ（その場所へ歩く・人や家具に話す・調べる）
    this.#stick = h('div', { class: 'world__stick', attrs: { 'aria-hidden': 'true' } }, h('div', { class: 'world__stick-knob' }));
    this.#viewport.append(this.#stick);
    this.#viewport.addEventListener('pointerdown', (e) => this.#pointerDown(e));
    this.#viewport.addEventListener('pointermove', (e) => this.#pointerMove(e));
    this.#viewport.addEventListener('pointerup', (e) => this.#pointerUp(e, true));
    this.#viewport.addEventListener('pointercancel', (e) => this.#pointerUp(e, false));

    const examine = h(
      'button',
      { class: 'world__action', attrs: { type: 'button', 'aria-label': t('world.examine') }, on: { click: () => this.#examine() } },
      h('span', { class: 'world__action-icon', attrs: { 'aria-hidden': 'true' } }),
      h('span', { class: 'world__action-label', text: t('world.examine') }),
    );
    const hint = WorldView.#stickUsed ? null : h('div', { class: 'world__hint', text: t('world.hint') });

    const goal = showsPracticeGoal(save, map.id) ? h('div', { class: 'world__goal', text: t('story.goal.practice') }) : null;
    this.#root.replaceChildren(hud, this.#viewport, examine, hint ?? '', goal ?? '');
    this.#root.dataset.map = map.id;
    this.#root.dataset.intro = save.story.intro;
    this.#render();
  }

  #addLabels(): void {
    const map = this.#map;
    for (const [ch, label] of Object.entries(BUILDING_LABEL)) {
      let minX = Infinity, minY = Infinity, maxX = -1, maxY = -1;
      map.tiles.forEach((row, y) => [...row].forEach((c, x) => {
        if (c !== ch) return;
        minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
      }));
      if (maxX < 0) continue;
      const goal = ch === 'P' && showsPracticeGoal(this.#store.save, map.id);
      const el = h('div', { class: `world__label world__label--building${goal ? ' is-goal' : ''}`, text: t(label) });
      Object.assign(el.style, { left: `${minX * TILE}px`, top: `${minY * TILE}px`, width: `${(maxX - minX + 1) * TILE}px`, height: `${(maxY - minY + 1) * TILE}px` });
      this.#mapLayer.append(el);
    }
    for (const obj of map.objects) {
      if (obj.type !== 'interact' && obj.type !== 'warp') continue;
      const el = h('div', { class: `world__label world__label--${obj.type}`, text: objectLabel(obj) });
      Object.assign(el.style, { left: `${obj.x * TILE}px`, top: `${obj.y * TILE}px`, width: `${obj.w * TILE}px`, height: `${obj.h * TILE}px` });
      this.#mapLayer.append(el);
    }
  }

  #objectElement(obj: MapObject): HTMLElement | null {
    const place = (el: HTMLElement, x: number, y: number): HTMLElement => {
      el.style.left = `${x * TILE}px`;
      el.style.top = `${y * TILE}px`;
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
      // 会話の絵・歩行の絵が届くまでの仮の印（人物の絵は作らない）
      const name = t('story.speaker.neighborGuide');
      return place(
        h(
          'div',
          { class: 'world__npc', dataset: { npc: obj.npcId }, attrs: { 'aria-label': name } },
          h('span', { class: 'world__npc-dot', text: t('story.ui.portraitTemp') }),
          h('span', { class: 'world__npc-name', text: name }),
        ),
        obj.x,
        obj.y,
      );
    }
    if (obj.type === 'chest') {
      const save = this.#store.save;
      const opened = save.activeDungeon ? isChestOpened(save, save.activeDungeon.dungeonId, obj.id) : false;
      return place(h('div', { class: `world__chest${opened ? ' is-open' : ''}`, attrs: { 'aria-label': opened ? t('world.chestEmptyLabel') : t('world.chest') } }), obj.x, obj.y);
    }
    return null;
  }

  /* ---------- ループ ---------- */

  #frame(time: number): void {
    if (this.#destroyed) return;
    const dt = Math.min(0.05, (time - this.#last) / 1000);
    this.#last = time;
    if (!this.#busy) this.#step(dt);
    this.#render();
    this.#raf = requestAnimationFrame((t) => this.#frame(t));
  }

  #step(dt: number): void {
    if (this.#move) {
      this.#move.t += dt * WALK_SPEED;
      this.#walked += dt * WALK_SPEED;
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
      this.#tryStep(this.#dirTo(next));
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
    if (this.#held) this.#tryStep(this.#held);
  }

  #dirTo(p: Point): Direction {
    const dx = p.x - this.#tile.x;
    const dy = p.y - this.#tile.y;
    if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? 'right' : 'left';
    return dy > 0 ? 'down' : 'up';
  }

  #tryStep(dir: Direction): void {
    this.#dir = dir;
    const d = DIR_DELTA[dir];
    const to = { x: this.#tile.x + d.x, y: this.#tile.y + d.y };
    if (this.#blocked(to.x, to.y)) {
      const enemy = objectsAt(this.#map, to.x, to.y, this.#isVisible).find((o): o is EnemyObject => o.type === 'enemy');
      this.#path = [];
      if (enemy) this.#encounter(enemy);
      return;
    }
    this.#move = { from: this.#tile, to, t: 0 };
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
        this.load();
      } else if (target.kind === 'floor') {
        this.#store.update((s) => changeFloor(s, target.delta));
        this.load();
      } else if (target.kind === 'dungeonGate') {
        // 入口の1マス手前（北）に戻してから選択画面へ。戻ってきたとき入口の上に立ったままにならないように
        const back: Location = { mapId: this.#map.id, x: this.#tile.x, y: this.#tile.y - 1, dir: 'down' };
        this.#store.update((s) => ({ ...s, location: back }));
        this.#busy = true;
        this.#ctx.navigate('dungeonSelect');
      } else {
        this.#confirmLeave(true);
      }
    }
  }

  #render(): void {
    const p = this.#pos;
    const frame = this.#move ? Math.floor(this.#walked * 2) % 4 : 0;
    this.#player.style.transform = `translate(${p.x * TILE}px, ${p.y * TILE + TILE - SPRITE_H}px)`;
    this.#player.style.backgroundPosition = `${-frame * SPRITE_W}px ${-DIR_ROW[this.#dir] * SPRITE_H}px`;
    const { width, height } = mapSize(this.#map);
    const vw = this.#viewport.clientWidth || 390;
    const vh = this.#viewport.clientHeight || 600;
    const mw = width * TILE;
    const mh = height * TILE;
    const cx = mw <= vw ? (vw - mw) / 2 : -Math.min(Math.max(p.x * TILE + TILE / 2 - vw / 2, 0), mw - vw);
    const cy = mh <= vh ? (vh - mh) / 2 : -Math.min(Math.max(p.y * TILE + TILE / 2 - vh / 2, 0), mh - vh);
    this.#mapLayer.style.transform = `translate(${Math.round(cx)}px, ${Math.round(cy)}px)`;
    this.#root.dataset.px = String(this.#tile.x);
    this.#root.dataset.py = String(this.#tile.y);
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
    this.#held = this.#busy || dist < STICK_DEAD ? null : Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up';
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
        this.#held = dir;
      } else if (this.#held === dir) this.#held = null;
    } else if (down && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      this.#examine();
    }
  }

  #tap(e: MouseEvent): void {
    if (this.#busy) return;
    const rect = this.#mapLayer.getBoundingClientRect();
    const { width } = mapSize(this.#map);
    const scale = rect.width / (width * TILE);
    const x = Math.floor((e.clientX - rect.left) / scale / TILE);
    const y = Math.floor((e.clientY - rect.top) / scale / TILE);
    // 話しかけ・調べる対象（出入口は歩いて踏むので対象外）
    const target = objectsAt(this.#map, x, y, this.#isVisible).find((o) => o.type !== 'warp');
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

  /** 正面（と足元）を調べる */
  #examine(): void {
    if (this.#busy || this.#move) return;
    const d = DIR_DELTA[this.#dir];
    const front = { x: this.#tile.x + d.x, y: this.#tile.y + d.y };
    if (this.#interactAt(front.x, front.y)) return;
    for (const p of [this.#tile, front]) {
      const fragment = fragmentAt(this.#map.id, p.x, p.y);
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
    this.#objectEls.get(chest.id)?.classList.add('is-open');
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
