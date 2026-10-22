/**
 * カードのデータ型。
 *
 * 技カードの表示は「技カード UI テンプレート V4」（マナ＝青、ちから＝赤、かしこさ＝緑、数字1〜10）に合わせる。
 * 数値・効果の具体的な値は正式仕様が未確定のため、src/data/ の仮データで与える。
 */
import { getLanguage, t } from '../../i18n/i18n.ts';

/** カードの種類は3つ：モンスター／技／サポート（原作の全体カード・ブリーダーカードはサポートにまとめる） */
export type CardKind = 'monster' | 'skill' | 'support';
export type StatType = 'force' | 'wisdom';
export type Rarity = 'C' | 'U' | 'R';

/* 表示名はいまの言語で返す（辞書は src/i18n/messages/cards.ts） */
export const kindLabel = (kind: CardKind): string => t(`card.kind.${kind}`);
export const statLabel = (stat: StatType): string => t(`card.stat.${stat}`);
export const rarityLabel = (rarity: Rarity): string => t(`card.rarity.${rarity}`);

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

export const effectLabel = (type: SkillEffectType): string => t(`card.effect.${type}`);

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

const statOrAll = (stat: StatType | 'all'): string => (stat === 'all' ? t('card.stat.all') : statLabel(stat));
const signed = (n: number): string => (n > 0 ? `+${n}` : String(n));

/** サポートカードの効果説明 */
export function describeSupport(card: SupportCard): string {
  const e = card.effect;
  const limit = card.limitPerTurn ? t('card.support.limit', { n: card.limitPerTurn }) : '';
  switch (e.type) {
    case 'heal':
    case 'draw':
    case 'mana':
      return t(`card.support.${e.type}`, { v: e.value, limit });
    case 'field':
      return t('card.support.field', { stat: statOrAll(e.stat), sign: signed(e.modifier) });
  }
}

/** サポートカードの短い説明（カード面・場の表示） */
export function supportShortText(card: SupportCard): string {
  const e = card.effect;
  switch (e.type) {
    case 'heal':
    case 'draw':
    case 'mana':
      return t(`card.short.${e.type}`, { v: e.value });
    case 'field':
      return t('card.short.field', { stat: statOrAll(e.stat), sign: signed(e.modifier) });
  }
}

/** 技・サポートどちらでも説明文 */
export function describePlayCard(card: PlayCard): string {
  return card.kind === 'skill' ? describeSkill(card) : describeSupport(card);
}

/** 技カードの効果説明（ゲーム側で表示する文字） */
export function describeSkill(card: SkillCard): string {
  const stat = statLabel(card.stat.type);
  const v = card.stat.value;
  if (card.effect.type === 'attack') return t('card.skill.attack', { stat, v, note: attackNote(card.effect) }).trim();
  return t(`card.skill.${card.effect.type}`, { stat, v });
}

/** 技カードの短い説明（カード面に書く文字） */
export function skillShortText(skill: SkillCard): string {
  const v = skill.stat.value;
  const e = skill.effect;
  if (e.type === 'attack') return t(e.unblockable && e.undodgeable ? 'card.short.attackSure' : 'card.short.attack', { v });
  return t(`card.short.${e.type}`, { v });
}

/** 攻撃の印の説明 */
function attackNote(effect: Extract<SkillEffect, { type: 'attack' }>): string {
  if (effect.unblockable && effect.undodgeable) return t('card.attackNote.both');
  const notes = [
    effect.unblockable ? t('card.attackNote.unblockable') : '',
    effect.undodgeable ? t('card.attackNote.undodgeable') : '',
    effect.halfOnEvade ? t('card.attackNote.halfOnEvade') : '',
  ];
  return notes.filter((n) => n !== '').join(getLanguage() === 'en' ? ' ' : '');
}
