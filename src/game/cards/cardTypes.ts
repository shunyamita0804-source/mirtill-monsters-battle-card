/**
 * カードの表示に必要な最小限のデータ型。
 *
 * 第2段階では画面表示に使う項目だけを定義する。HP・攻撃力・コストなどの
 * 戦闘用パラメータは仕様が決まっていないため持たせない。
 */
export type CardKind = 'monster' | 'skill';

export const CARD_KIND_LABEL: Readonly<Record<CardKind, string>> = {
  monster: 'モンスター',
  skill: '技',
};

/**
 * カード画像の参照先。assets/ のカテゴリとファイル名で指定する。
 *
 * - layout 'frame': 画像をカード枠の絵の部分に表示し、名前などは枠に描画する
 * - layout 'full' : 画像をカード全面に表示する（文字まで描き込まれた完成済みの技カード画像などを想定）
 */
export interface CardArt {
  readonly category: 'monsterCards' | 'skillCards';
  readonly file: string;
  readonly layout: 'frame' | 'full';
}

export interface CardDefinition {
  readonly id: string;
  readonly kind: CardKind;
  readonly name: string;
  readonly description: string;
  /** 仮カード（正式データではない）なら true */
  readonly isPlaceholder: boolean;
  /** 画像がないときは仮の絵で表示する */
  readonly art?: CardArt;
}
