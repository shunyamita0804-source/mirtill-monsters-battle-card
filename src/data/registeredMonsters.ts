import themeColors from './official/monster_theme_colors.json';

/**
 * 【登録のみ】絵が届いているが、まだゲームで使わないモンスターカード（2026-10-23 ユーザー指示「用途が不明なモンスターカードは一旦登録のみ」）。
 *
 * カードの一覧（cards.ts の MONSTERS）には入れていない（適合技がまだ無く、図鑑やデッキに出すと遊べないため）。
 * 使うと決まったら、cards.ts に正式モンスターとして足し、技カードを用意する。
 * ライフは正式カードの絵に書かれた値。キー（gauul・lazuck）は monster_theme_colors.json のもの。
 * 絵：assets/images/cards/monsters/{key}_official.webp（正式カード）・{key}_battle.webp（バトル用）
 */
export interface RegisteredMonster {
  readonly key: string;
  readonly nameJa: string;
  readonly life: number;
  readonly themeColor: string;
  readonly officialArt: string;
  readonly battleArt: string;
}

export const REGISTERED_ONLY_MONSTERS: readonly RegisteredMonster[] = [
  {
    key: 'gauul',
    nameJa: 'ガウル',
    life: 6,
    themeColor: themeColors.monsters.gauul.hex,
    officialArt: 'gauul_official.webp',
    battleArt: 'gauul_battle.webp',
  },
  {
    key: 'lazuck',
    nameJa: 'ラズック',
    life: 6,
    themeColor: themeColors.monsters.lazuck.hex,
    officialArt: 'lazuck_official.webp',
    battleArt: 'lazuck_battle.webp',
  },
];
