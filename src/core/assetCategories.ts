/**
 * assets/ 配下の素材カテゴリ定義。
 * ディレクトリ構成（assets/README.md）と一致させること。テストで整合性を確認している。
 */
export const ASSET_CATEGORIES = {
  monsterCards: 'images/cards/monsters',
  skillCards: 'images/cards/skills',
  characters: 'images/characters',
  backgrounds: 'images/backgrounds',
  ui: 'images/ui',
  icons: 'images/icons',
  townMaps: 'images/maps/town',
  dungeonMaps: 'images/maps/dungeon',
  effects: 'images/effects',
  bgm: 'audio/bgm',
  se: 'audio/se',
  fonts: 'fonts',
  data: 'data',
} as const;

export type AssetCategory = keyof typeof ASSET_CATEGORIES;

/** 素材ファイル名に使ってよい文字（小文字英数字・ハイフン・アンダースコア） */
const ASSET_FILE_NAME = /^[a-z0-9][a-z0-9_-]*\.[a-z0-9]+$/;

export function isValidAssetFileName(fileName: string): boolean {
  return ASSET_FILE_NAME.test(fileName);
}

/** カテゴリとファイル名から assets/ 相対パスを作る */
export function assetRelativePath(category: AssetCategory, fileName: string): string {
  if (!isValidAssetFileName(fileName)) {
    throw new Error(`素材ファイル名が命名規則に合いません: ${fileName}`);
  }
  return `${ASSET_CATEGORIES[category]}/${fileName}`;
}
