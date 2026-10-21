/**
 * カードのデータ型。
 *
 * 技カードの表示は「技カード UI テンプレート V4」（マナ＝青、ちから＝赤、かしこさ＝緑、数字1〜10）に合わせる。
 * 数値・効果の具体的な値は正式仕様が未確定のため、src/data/ の仮データで与える。
 */
export type CardKind = 'monster' | 'skill';
export type StatType = 'force' | 'wisdom';
export type Rarity = 'C' | 'U' | 'R';

export const CARD_KIND_LABEL: Readonly<Record<CardKind, string>> = {
  monster: 'モンスター',
  skill: '技',
};

export const STAT_LABEL: Readonly<Record<StatType, string>> = {
  force: 'ちから',
  wisdom: 'かしこさ',
};

export const RARITY_LABEL: Readonly<Record<Rarity, string>> = {
  C: 'コモン',
  U: 'アンコモン',
  R: 'レア',
};

/**
 * カード画像の参照先。assets/ のカテゴリとファイル名で指定する。
 * - layout 'frame': 画像をカード枠の絵の部分に表示し、名前などは枠に描画する
 * - layout 'full' : 画像をカード全面に表示する
 */
export interface CardArt {
  readonly category: 'monsterCards' | 'skillCards';
  readonly file: string;
  readonly layout: 'frame' | 'full';
}

interface CardBase {
  readonly id: string;
  readonly name: string;
  readonly rarity: Rarity;
  /** 仮カード（正式データではない）なら true */
  readonly isPlaceholder: boolean;
  /** 正式画像。未指定なら仮の絵で表示する */
  readonly art?: CardArt;
}

export interface MonsterCard extends CardBase {
  readonly kind: 'monster';
  /** バトル開始時のライフ（仮） */
  readonly life: number;
  /** 技カード外枠の着色色（テーマ色） */
  readonly themeColor: string;
  readonly description: string;
  /** 欠片限定の隠しモンスター。通常のパック・ガチャでは排出しない */
  readonly hidden?: boolean;
  /** 正式名称・画像が未確定 */
  readonly undetermined?: boolean;
}

/** 技の効果（仮ルール。種類と対象の決まりは src/game/battle/rules.ts） */
export type SkillEffect =
  | { readonly type: 'attack'; readonly pierce?: boolean }
  | { readonly type: 'defense' }
  | { readonly type: 'heal' }
  | { readonly type: 'mana' }
  | { readonly type: 'draw' };

export type SkillEffectType = SkillEffect['type'];

export const EFFECT_LABEL: Readonly<Record<SkillEffectType, string>> = {
  attack: '攻撃',
  defense: '防御',
  heal: '回復',
  mana: 'マナ',
  draw: 'ドロー',
};

export interface SkillCard extends CardBase {
  readonly kind: 'skill';
  /** 使えるモンスター（適合技） */
  readonly monsterId: string;
  /** 使用に必要なマナ（1〜10） */
  readonly cost: number;
  /** 右側の能力（ちから or かしこさ の一方のみ）と数値（1〜10） */
  readonly stat: { readonly type: StatType; readonly value: number };
  readonly effect: SkillEffect;
}

export type CardDefinition = MonsterCard | SkillCard;

export function isMonster(card: CardDefinition): card is MonsterCard {
  return card.kind === 'monster';
}

export function isSkill(card: CardDefinition): card is SkillCard {
  return card.kind === 'skill';
}

/** 技カードの効果説明（ゲーム側で表示する文字） */
export function describeSkill(card: SkillCard): string {
  const stat = STAT_LABEL[card.stat.type];
  const v = card.stat.value;
  switch (card.effect.type) {
    case 'attack':
      return `相手モンスター1体に${stat}で${v}ダメージ。${card.effect.pierce ? '防御されない。' : ''}`;
    case 'defense':
      return `相手の${stat}攻撃を受けたときに使う。ダメージを${v}減らす。`;
    case 'heal':
      return `味方モンスター1体のライフを${v}回復する。`;
    case 'mana':
      return `マナを${v}得る。`;
    case 'draw':
      return `山札からカードを${v}枚引く。`;
  }
}
