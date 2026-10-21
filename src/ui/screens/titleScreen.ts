import { APP_INFO } from '../../config/app.ts';
import { button, h } from '../dom.ts';
import type { ScreenDefinition } from './types.ts';

export const titleScreen: ScreenDefinition = {
  id: 'title',
  title: 'タイトル',
  create(ctx) {
    const element = h(
      'main',
      { class: 'screen title-screen' },
      h(
        'div',
        { class: 'title-screen__logo' },
        h('p', { class: 'title-screen__series', text: APP_INFO.seriesName }),
        h('h1', { class: 'title-screen__name', text: 'バトルカード' }),
      ),
      // 仮のタイトルビジュアル（正式素材の差し替え予定地）
      h(
        'div',
        { class: 'title-screen__visual', attrs: { 'aria-hidden': 'true' } },
        h('div', { class: 'title-screen__visual-card title-screen__visual-card--left' }),
        h('div', { class: 'title-screen__visual-card title-screen__visual-card--right' }),
        h('div', { class: 'title-screen__visual-card title-screen__visual-card--center' }),
        h('p', { class: 'title-screen__visual-note', text: '仮ビジュアル' }),
      ),
      button('はじめる', () => ctx.reset('town'), 'btn btn--primary btn--large title-screen__start'),
      h(
        'p',
        { class: 'title-screen__footer' },
        `v${APP_INFO.version}・開発版（第${APP_INFO.phase}段階）`,
      ),
    );
    return { element };
  },
};
