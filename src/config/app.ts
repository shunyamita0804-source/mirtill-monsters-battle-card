/** シリーズ・ゲームの正式名称などアプリ全体の基本情報 */
export const APP_INFO = {
  seriesName: 'ミストリアモンスターズ',
  seriesNameEn: 'Mistria Monsters',
  gameName: 'ミストリアモンスターズ バトルカード',
  gameNameEn: 'Mistria Monsters Battle Card',
  /** ホーム画面アイコン下などの短い名前 */
  shortName: 'ミストリアBC',
  version: '0.3.0',
  /** 現在の開発段階（夜間一括指示 2026-10-22：最小縦断体験） */
  phase: 3,
} as const;

/**
 * スマートフォン縦持ちを基準にした論理解像度。
 * 実際の描画は src/core/stageLayout.ts で画面サイズに合わせて拡大縮小する。
 */
export const DESIGN_RESOLUTION = {
  width: 390,
  height: 844,
  orientation: 'portrait',
} as const;
