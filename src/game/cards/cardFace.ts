import { cardName } from '../../i18n/content.ts';
import { t } from '../../i18n/i18n.ts';
import { categoryLabel, skillCategory, skillShortText, type SkillCard, type SkillCategory } from './cardTypes.ts';

/**
 * 技カードの面に出すもの（DOM 非依存。表示は src/ui/components/skillCard.ts、テストは tests/soramo.test.ts）。
 * - category：右側のバーの種類（1種類だけ）
 * - mana：左側のマナの数字（0 も出す）
 * - value：右側の数字。数値のない技（特殊・防御・回避）は null で、数値枠ごと出さない
 * - 文字（技名・バーの文字・説明）はいまの言語で、ゲーム側で書く
 */
export interface SkillCardFace {
  readonly category: SkillCategory;
  readonly mana: number;
  readonly value: number | null;
  readonly title: string;
  readonly manaLabel: string;
  readonly categoryLabel: string;
  readonly description: string;
}

export function skillCardFace(skill: SkillCard): SkillCardFace {
  const category = skillCategory(skill);
  return {
    category,
    mana: skill.cost,
    value: skill.stat ? skill.stat.value : null,
    title: cardName(skill),
    manaLabel: t('card.manaLabel'),
    categoryLabel: categoryLabel(category),
    description: skillShortText(skill),
  };
}
