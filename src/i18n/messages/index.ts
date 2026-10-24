import { BATTLE } from './battle.ts';
import { CARDS } from './cards.ts';
import { COMMON } from './common.ts';
import { SCREENS } from './screens.ts';
import { STORY } from './story.ts';
import { WALK_LAB } from './walkLab.ts';
import { WORLD } from './world.ts';

/**
 * 画面の文字の辞書（固定キー → ja/en）。分野ごとのファイルに分け、ここでまとめる。
 * キーは「分野.用途」。同じキーが2つの分野にあるとテスト（tests/i18n.test.ts）で失敗する。
 */
export const MESSAGE_GROUPS = {
  common: COMMON,
  cards: CARDS,
  screens: SCREENS,
  world: WORLD,
  battle: BATTLE,
  story: STORY,
  walkLab: WALK_LAB,
} as const;

export const MESSAGES = {
  ...COMMON,
  ...CARDS,
  ...SCREENS,
  ...WORLD,
  ...BATTLE,
  ...STORY,
  ...WALK_LAB,
};

export type MessageKey = keyof typeof MESSAGES;
