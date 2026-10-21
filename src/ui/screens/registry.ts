import type { ScreenId } from '../../config/screens.ts';
import { battleScreen } from './battleScreen.ts';
import { shopScreen } from './shopScreen.ts';
import { titleScreen } from './titleScreen.ts';
import { townScreen } from './townScreen.ts';
import type { ScreenDefinition } from './types.ts';

/**
 * 画面IDと画面定義の対応表。
 * ScreenId に画面を足すと、ここに登録しない限り型チェックでエラーになる。
 */
export const SCREENS: Readonly<Record<ScreenId, ScreenDefinition>> = {
  title: titleScreen,
  town: townScreen,
  shop: shopScreen,
  battle: battleScreen,
};
