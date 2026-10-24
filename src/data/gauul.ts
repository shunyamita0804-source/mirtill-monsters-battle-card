import type { MonsterCard, SkillCard, SkillEffect } from '../game/cards/cardTypes.ts';
import officialSkills from './official/gauul_cards_OFFICIAL_20261024.json';
import themeColors from './official/monster_theme_colors.json';
import { evadeFromCriteria, officialSkill, twoDigits, type OfficialSkill } from './officialSkills.ts';
import { evasionUpdatesOf } from './soramo.ts';

/**
 * 【正式データ】ガウルの技カード16種（2026-10-24 ユーザー承認。Seimon_Claude_Gaul16_RazukSoramoPatch_20261024_CONTROL）。
 *
 * 正本は src/data/official/gauul_cards_OFFICIAL_20261024.json（届いた 02_GAUL_FINAL.json を無改変で置いた）。
 * 技名・マナ・ダメージ・種別・効果テキスト・初期/収集の区分は、ここで書き換えずに JSON からそのまま読む。
 * 回避（14〜16）の条件は evasion_LATEST_20261024.json から。
 *
 * ゲーム内 ID とデザイン ID の対応（docs/card-data-policy.md にも記録）：
 *   mon-gauul＝ガウル（キー gauul はそれまで登録のみにしていたモンスターカード・枠色のもの）、skl-gauul-01〜16＝GAU-SK-01〜16（番号は同じ）
 * 絵：技 gau_sk_01〜16.webp（原本 PNG は design-parts/cards-original/gauul/ に無改変。縦横比を変えずに幅 827 へ縮めただけ。
 *   原本は 1178×1335 がほとんどで 07・11・13 は 1182×1330、10 は 1179×1334 のため、高さは 931〜937）
 *
 * まだ決まっていないこと（独断で決めない）：
 * - レアリティ・正式英語・配る枚数・パック・敵の編成（スターター・相手の編成にもまだ入れていない）
 * - 09 熱風の威嚇の「次回」の細かい裁定（下の SPECIAL_EFFECTS）
 */
export const GAUUL_MONSTER_ID = 'mon-gauul';
export const gauulSkillId = (no: number): string => `skl-gauul-${twoDigits(no)}`;

/** ガウルのモンスターカード（それまで src/data/registeredMonsters.ts に登録のみにしていた正式カード）。ライフ 6・内部ランク C（画面に出さない） */
export const GAUUL_MONSTER: MonsterCard = {
  kind: 'monster',
  id: GAUUL_MONSTER_ID,
  name: officialSkills.name_ja,
  rarity: null,
  life: officialSkills.monster_life,
  themeColor: themeColors.monsters.gauul.hex,
  description: 'ガウル（モンスターランクC）。',
  isPlaceholder: false,
  art: { category: 'monsterCards', file: 'gauul_official.webp', layout: 'full' },
  battleArt: { category: 'monsterCards', file: 'gauul_battle.webp', layout: 'full' },
  pendingSpec: ['rarity'],
};

/**
 * 効果テキストのある技の、ゲームでの動き（効果テキストの文は書き換えず、動きだけをここで表す）。
 * 【要仕様確定】
 * - GAU-SK-09 熱風の威嚇「次回のかしこさ技ダメージ−1」：ソラモの吠えると同じく、その相手が次にかしこさの技を使うときに1減らして消える
 *   （「次のターン」とは読み替えない）。重ねがけはしない（2回目も −1 のまま）。どこまで続くかは未定
 */
const SPECIAL_EFFECTS: Readonly<Record<string, SkillEffect>> = {
  'GAU-SK-03': { type: 'attack', undodgeable: true },
  'GAU-SK-08': { type: 'attack', undodgeable: true },
  'GAU-SK-09': { type: 'weaken', stat: 'wisdom', amount: 1 },
  'GAU-SK-11': { type: 'defense', reduce: 3, against: 'force' },
  'GAU-SK-12': { type: 'defense', reduce: 3, against: 'wisdom' },
  'GAU-SK-13': { type: 'defense', reduce: 3, against: 'all' },
};

export const GAUUL_SKILLS: readonly SkillCard[] = (officialSkills.skill_cards as readonly OfficialSkill[]).map((o) => {
  const u = evasionUpdatesOf('gauul').find((x) => x.skill_number === o.number);
  if (u && (u.name_ja !== o.name_ja || u.mana !== o.mana || u.effect_text_ja !== o.effect_text_ja)) {
    throw new Error(`ガウルの回避の条件が技のデータと合いません: ${o.design_id}`);
  }
  return officialSkill(
    o,
    {
      label: 'ガウル',
      monsterId: GAUUL_MONSTER_ID,
      skillId: gauulSkillId,
      artFile: (no) => `gau_sk_${twoDigits(no)}.webp`,
      specialEffects: SPECIAL_EFFECTS,
    },
    u ? { effect: evadeFromCriteria(u.against, u.min_incoming_attack_required_mana) } : {},
  );
});
