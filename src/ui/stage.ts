import { computeStageLayout } from '../core/stageLayout.ts';
import { h } from './dom.ts';

/**
 * 390×844 の論理座標で組んだ画面（ステージ）を、セーフエリアを除いた実画面に合わせて拡大縮小する。
 *
 * #app            画面全体（背景）
 *  └ .viewport    セーフエリアの内側（CSS の env(safe-area-inset-*) で決まる）
 *     └ .stage    論理解像度の画面。transform で拡大縮小・中央寄せ
 */
export interface Stage {
  readonly element: HTMLElement;
}

export function mountStage(root: HTMLElement): Stage {
  const stage = h('div', { class: 'stage' });
  const viewport = h('div', { class: 'viewport' }, stage);
  root.replaceChildren(viewport);

  const apply = (): void => {
    const rect = viewport.getBoundingClientRect();
    const layout = computeStageLayout(rect.width, rect.height);
    stage.style.width = `${layout.width}px`;
    stage.style.height = `${layout.height}px`;
    stage.style.transform = `translate(${layout.offsetX}px, ${layout.offsetY}px) scale(${layout.scale})`;
  };

  new ResizeObserver(apply).observe(viewport);
  window.addEventListener('orientationchange', apply);
  apply();

  return { element: stage };
}
