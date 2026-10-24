import type { MonsterCard, SkillCard, SkillEffect } from '../game/cards/cardTypes.ts';
import officialSkills from './official/lazuck_cards_OFFICIAL.json';
import latestSkills from './official/lazuck_cards_LATEST_20261024.json';
import themeColors from './official/monster_theme_colors.json';
import { evadeFromCriteria, officialSkill, twoDigits, type OfficialSkill, type OfficialSkillSource } from './officialSkills.ts';

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
 *
 * 2026-10-24 改訂（Seimon_Claude_Gaul16_RazukSoramoPatch_20261024_CONTROL。正本 lazuck_cards_LATEST_20261024.json を無改変で置いた）：
 * - 並び順：01〜06 ちから／07〜08 かしこさ／09〜11 特殊／12〜13 防御／14〜16 回避。表示の番号（displayNo）だけ変え、
 *   ゲーム内 ID・絵のファイル名・デザイン ID は元のまま（例：トリックショットは skl-lazuck-09・laz_sk_09.webp のまま表示は 7）
 * - 新しい技「いたずら」（表示 11・特殊・マナ2）：ゲーム内 ID は skl-lazuck-itazura（番号の ID と取り違えないよう名前の ID）。
 *   絵はユーザーの完成画像（JPEG。原本 design-parts/cards-original/lazuck/）から作った laz_sk_itazura.webp
 * - 旧13「クロスガード」（skl-lazuck-13）：ゲームから削除（2026-10-24 ユーザー決定）。持っていたセーブは version 8 で所持・デッキから外す
 *   （src/game/save/saveData.ts の migrateRemoveCrossGuardV8）。元の JSON・絵（laz_sk_13.webp）は記録として残す
 * - 回避14〜16：マナと条件を承認値に（フェイントステップ＝マナ2・ちから、シャドウスリップ＝マナ2・必要マナ2以上のちから/かしこさ、ミラージュダッシュ＝条件なし）
 * - 初期・収集の区分は LATEST のまま（初期10・収集6。いたずらはクロスガードの収集枠を引き継ぐ）
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
};

/** 新しい技「いたずら」のゲーム内 ID（2026-10-24。番号の ID ではない） */
export const LAZUCK_ITAZURA_ID = 'skl-lazuck-itazura';
/** ゲームから削除した旧13「クロスガード」の ID（セーブの変換・バックアップの読み込みで使う） */
export const LAZUCK_CROSS_GUARD_ID = lazuckSkillId(13);

const SOURCE: OfficialSkillSource = {
  label: 'ラズック',
  monsterId: LAZUCK_MONSTER_ID,
  skillId: lazuckSkillId,
  artFile: (no) => `laz_sk_${twoDigits(no)}.webp`,
  specialEffects: SPECIAL_EFFECTS,
};

interface LatestSkill {
  readonly ordinal: number;
  readonly name_ja: string;
  readonly category: string;
  readonly mana: number;
  readonly damage: number | null;
  readonly effect_text_ja: string | null;
  readonly availability: string;
  readonly game_id: string;
  readonly evasion_criteria?: { readonly against: readonly string[]; readonly min_incoming_attack_required_mana: number | null };
}

const ORIGINAL = officialSkills.skill_cards as readonly (OfficialSkill & { readonly game_id: string })[];

function latestSkill(l: LatestSkill): SkillCard {
  const itazura = !l.game_id.startsWith('skl-lazuck-');
  const original = ORIGINAL.find((o) => o.game_id === l.game_id);
  if (!itazura && !original) throw new Error(`ラズックの技の ID が元のデータにありません: ${l.game_id}`);
  const o: OfficialSkill = {
    design_id: original?.design_id ?? LAZUCK_ITAZURA_ID,
    number: original?.number ?? l.ordinal,
    name_ja: l.name_ja,
    mana: l.mana,
    damage: l.damage,
    category: l.category,
    effect_text_ja: l.effect_text_ja,
    availability: l.availability,
  };
  const c = l.evasion_criteria;
  return officialSkill(o, SOURCE, {
    displayNo: l.ordinal,
    ...(itazura ? { id: LAZUCK_ITAZURA_ID, artFile: 'laz_sk_itazura.webp', designId: null, effect: { type: 'handToDeck' } } : {}),
    ...(c ? { effect: evadeFromCriteria(c.against, c.min_incoming_attack_required_mana) } : {}),
  });
}

/** ラズックの技16種（新しい表示の番号の順。2026-10-24 改訂） */
export const LAZUCK_SKILLS: readonly SkillCard[] = (latestSkills.skill_cards as readonly LatestSkill[]).map(latestSkill);
