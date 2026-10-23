import type { SkillCard, SkillCategory, SkillEffect } from '../game/cards/cardTypes.ts';

/**
 * 正式の技カードの JSON（src/data/official/*_cards_OFFICIAL.json）の1件を、ゲームの技カードにする（2026-10-23。ソラモ・ラズック共通）。
 * 技名・マナ・ダメージ・種別・効果テキスト・初期/収集の区分は、書き換えずに JSON からそのまま読む。
 * 効果テキストのある技の「ゲームでの動き」だけを specialEffects で渡す（文は書き換えない）
 */
export interface OfficialSkill {
  readonly design_id: string;
  readonly number: number;
  readonly name_ja: string;
  readonly mana: number;
  readonly damage: number | null;
  readonly category: string;
  readonly effect_text_ja: string | null;
  readonly availability: string;
}

export interface OfficialSkillSource {
  /** モンスター名（エラーの文に使う） */
  readonly label: string;
  readonly monsterId: string;
  readonly skillId: (no: number) => string;
  /** 技の絵のファイル名（assets/images/cards/skills/） */
  readonly artFile: (no: number) => string;
  readonly specialEffects: Readonly<Record<string, SkillEffect>>;
}

const CATEGORIES: readonly SkillCategory[] = ['force', 'wisdom', 'special', 'defense', 'evade'];

export const twoDigits = (no: number): string => String(no).padStart(2, '0');

export function officialSkill(o: OfficialSkill, src: OfficialSkillSource): SkillCard {
  const category = CATEGORIES.find((c) => c === o.category);
  if (!category) throw new Error(`${src.label}の技の種別が不明です: ${o.design_id} ${o.category}`);
  const attack = category === 'force' || category === 'wisdom';
  if (attack !== (o.damage !== null)) throw new Error(`${src.label}の技のダメージと種別が合いません: ${o.design_id}`);
  const effect = src.specialEffects[o.design_id] ?? (attack ? { type: 'attack' } : undefined);
  if (!effect) throw new Error(`${src.label}の技の動きが未定義です: ${o.design_id}`);
  return {
    kind: 'skill',
    id: src.skillId(o.number),
    designId: o.design_id,
    name: o.name_ja,
    monsterId: src.monsterId,
    rarity: null,
    cost: o.mana,
    stat: attack && o.damage !== null ? { type: category as 'force' | 'wisdom', value: o.damage } : null,
    category,
    effectTextJa: o.effect_text_ja,
    availability: o.availability === 'initial' ? 'initial' : 'collect',
    effect,
    isPlaceholder: false,
    art: { category: 'skillCards', file: src.artFile(o.number), layout: 'frame' },
    pendingSpec: ['rarity'],
  };
}
