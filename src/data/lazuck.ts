import type { MonsterCard, SkillCard, SkillEffect } from '../game/cards/cardTypes.ts';
import officialSkills from './official/lazuck_cards_OFFICIAL.json';
import themeColors from './official/monster_theme_colors.json';
import { officialSkill, twoDigits, type OfficialSkill } from './officialSkills.ts';

/**
 * 【正式データ】ラズックの技カード16種（2026-10-23 ユーザー確定。Seimon_Razukku_ALL16_Claude_ImplementationPack_20261023）。
 *
 * 正本は src/data/official/lazuck_cards_OFFICIAL.json（届いたファイルを無改変で置いている）。
 * 技名・マナ・ダメージ・種別・効果テキスト・初期/収集の区分は、ここで書き換えずに JSON からそのまま読む。
 *
 * ゲーム内 ID とデザイン ID の対応（docs/card-data-policy.md にも記録）：
 *   mon-lazuck＝ラズック、skl-lazuck-01〜16＝LAZ-SK-01〜16（番号は同じ）
 *
 * まだ決まっていないこと（独断で決めない）：
 * - 用途（2026-10-23 ユーザー「用途はまだ後から決める。登録と、仮置きでソラモしかいない所にラズックも出して」）
 * - 初期・収集の配分：全体の方針は初期8・収集8だが、1枚ずつの指定を足すと初期10・収集6（01〜08・11・14 が初期）。
 *   データは1枚ずつの指定のまま持ち、配布・スターター・パックには使っていない
 * - レアリティ・正式英語・配る枚数・パック・価格・景品・敵の編成
 * - ちょうはつ・ダストキックの細かい裁定（下の SPECIAL_EFFECTS と engine.ts の【要仕様確定】）
 */
export const LAZUCK_MONSTER_ID = 'mon-lazuck';
export const lazuckSkillId = (no: number): string => `skl-lazuck-${twoDigits(no)}`;

/**
 * ラズックのモンスターカード。ライフ 6・絵・枠色は、それまで「登録のみ」にしていた正式カードのもの（src/data/registeredMonsters.ts から移した）
 */
export const LAZUCK_MONSTER: MonsterCard = {
  kind: 'monster',
  id: LAZUCK_MONSTER_ID,
  name: officialSkills.monster_name_ja,
  rarity: null,
  life: officialSkills.monster_life,
  themeColor: themeColors.monsters.lazuck.hex,
  description: 'ラズック（モンスターランクC）。',
  isPlaceholder: false,
  art: { category: 'monsterCards', file: 'lazuck_official.webp', layout: 'full' },
  battleArt: { category: 'monsterCards', file: 'lazuck_battle.webp', layout: 'full' },
  pendingSpec: ['rarity'],
};

/**
 * 効果テキストのある技の、ゲームでの動き（効果テキストの文は書き換えず、動きだけをここで表す）。
 * JSON の effect_logic_spec と同じ意味（テストで照らし合わせる）。
 * 【要仕様確定】
 * - LAZ-SK-07 ちょうはつ：限るのは攻撃の技だけ。相手の場にラズックが1体もいなければ制限なし。ラズックが複数いればどれでもよい
 * - LAZ-SK-08 ダストキック：重ねがけはしない（2回目も −1 のまま、期限だけ次の手番に）
 */
const SPECIAL_EFFECTS: Readonly<Record<string, SkillEffect>> = {
  'LAZ-SK-04': { type: 'attack', undodgeable: true },
  'LAZ-SK-07': { type: 'taunt' },
  'LAZ-SK-08': { type: 'weaken', stat: 'force', amount: 1, duration: 'nextTurn' },
  'LAZ-SK-11': { type: 'defense', reduce: 3, against: 'force' },
  'LAZ-SK-12': { type: 'defense', reduce: 4, against: 'wisdom' },
  'LAZ-SK-13': { type: 'defense', reduce: 2, against: 'all' },
  'LAZ-SK-14': { type: 'evade', against: 'force' },
  'LAZ-SK-15': { type: 'evade', against: 'wisdom' },
  'LAZ-SK-16': { type: 'evade', against: 'all' },
};

export const LAZUCK_SKILLS: readonly SkillCard[] = (officialSkills.skill_cards as readonly OfficialSkill[]).map((o) =>
  officialSkill(o, {
    label: 'ラズック',
    monsterId: LAZUCK_MONSTER_ID,
    skillId: lazuckSkillId,
    artFile: (no) => `laz_sk_${twoDigits(no)}.webp`,
    specialEffects: SPECIAL_EFFECTS,
  }),
);
