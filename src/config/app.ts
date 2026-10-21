/** シリーズ・ゲームの正式名称などアプリ全体の基本情報 */
export const APP_INFO = {
  seriesName: 'ミルティルモンスターズ',
  gameName: 'ミルティルモンスターズバトルカード',
  version: '0.0.0',
  /** 現在の開発段階（第1段階：開発環境構築） */
  phase: 1,
} as const;

/**
 * スマートフォン縦持ちを基準にした論理解像度。
 * 実際の描画は画面サイズに合わせて拡大縮小する想定（第2段階以降で実装）。
 */
export const DESIGN_RESOLUTION = {
  width: 390,
  height: 844,
  orientation: 'portrait',
} as const;
