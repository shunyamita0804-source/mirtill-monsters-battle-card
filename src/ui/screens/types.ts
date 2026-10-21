import type { ScreenId } from '../../config/screens.ts';
import type { GameStore } from '../gameStore.ts';

/** 画面から使える遷移操作とゲーム状態 */
export interface ScreenContext {
  /** 履歴に積んで移動 */
  navigate(to: ScreenId): void;
  /** 一つ前の画面に戻る（履歴がなければ fallback へ） */
  back(fallback: ScreenId): void;
  /** 履歴を消して移動 */
  reset(to: ScreenId): void;
  readonly store: GameStore;
}

export interface ScreenInstance {
  readonly element: HTMLElement;
  /** 画面を離れるときの後始末（タイマー・イベント解除など） */
  destroy?(): void;
}

export interface ScreenDefinition {
  readonly id: ScreenId;
  /** ブラウザのタブ等に出す画面名 */
  readonly title: string;
  create(context: ScreenContext): ScreenInstance;
}
