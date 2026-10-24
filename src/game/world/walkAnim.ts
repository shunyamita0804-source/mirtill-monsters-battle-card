import type { Direction } from '../save/saveData.ts';

/**
 * 主人公の歩き・走りの計算（DOM 非依存。2026-10-24 に worldScreen.ts から切り出し）。
 *
 * - 速さ：1秒あたりの論理px。歩き出しの加速・止まる前の減速・走り
 * - 1歩の長さ（歩幅）：人物の絵の高さに対する割合。コマ送りは「時間」ではなく「進んだ距離」で決める（足が地面をすべって見えないように）
 * - 位相（phase）：歩いた歩数（1.0＝1歩＝4コマ）。走りと歩きで歩幅が変わっても位相は続きから進む（コマが飛ばない）
 *
 * 歩行画面（src/ui/screens/worldScreen.ts）と、歩きの確認画面（src/ui/screens/walkLabScreen.ts）が同じ計算を使う。
 * 数値はすべて仮（ユーザーの iPhone 確認で調整）。
 */

/**
 * 歩行速度（論理px/秒）。2026-10-22 に街を詰めたとき 185 から 1.25 倍の 231 に（ユーザー指示）。
 * 2026-10-24 第3版の絵に歩幅を合わせたら足の回転が速すぎた（約6.3歩/秒）ので、ユーザー「歩く速さを下げて」で 185 に戻す（約5歩/秒・20コマ/秒）
 */
export const WALK_PX = 185;
/** 走る：歩きに対する速さの倍率（2026-10-23・ユーザー承認）。走る絵はまだ無いので、歩きの絵を大きな歩幅で使う */
export const RUN_RATE = 1.7;
/**
 * 1歩で進む距離（人物のコマの高さ＝figureH に対する割合）。
 * 2026-10-24 ユーザー「動きがチープで本当に歩いているように見えない」：足がパタパタ速すぎたので 0.45→0.58（約5歩/秒）。
 * 2026-10-24（第3版の絵）：男性・左向きの8コマで「地面に着いた足が体に対して動く量」を測ると 1歩 137px（コマの高さ 360 の 0.38）だったので、
 * 絵に合わせて 0.38 に（足が地面をすべらない。歩く速さ 185px/秒 で約 5歩/秒＝20コマ/秒）
 */
export const STEP_PER_HEIGHT = 0.38;
/**
 * 走りの1歩（コマの高さに対する割合）。2026-10-24 第3版の走りの絵（男性・左向き）：着地のときの前後の足の幅がコマの高さの約 0.56、
 * そこに両足が浮いて進むぶんを足して 0.7 に（走る速さ 315px/秒 で約 4.6歩/秒・18コマ/秒）。走りの絵が無い向きも同じ値
 */
export const RUN_STEP_PER_HEIGHT = 0.7;
/**
 * 歩き出し・止まり方（2026-10-23）：歩き出しは ACCEL_FROM の速さから ACCEL_S 秒でふつうの速さに。
 * 止まる最後のマスでは、マスの終わりで DECEL_TO の速さまで落とす
 */
export const ACCEL_S = 0.15;
export const ACCEL_FROM = 0.45;
export const DECEL_TO = 0.55;
/** 歩き終えてから、立ち止まりの絵に切り替えるまでの猶予（ミリ秒。歩き続けている途中のマスの切り替わりで絵がちらつかないように） */
export const WALK_HOLD_MS = 90;

/**
 * 主人公の歩行素材：1コマ 216×288（ゲームのシートは 1.25 倍の 270×360）、足元 (108, 270)。
 * 9列（歩き1周8コマ＋立ち止まり）×8行（正面・背中・左・右・左下・右下・左上・右上）。tools/art/adult_walk_build.py が作る
 */
export const FRAME_W = 216;
export const FRAME_H = 288;
export const FOOT_X = 108;
export const FOOT_Y = 270;
export const PLAYER_SHEET_COLS = 9;
/** 行：歩き8行（正面・背中・左・右・左下・右下・左上・右上）＋走り4行（正面・背中・左・右。2026-10-24 第3版〜） */
export const PLAYER_SHEET_ROWS = 12;
/** 走りの行は歩きの行の下（行 8〜11）。走りの絵が無い向きは歩きの行の写しが入っている */
export const RUN_ROW_BASE = 8;
/** 歩き1周のコマ数（右足の1歩4コマ＋左足の1歩4コマ）と、1歩のコマ数、シートの立ち止まりの列 */
export const WALK_COLS = 8;
export const FRAMES_PER_STEP = 4;
export const IDLE_COL = 8;

export type PlayerGender = 'male' | 'female';
/** 主人公の斜め向き（絵の向きだけ。セーブや「しらべる」の向きは上下左右の Direction のまま） */
export type Diagonal = 'downleft' | 'downright' | 'upleft' | 'upright';
export const DIR_ROW: Readonly<Record<Direction, number>> = { down: 0, up: 1, left: 2, right: 3 };
/** 主人公のシートの斜め向きの行（上下左右の4行の下に足した4行） */
export const DIAG_ROW: Readonly<Record<Diagonal, number>> = { downleft: 4, downright: 5, upleft: 6, upright: 7 };
/** シートの行 → 絵の向きの名前（確認画面の表示用） */
export const ROW_NAMES: readonly (Direction | Diagonal)[] = ['down', 'up', 'left', 'right', 'downleft', 'downright', 'upleft', 'upright'];

/**
 * 第2版の絵（1周8コマ。体の上下まで描いてある）が入っている行。この行では、プログラムで付ける体の縮み・影の動きをやめる（絵と二重になるため）。
 * 第2版の絵が届いたらここに行を足す（行の番号は DIR_ROW・DIAG_ROW）。
 * それ以外の行は、前の絵「右足を前・立つ・左足を前」を1コマずつ2回並べた8コマ（実質3ポーズ）
 */
export const PLAYER_V2_ROWS: Readonly<Record<PlayerGender, ReadonlySet<number>>> = { male: new Set([0, 1, 2, 3, 8, 9, 10, 11]), female: new Set() };
/** 走りの絵（第3版・1周8コマ）が入っている行。この行では、プログラムで付ける体の傾きもやめる（前傾が絵に描いてある） */
export const PLAYER_RUN_ART_ROWS: Readonly<Record<PlayerGender, ReadonlySet<number>>> = { male: new Set([10, 11]), female: new Set() };

/** 1歩の長さ（論理px）。figureH は人物のコマの高さ（論理px） */
export function strideOf(figureH: number, running: boolean): number {
  return figureH * (running ? RUN_STEP_PER_HEIGHT : STEP_PER_HEIGHT);
}

/**
 * いまの歩く速さ（論理px/秒）。走る・歩き出しの加速（moveTime＝歩き出してからの秒）・止まる最後のマスの減速
 * （decelT＝最後のマスの進み具合 0〜1。減速しないときは null）
 */
export function walkSpeed(running: boolean, moveTime: number, decelT: number | null, scale = 1): number {
  let v = WALK_PX * (running ? RUN_RATE : 1) * scale;
  v *= Math.min(1, ACCEL_FROM + ((1 - ACCEL_FROM) * moveTime) / ACCEL_S);
  if (decelT !== null) v *= 1 - (1 - DECEL_TO) * decelT;
  return v;
}

export interface MoveAdvance {
  /** 1歩の進み具合（0〜1。1以上＝着いた） */
  readonly t: number;
  /** この更新で進んだ距離（論理px。マスの終わりで止まる） */
  readonly dist: number;
  /** 着いたあとに残った時間（秒）。歩き続けるときは次のマスに持ち越す */
  readonly rest: number;
}

/**
 * 1歩（1マス）の途中を dt 秒ぶん進める。速さは論理px/秒、cell は1マスの論理px、len は1歩の長さ（斜めは √2）。
 * 斜めは len で割るので、縦横と同じ速さ（論理px/秒）で進む（斜めだけ速くならない）
 */
export function advanceMove(t: number, len: number, dt: number, speedPx: number, cell: number): MoveAdvance {
  const speedCells = speedPx / cell;
  const next = t + (dt * speedCells) / len;
  const dist = (Math.min(1, next) - t) * len * cell;
  const rest = next >= 1 && speedCells > 0 ? ((next - 1) * len) / speedCells : 0;
  return { t: next, dist, rest };
}

/**
 * 歩きの位相を進める。dist 論理px 進んだとき、いまの歩幅 stride で何歩ぶんかを足す。
 * animScale は確認画面用の「再生速度の倍率」（1＝進んだ距離どおり。本編は常に1）
 */
export function advancePhase(phase: number, dist: number, stride: number, animScale = 1): number {
  if (stride <= 0) return phase;
  return phase + (dist / stride) * animScale;
}

/** 位相（歩数）→ 歩きのコマ（0〜7）。右足が着く＝0、左足が着く＝4 */
export function frameOf(phase: number): number {
  return Math.floor(phase * FRAMES_PER_STEP) % WALK_COLS;
}

/** 足が地面に着くコマか（足音を鳴らすコマ） */
export function isContactFrame(frame: number): boolean {
  return frame % FRAMES_PER_STEP === 0;
}

/**
 * 体の縮み・伸び（−1〜1）。前の絵（1ポーズ＝2列）の行だけに使う：足を出したポーズ（半歩）の真ん中で 1（いちばん縮む）、
 * 立つポーズの真ん中で −1。位相から決めるので、足のコマ送りとずれない
 */
export function squashOf(phase: number): number {
  return Math.cos(Math.PI * (phase * 2 - 0.5));
}

/** 歩いている最中か（1歩の途中、または歩き終えてから WALK_HOLD_MS 以内） */
export function isWalking(now: number, lastMoving: number, moving: boolean): boolean {
  return moving || now - lastMoving < WALK_HOLD_MS;
}

/**
 * 1歩の向き → 人物の向き（上下左右。主人公の斜めの絵は別に diagonalOf で選ぶ）。
 * いまの向きの成分がある斜め（例：右を向いて右下へ）は向きを変えない。斜め45度あたりで正面と横の絵が細かく入れ替わらないように。
 * それ以外の斜めは左右の絵
 */
export function facing(dx: number, dy: number, prev: Direction): Direction {
  if (dx === 0 && dy === 0) return prev;
  const p = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } }[prev];
  if ((p.x !== 0 && p.x === dx) || (p.y !== 0 && p.y === dy)) return prev;
  return dx > 0 ? 'right' : dx < 0 ? 'left' : dy > 0 ? 'down' : 'up';
}

/** 1歩の向き → 斜めの絵の向き（斜めでなければ null） */
export function diagonalOf(dx: number, dy: number): Diagonal | null {
  return dx !== 0 && dy !== 0 ? `${dy > 0 ? 'down' : 'up'}${dx > 0 ? 'right' : 'left'}` : null;
}

/**
 * 絵の向き → シートの行。走っているときは走りの行（歩きの行＋8）。斜めに走るときは横（左・右）の走りの行
 * （斜めの走りの絵は作らない。2026-10-24 第3版の決めごと：斜めは横の絵で代用）
 */
export function sheetRow(dir: Direction, diag: Diagonal | null, running = false): number {
  if (!running) return diag ? DIAG_ROW[diag] : DIR_ROW[dir];
  const side: Direction = diag ? (diag.endsWith('left') ? 'left' : 'right') : dir;
  return RUN_ROW_BASE + DIR_ROW[side];
}

/** 1秒あたりのコマ数（この速さ・歩幅でコマが切り替わる速さ。確認画面の表示用） */
export function framesPerSecond(speedPx: number, stride: number, animScale = 1): number {
  return stride > 0 ? (speedPx / stride) * FRAMES_PER_STEP * animScale : 0;
}

export interface SheetStatus {
  /** 歩き：第2版の1周8コマ（v2）／前の3ポーズを2回ずつ並べた8コマ（legacy） */
  readonly walk: 'v2' | 'legacy';
  /** 走り：第3版の1周8コマ（v3）／専用の絵は無い（歩きの絵を速く・大きな歩幅で）（none） */
  readonly run: 'v3' | 'none';
  /** 立ち止まり：専用の列がある */
  readonly idle: true;
  /** 右向きは左向きの左右反転（かばんなど左右で違う持ち物が入れ替わる） */
  readonly mirrored: boolean;
}

/** その人物・その行のシートに、どの絵が入っているか（確認画面で「未実装」を出すため） */
export function sheetStatus(gender: PlayerGender, row: number): SheetStatus {
  const walkRow = row >= RUN_ROW_BASE ? row - RUN_ROW_BASE : row;
  return {
    walk: PLAYER_V2_ROWS[gender].has(walkRow) ? 'v2' : 'legacy',
    run: PLAYER_RUN_ART_ROWS[gender].has(RUN_ROW_BASE + (walkRow < 4 ? walkRow : walkRow === DIAG_ROW.downleft || walkRow === DIAG_ROW.upleft ? DIR_ROW.left : DIR_ROW.right)) ? 'v3' : 'none',
    idle: true,
    mirrored: walkRow === DIR_ROW.right || walkRow === DIAG_ROW.downright || walkRow === DIAG_ROW.upright,
  };
}
