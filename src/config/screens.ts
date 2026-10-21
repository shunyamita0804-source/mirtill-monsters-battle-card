/**
 * 画面ID一覧。
 *
 * 画面を追加するときは、ここにIDを足し、src/ui/screens/registry.ts に画面定義を登録する。
 * （ダンジョン・ガチャ・大会は第2段階では実装しない）
 */
export const SCREEN_IDS = ['title', 'town', 'shop', 'battle'] as const;

export type ScreenId = (typeof SCREEN_IDS)[number];

/** 起動時の画面 */
export const INITIAL_SCREEN: ScreenId = 'title';

export function isScreenId(value: string): value is ScreenId {
  return (SCREEN_IDS as readonly string[]).includes(value);
}
