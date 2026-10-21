import { APP_INFO } from '../../config/app.ts';
import { resolvePublicPath } from '../../core/assetPath.ts';
import { confirmModal } from '../components/modal.ts';
import { button, h } from '../dom.ts';
import type { ScreenDefinition } from './types.ts';

export const titleScreen: ScreenDefinition = {
  id: 'title',
  title: 'タイトル',
  create(ctx) {
    const store = ctx.store;
    const element = h('main', { class: 'screen title' });
    const start = (): void => {
      if (store.hasSave) {
        confirmModal(
          element,
          'はじめから遊びますか？',
          [h('p', { class: 'modal__text', text: '今のセーブデータは消えます。よろしいですか？' })],
          'はじめから',
          () => ctx.navigate('newGame'),
        );
      } else {
        ctx.navigate('newGame');
      }
    };
    const continueBtn = button('つづきから', () => ctx.reset('world'), 'btn btn--primary btn--large');
    continueBtn.disabled = !store.hasSave;

    element.append(
      h(
        'div',
        { class: 'title__logo' },
        // ユーザー指定のアプリアイコン（同梱の原本を縮小しただけで描き換えていない）
        h('img', { class: 'title__icon', attrs: { src: resolvePublicPath('icons/icon-512.png'), alt: '', draggable: 'false' } }),
        h('p', { class: 'title__series', text: APP_INFO.seriesName }),
        h('h1', { class: 'title__name', text: 'バトルカード' }),
        h('p', { class: 'title__en', text: APP_INFO.gameNameEn }),
      ),
      store.loadResult.status === 'unreadable'
        ? h('p', { class: 'notice notice--warn', text: `セーブデータを読み込めませんでした（${store.loadResult.reason}）。元のデータは退避してあります。` })
        : '',
      h(
        'div',
        { class: 'title__buttons' },
        continueBtn,
        button('はじめから', start, store.hasSave ? 'btn btn--large' : 'btn btn--primary btn--large'),
      ),
      h('p', { class: 'title__footer', text: `v${APP_INFO.version}・開発版（仮実装を含みます）` }),
    );
    return { element };
  },
};
