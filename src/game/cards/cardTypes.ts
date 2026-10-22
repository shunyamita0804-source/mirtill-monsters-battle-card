/**
 * カードのデータ型。
 *
 * 技カードの表示は「技カード UI テンプレート V4」（マナ＝青、ちから＝赤、かしこさ＝緑、数字1〜10）に合わせる。
 * 数値・効果の具体的な値は正式仕様が未確定のため、src/data/ の仮データで与える。
 */
/** カードの種類は3つ：モンスター／技／サポート（原作の全体カード・ブリーダーカードはサポートにまとめる） */
export type CardKind = 'monster' | 'skill' | 'support';
export type StatType = 'force' | 'wisdom';
export type Rarity = 'C' | 'U' | 'R';

export const CARD_KIND_LABEL: Readonly<Record<CardKind, string>> = {
  monster: 'モンスター',
  skill: '技',
  support: 'サポート',
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

/**
 * 技の効果（数値は仮。決まりは docs/battle-rules.md）。
 * 攻撃の印：unblockable＝防御できない、undodgeable＝回避できない、halfOnEvade＝回避されても半分のダメージ。
 */
export type SkillEffect =
  | {
      readonly type: 'attack';
      readonly unblockable?: boolean;
      readonly undodgeable?: boolean;
      readonly halfOnEvade?: boolean;
    }
  | { readonly type: 'defense' }
  | { readonly type: 'evade' }
  | { readonly type: 'heal' }
  | { readonly type: 'mana' }
  | { readonly type: 'draw' };

export type SkillEffectType = SkillEffect['type'];

export const EFFECT_LABEL: Readonly<Record<SkillEffectType, string>> = {
  attack: '攻撃',
  defense: '防御',
  evade: '回避',
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

/**
 * サポートの効果（仮カード用。正式カードが決まったら足す）。
 * field は「場に残る」効果：その能力の攻撃のダメージを双方とも modifier だけ増減する（stat 'all' は全攻撃）。
 */
export type SupportEffect =
  | { readonly type: 'heal'; readonly value: number }
  | { readonly type: 'draw'; readonly value: number }
  | { readonly type: 'mana'; readonly value: number }
  | { readonly type: 'field'; readonly stat: StatType | 'all'; readonly modifier: number };

export interface SupportCard extends CardBase {
  readonly kind: 'support';
  /** 使用に必要なマナ */
  readonly cost: number;
  /**
   * 効果の区分（内部属性。表示上はどれも「サポート」）
   * - instant：使ったらすぐ効果が出て捨て札へ（旧ブリーダーカード）
   * - field：場に1枚だけ残り、双方に効果が続く（旧全体カード）。新しく出たら古い方は持ち主の捨て札へ
   */
  readonly duration: 'instant' | 'field';
  /** 回数制限のまとまり。同じまとまりは1ターンに limitPerTurn 回まで（旧ブリーダーは 'breeder' で1回） */
  readonly limitGroup?: string;
  readonly limitPerTurn?: number;
  readonly effect: SupportEffect;
}

/** バトルで手札・山札に入るカード（技とサポート） */
export type PlayCard = SkillCard | SupportCard;

export type CardDefinition = MonsterCard | SkillCard | SupportCard;

export function isMonster(card: CardDefinition): card is MonsterCard {
  return card.kind === 'monster';
}

export function isSkill(card: CardDefinition): card is SkillCard {
  return card.kind === 'skill';
}

export function isSupport(card: CardDefinition): card is SupportCard {
  return card.kind === 'support';
}

const statOrAll = (stat: StatType | 'all'): string => (stat === 'all' ? 'すべての' : `${STAT_LABEL[stat]}`);

/** サポートカードの効果説明 */
export function describeSupport(card: SupportCard): string {
  const e = card.effect;
  const limit = card.limitPerTurn ? `（このようなサポートは、あわせて1ターンに${card.limitPerTurn}回まで）` : '';
  switch (e.type) {
    case 'heal':
      return `味方モンスター1体のライフを${e.value}回復する。${limit}`;
    case 'draw':
      return `山札からカードを${e.value}枚引く。${limit}`;
    case 'mana':
      return `山札の上から${e.value}枚をマナにする。${limit}`;
    case 'field': {
      const sign = e.modifier > 0 ? `+${e.modifier}` : String(e.modifier);
      return `場に残る。${statOrAll(e.stat)}攻撃のダメージを${sign}する（双方）。場のカードは1枚だけで、新しく出すと入れ替わる。`;
    }
  }
}

/** サポートカードの短い説明（カード面・場の表示） */
export function supportShortText(card: SupportCard): string {
  const e = card.effect;
  switch (e.type) {
    case 'heal':
      return `味方1体のライフ+${e.value}`;
    case 'draw':
      return `カードを${e.value}枚引く`;
    case 'mana':
      return `山札${e.value}枚をマナに`;
    case 'field':
      return `場：${statOrAll(e.stat)}攻撃${e.modifier > 0 ? '+' : ''}${e.modifier}`;
  }
}

/** 技・サポートどちらでも説明文 */
export function describePlayCard(card: PlayCard): string {
  return card.kind === 'skill' ? describeSkill(card) : describeSupport(card);
}

/** 技カードの効果説明（ゲーム側で表示する文字） */
export function describeSkill(card: SkillCard): string {
  const stat = STAT_LABEL[card.stat.type];
  const v = card.stat.value;
  switch (card.effect.type) {
    case 'attack':
      return `相手モンスター1体に${stat}で${v}ダメージ。${attackNote(card.effect)}`;
    case 'defense':
      return `このモンスターが${stat}攻撃を受けたときに使う。ダメージを${v}減らす。`;
    case 'evade':
      return `このモンスターが${stat}攻撃を受けたときに使う。回避してダメージを0にする。`;
    case 'heal':
      return `味方モンスター1体のライフを${v}回復する。`;
    case 'mana':
      return `山札の上から${v}枚をマナにする。`;
    case 'draw':
      return `山札からカードを${v}枚引く。`;
  }
}

/** 攻撃の印の説明 */
function attackNote(effect: Extract<SkillEffect, { type: 'attack' }>): string {
  if (effect.unblockable && effect.undodgeable) return '防御・回避されない。';
  const notes = [effect.unblockable ? '防御されない。' : '', effect.undodgeable ? '回避されない。' : '', effect.halfOnEvade ? '回避されても半分のダメージ。' : ''];
  return notes.join('');
}
