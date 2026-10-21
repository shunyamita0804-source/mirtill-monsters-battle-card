import { getDungeon, ENCOUNTERS } from '../../data/dungeons.ts';
import { CURRENCY } from '../../data/economy.ts';
import { FRAGMENT_TOTAL } from '../../data/fragments.ts';
import { getMap, type ChestObject, type EnemyObject, type MapDefinition, type MapObject } from '../../data/maps.ts';
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
import { confirmModal, messageModal, openModal } from '../components/modal.ts';
import { button, h } from '../dom.ts';
import maleSheet from '@assets/images/characters/player_male_walk_qa.png';
import femaleSheet from '@assets/images/characters/player_female_walk_qa.png';
import type { ScreenContext, ScreenDefinition } from './types.ts';

/** 1マスの大きさ（論理px） */
const TILE = 40;
/** 歩行速度（マス/秒・仮。実機で調整） */
const WALK_SPEED = 4.5;
/** 歩行素材：128×144 を 40×45 に縮小。行＝方向（front/back/left/right）、列＝4コマ */
const SPRITE_W = 40;
const SPRITE_H = 45;
const DIR_ROW: Readonly<Record<Direction, number>> = { down: 0, up: 1, left: 2, right: 3 };

const TILE_CLASS: Readonly<Record<string, string>> = {
  '#': 'wall', '.': 'floor', ',': 'grass', '=': 'road', T: 'tree', '~': 'water', H: 'bld-hall', A: 'bld-home',
  B: 'bld-shop', D: 'door', d: 'exit', F: 'fountain', S: 'stairs-down', U: 'stairs-up', b: 'bed', M: 'wallmap',
  h: 'bookshelf', k: 'desk', s: 'shelf', c: 'counter', n: 'npc', g: 'gacha', x: 'table', r: 'rug',
};

/** 建物（同じ記号のかたまり）の名前ラベル */
const BUILDING_LABEL: Readonly<Record<string, string>> = { H: '大会会場', A: '家', B: 'カードショップ' };

export const worldScreen: ScreenDefinition = {
  id: 'world',
  title: '街',
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
    if (flash) {
      this.#store.flashMessage = null;
      this.#message(flash);
    }
  }

  /* ---------- 表示の組み立て ---------- */

  #isVisible = (obj: MapObject): boolean => (obj.type === 'enemy' ? isEnemyActive(this.#store.save, obj.id) : true);

  #blocked = (x: number, y: number): boolean => isBlocked(this.#map, x, y, this.#isVisible);

  #build(): void {
    const map = this.#map;
    const { width, height } = mapSize(map);
    const save = this.#store.save;
    const dungeon = save.activeDungeon ? getDungeon(save.activeDungeon.dungeonId) : undefined;
    const title = map.area === 'dungeon' && dungeon ? `${dungeon.name} ${map.name}` : map.name;

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
    this.#player = h('div', { class: 'world__player', attrs: { 'aria-label': 'プレイヤー' } });
    this.#player.style.backgroundImage = `url("${save.player.gender === 'female' ? femaleSheet : maleSheet}")`;
    this.#mapLayer.append(this.#player);

    this.#viewport = h('div', { class: 'world__viewport', on: { click: (e) => this.#tap(e) } }, this.#mapLayer);

    const hud = h(
      'header',
      { class: 'world__hud' },
      h('div', { class: 'world__place' }, h('span', { class: 'world__place-name', text: title }), h('span', { class: 'world__place-note', text: '仮マップ・歩行素材QA試作' })),
      h('span', { class: 'world__coins', text: `${save.coins}${CURRENCY.unit}` }),
      map.area === 'dungeon' ? button('脱出', () => this.#confirmLeave(), 'btn btn--small') : null,
      button('メニュー', () => this.#menu(), 'btn btn--small'),
    );

    const pad = h('div', { class: 'world__pad', attrs: { 'aria-label': '移動パッド' } });
    for (const dir of ['up', 'left', 'right', 'down'] as const) {
      const label = { up: '▲', down: '▼', left: '◀', right: '▶' }[dir];
      const b = h('button', { class: `world__pad-btn world__pad-btn--${dir}`, text: label, attrs: { type: 'button', 'aria-label': `${dir}へ移動` } });
      const press = (e: Event): void => {
        e.preventDefault();
        this.#path = [];
        this.#afterPath = null;
        this.#held = dir;
      };
      const release = (): void => {
        if (this.#held === dir) this.#held = null;
      };
      b.addEventListener('pointerdown', press);
      b.addEventListener('pointerup', release);
      b.addEventListener('pointerleave', release);
      b.addEventListener('pointercancel', release);
      pad.append(b);
    }

    const controls = h(
      'div',
      { class: 'world__controls' },
      pad,
      h('div', { class: 'world__hint', text: '地面をタップでその場所へ移動\n人や家具をタップで話す・調べる' }),
      button('しらべる', () => this.#examine(), 'world__action'),
    );

    this.#root.replaceChildren(hud, this.#viewport, controls);
    this.#root.dataset.map = map.id;
    this.#render();
  }

  #addLabels(): void {
    const map = this.#map;
    const seen = new Set<string>();
    for (const [ch, label] of Object.entries(BUILDING_LABEL)) {
      let minX = Infinity, minY = Infinity, maxX = -1, maxY = -1;
      map.tiles.forEach((row, y) => [...row].forEach((c, x) => {
        if (c !== ch) return;
        minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
      }));
      if (maxX < 0) continue;
      seen.add(ch);
      const el = h('div', { class: 'world__label world__label--building', text: label });
      Object.assign(el.style, { left: `${minX * TILE}px`, top: `${minY * TILE}px`, width: `${(maxX - minX + 1) * TILE}px`, height: `${(maxY - minY + 1) * TILE}px` });
      this.#mapLayer.append(el);
    }
    for (const obj of map.objects) {
      if (obj.type !== 'interact' && obj.type !== 'warp') continue;
      const el = h('div', { class: `world__label world__label--${obj.type}`, text: obj.label });
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
        text: obj.boss ? 'BOSS' : '敵',
        attrs: { 'aria-label': enc ? enc.name : '敵' },
      });
      return place(el, obj.x, obj.y);
    }
    if (obj.type === 'chest') {
      const save = this.#store.save;
      const opened = save.activeDungeon ? isChestOpened(save, save.activeDungeon.dungeonId, obj.id) : false;
      return place(h('div', { class: `world__chest${opened ? ' is-open' : ''}`, attrs: { 'aria-label': opened ? '空の宝箱' : '宝箱' } }), obj.x, obj.y);
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
          this.#message(`ふしぎな欠片を見つけた！（${fragmentCount(r.save)}/${FRAGMENT_TOTAL}）\n10個集めるとショップで特別な復元ができるらしい。`);
          return;
        }
      }
    }
    this.#message('とくに何もない。');
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
      if (obj.type === 'interact') {
        this.#action(obj.action, obj.message);
        return true;
      }
    }
    return false;
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
      default: this.#message(message ?? '');
    }
  }

  #openChest(chest: ChestObject): void {
    const r = openChest(this.#store.save, chest);
    if (!r.opened) {
      this.#message('宝箱は空っぽだ。');
      return;
    }
    this.#store.update(() => r.save);
    this.#objectEls.get(chest.id)?.classList.add('is-open');
    const parts: string[] = [];
    if (chest.reward.coins > 0) parts.push(`${chest.reward.coins}${CURRENCY.unit}`);
    for (const c of chest.reward.cards) parts.push(`カード（${c.cardId.startsWith('skl') ? '技' : 'モンスター'}）×${c.count}`);
    this.#message(`宝箱を開けた！\n${parts.join('、')} を手に入れた。`);
  }

  #encounter(enemy: EnemyObject): void {
    if (this.#busy) return;
    const opponent = ENCOUNTERS[enemy.encounterId];
    if (!opponent) return;
    const store = this.#store;
    if (!isDeckValid(store.save.deck, store.save.collection)) {
      this.#message('デッキの構成が正しくないため戦えない。家の机でデッキを確認しよう。');
      return;
    }
    this.#busy = true;
    this.#held = null;
    this.#path = [];
    const ctx = this.#ctx;
    const names = opponent.monsters.map((m) => getMonster(m).name).join('・');
    store.pendingBattle = {
      title: enemy.boss ? 'ボス戦' : 'ダンジョン戦',
      opponent,
      allowSurrender: true,
      onFinish: (winner) => {
        if (winner === 'player') {
          const r = defeatEnemy(store.save, enemy.id, enemy.boss);
          store.update((s) => ({ ...r.save, stats: { ...s.stats, battlesWon: s.stats.battlesWon + 1 } }));
          if (r.cleared) {
            store.update((s) => leaveDungeon(s));
            store.flashMessage = `ボスを倒した！ダンジョンクリア！\n${r.coins}${CURRENCY.unit} を手に入れた。${r.firstClear ? '（初回クリア報酬）' : ''}\n家に帰ってきた。`;
          } else {
            store.flashMessage = `勝利！ ${r.coins}${CURRENCY.unit} を手に入れた。`;
          }
        } else {
          store.update((s) => ({ ...leaveDungeon(s), stats: { ...s.stats, battlesLost: s.stats.battlesLost + 1 } }));
          store.flashMessage = '負けてしまった…。\n家に戻ってきた。（ダンジョンには何度でも挑戦できます）';
        }
        ctx.reset('world');
      },
    };
    this.#message(`${opponent.name}が現れた！\n（${names}）`, () => ctx.navigate('battle'));
  }

  #confirmLeave(fromStairs = false): void {
    this.#busy = true;
    confirmModal(
      this.#root,
      '街へ帰りますか？',
      [h('p', { class: 'modal__text', text: '探索を終えて家に戻ります。倒した敵は次の探索で復活します。' })],
      '帰る',
      () => {
        this.#store.update((s) => leaveDungeon(s));
        this.load();
      },
      fromStairs ? 'まだ探索する' : 'やめる',
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
      title: 'メニュー',
      body: [
        h('p', { class: 'modal__text', text: `ランク：${save.rank}　所持金：${save.coins}${CURRENCY.unit}` }),
        h('p', { class: 'modal__text', text: `デッキ：${deckOk ? '使用可能' : '構成に問題あり（家の机で確認）'}` }),
        fragments > 0 ? h('p', { class: 'modal__text', text: `ふしぎな欠片：${fragments}/${FRAGMENT_TOTAL}` }) : null,
        h('p', { class: 'modal__text modal__text--sub', text: `進行状況は自動で保存されます${this.#store.lastSaveOk ? '' : '（※保存に失敗しています）'}` }),
      ],
      actions: [
        { label: 'タイトルへ', onTap: () => { handle.close(); this.#ctx.reset('title'); } },
        { label: '閉じる', primary: true, onTap: () => handle.close() },
      ],
      onClose: () => {
        this.#busy = false;
      },
    });
  }
}
