import { APP_INFO } from '../config/app.ts';
import { INITIAL_SCREEN, type ScreenId } from '../config/screens.ts';
import { Router } from '../core/router.ts';
import { SCREENS } from './screens/registry.ts';
import type { ScreenContext, ScreenInstance } from './screens/types.ts';
import { mountStage } from './stage.ts';

/** アプリ全体の組み立て：ステージを用意し、ルーターの変化に合わせて画面を差し替える */
export function startApp(root: HTMLElement): void {
  const stage = mountStage(root);
  const router = new Router<ScreenId>(INITIAL_SCREEN);
  let current: ScreenInstance | null = null;

  const context: ScreenContext = {
    navigate: (to) => router.navigate(to),
    back: (fallback) => {
      if (!router.back()) router.reset(fallback);
    },
    reset: (to) => router.reset(to),
  };

  const show = (id: ScreenId): void => {
    current?.destroy?.();
    const screen = SCREENS[id];
    current = screen.create(context);
    stage.element.dataset.screen = id;
    stage.element.replaceChildren(current.element);
    document.title = `${screen.title}｜${APP_INFO.gameName}`;
  };

  router.subscribe(({ to }) => show(to));
  show(router.current);
}
