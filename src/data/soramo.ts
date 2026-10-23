import type { MonsterCard, SkillCard, SkillEffect } from '../game/cards/cardTypes.ts';
import { officialSkill, twoDigits, type OfficialSkill } from './officialSkills.ts';
import officialSkills from './official/soramo_cards_OFFICIAL.json';
import themeColors from './official/monster_theme_colors.json';

/**
 * 【正式データ】ソラモの技カード16種（2026-10-23 ユーザー確定。初めての正式カード）。
 *
 * 正本は src/data/official/soramo_cards_OFFICIAL.json（届いたファイルを無改変で置いている）。
 * 技名・マナ・ダメージ・種別・効果テキスト・初期/収集の区分は、ここで書き換えずに JSON からそのまま読む。
 *
 * ゲーム内 ID とデザイン ID の対応（docs/card-data-policy.md にも記録）：
 *   mon-soramo＝ソラモ、skl-soramo-01〜16＝SOR-SK-01〜16（番号は同じ）
 *
 * まだ決まっていないこと（独断で決めない）：
 * - ソラモのモンスターカードのレアリティ（ライフ・絵は 2026-10-23 に正式カードが届いた）
 * - 技カードのレアリティ（C/U/R）。モンスターのランク C とは別物なので null
 * - スターターデッキの内訳・配る枚数・パックの提供割合・価格・入手場所（パックには入れていない）。
 *   2026-10-23 ユーザー指示「技の発動を見るため、仮のカードはすべてソラモに」で、テスト用に
 *   スターター・相手の編成をソラモにしている（src/game/deck/deck.ts の TEST_SORAMO_DECK。正式の内訳ではない）
 * - 効果の細かい裁定（下の SPECIAL_EFFECTS のコメント・docs/battle-rules.md「要仕様確定」）
 */

export const SORAMO_MONSTER_ID = 'mon-soramo';
export const soramoSkillId = (no: number): string => `skl-soramo-${twoDigits(no)}`;

/** ソラモのモンスターランク（カードのレアリティとは別物） */
export const SORAMO_RANK = officialSkills.monster_rank;

/**
 * ソラモのモンスターカード（2026-10-23 正式。Mismon_MonsterCards_Official_and_Battle_20261023）。
 * ライフ 7 は正式カードの絵に書かれた値。絵は2種類：正式カード（名前・LIFE 入り。ショップ・図鑑・自宅）とバトル用（文字なし）
 */
export const SORAMO_MONSTER: MonsterCard = {
  kind: 'monster',
  id: SORAMO_MONSTER_ID,
  name: officialSkills.name_ja,
  rarity: null,
  life: 7,
  themeColor: themeColors.monsters.soramo.hex,
  description: 'ソラモ（モンスターランクC）。',
  isPlaceholder: false,
  art: { category: 'monsterCards', file: 'soramo_official.webp', layout: 'full' },
  battleArt: { category: 'monsterCards', file: 'soramo_battle.webp', layout: 'full' },
  pendingSpec: ['rarity'],
};

/**
 * 効果テキストのある技の、ゲームでの動き（効果テキストの文は書き換えず、動きだけをここで表す）。
 * 防御の「−3」・攻撃の種類は効果テキストのとおり（テストで文と照らし合わせる）。
 * 【要仕様確定】
 * - SOR-SK-03 すてみタックル：「当たった」＝ダメージが1以上のとき、とした。回避されたら当たっていない。防御で0になったときは仮に「当たっていない」
 * - SOR-SK-07 吠える：次に「ちから」の技を使うときに1減らして消える。重ねがけはしない（2回目は −1 のまま）。どこまで続くかは未定
 * - SOR-SK-08 すなかけ：選ばれたモンスターは、持ち主の次のターンに攻撃の技を使えない（攻撃でない技は使える）。そのターンが終われば元に戻る
 */
const SPECIAL_EFFECTS: Readonly<Record<string, SkillEffect>> = {
  'SOR-SK-03': { type: 'attack', selfDamageOnHit: 1 },
  'SOR-SK-07': { type: 'weaken', stat: 'force', amount: 1 },
  'SOR-SK-08': { type: 'seal' },
  'SOR-SK-11': { type: 'defense', reduce: 3, against: 'force' },
  'SOR-SK-12': { type: 'defense', reduce: 3, against: 'wisdom' },
  'SOR-SK-13': { type: 'defense', reduce: 3, against: 'all' },
  'SOR-SK-14': { type: 'evade', against: 'all' },
  'SOR-SK-15': { type: 'defense', reduce: 3, against: 'all' },
  'SOR-SK-16': { type: 'evade', against: 'all' },
};

/**
 * 【テスト用】相手（大会・ダンジョン・練習試合）のモンスター：ソラモ3体（2026-10-23 ユーザー指示「技の発動を見るため、仮のカードはすべてソラモに」）。
 * それまでの仮モンスターの組み合わせは git の履歴にある。正式な相手の編成は未定
 */
export const SORAMO_TEAM: readonly string[] = [SORAMO_MONSTER_ID, SORAMO_MONSTER_ID, SORAMO_MONSTER_ID];

export const SORAMO_SKILLS: readonly SkillCard[] = (officialSkills.skill_cards as readonly OfficialSkill[]).map((o) =>
  officialSkill(o, {
    label: 'ソラモ',
    monsterId: SORAMO_MONSTER_ID,
    skillId: soramoSkillId,
    artFile: (no) => `sor_sk_${twoDigits(no)}.webp`,
    specialEffects: SPECIAL_EFFECTS,
  }),
);

/** 正式データのまだ決まっていない裁定（JSON の rules_not_finalized をそのまま） */
export const SORAMO_RULES_NOT_FINALIZED: readonly string[] = officialSkills.rules_not_finalized;
