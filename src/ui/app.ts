import { APP_INFO } from '../config/app.ts';
import { INITIAL_SCREEN, type ScreenId } from '../config/screens.ts';
import { Router } from '../core/router.ts';
import { GameStore } from './gameStore.ts';
import { SCREENS } from './screens/registry.ts';
import type { ScreenContext, ScreenInstance } from './screens/types.ts';
import { mountStage } from './stage.ts';

/** アプリ全体の組み立て：ステージを用意し、ルーターの変化に合わせて画面を差し替える */
export function startApp(root: HTMLElement, store: GameStore = GameStore.fromBrowser()): void {
  const stage = mountStage(root);
  const router = new Router<ScreenId>(INITIAL_SCREEN);
  let current: ScreenInstance | null = null;

  const context: ScreenContext = {
    navigate: (to) => router.navigate(to),
    back: (fallback) => {
      if (!router.back()) router.reset(fallback);
    },
    reset: (to) => {
      // 同じ画面への reset でも作り直す（歩行画面で別マップに移ったときなど）
      if (router.current === to) show(to);
      else router.reset(to);
    },
    store,
  };

  const show = (id: ScreenId): void => {
    current?.destroy?.();
    // セーブがない状態で遊ぶ画面に来たらタイトルへ
    const target: ScreenId = !store.hasSave && id !== 'title' && id !== 'newGame' ? 'title' : id;
    const screen = SCREENS[target];
    current = screen.create(context);
    stage.element.dataset.screen = target;
    stage.element.replaceChildren(current.element);
    document.title = `${screen.title}｜${APP_INFO.gameName}`;
  };

  router.subscribe(({ to }) => show(to));
  show(router.current);

  // バックグラウンドに回ったら念のため保存（iPhone でアプリを切り替えたとき）
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && store.hasSave) store.persist();
  });
}
