/**
 * シリーズ・ゲームの正式名称などアプリ全体の基本情報。
 * 2026-10-24 正式名称：ミストラルモンスターズ（ユーザー決定。本編もミストラルモンスターズに）。旧称ミルティル・ミストリア・セイクリッドモンスターズ
 */
export const APP_INFO = {
  seriesName: 'ミストラルモンスターズ',
  seriesNameEn: 'Mistral Monsters',
  gameName: 'ミストラルモンスターズ バトルカード',
  gameNameEn: 'Mistral Monsters Battle Card',
  /** ホーム画面アイコン下などの短い名前（2026-10-24 正式名称の変更に合わせて「セイクリッドBC」から。勝手に変えない） */
  shortName: 'ミストラルBC',
  version: '0.4.0',
  /** 現在の開発段階（夜間一括指示 2026-10-22：最小縦断体験） */
  phase: 3,
} as const;

/** いまの言語でのゲーム名（ブラウザのタブなど） */
export function localizedGameName(lang: 'ja' | 'en'): string {
  return lang === 'en' ? APP_INFO.gameNameEn : APP_INFO.gameName;
}

/**
 * スマートフォン縦持ちを基準にした論理解像度。
 * 実際の描画は src/core/stageLayout.ts で画面サイズに合わせて拡大縮小する。
 */
export const DESIGN_RESOLUTION = {
  width: 390,
  height: 844,
  orientation: 'portrait',
} as const;
