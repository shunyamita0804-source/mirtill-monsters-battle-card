import { APP_INFO } from '../../config/app.ts';
import { resolvePublicPath } from '../../core/assetPath.ts';
import { getLanguage, t } from '../../i18n/i18n.ts';
import { confirmModal } from '../components/modal.ts';
import { bgm } from '../bgm.ts';
import { button, h } from '../dom.ts';
import type { ScreenDefinition } from './types.ts';

export const titleScreen: ScreenDefinition = {
  id: 'title',
  titleKey: 'title.title',
  create(ctx) {
    const store = ctx.store;
    const element = h('main', { class: 'screen title' });
    bgm.play('title');
    const start = (): void => {
      if (store.hasSave) {
        confirmModal(
          element,
          t('title.confirmNew'),
          [h('p', { class: 'modal__text', text: t('title.confirmNewText') })],
          t('title.newGame'),
          () => ctx.navigate('newGame'),
        );
      } else {
        ctx.navigate('newGame');
      }
    };
    const continueBtn = button(t('title.continue'), () => ctx.reset('world'), 'btn btn--primary btn--large');
    continueBtn.disabled = !store.hasSave;
    const en = getLanguage() === 'en';

    element.append(
      h(
        'div',
        { class: 'title__logo' },
        // ユーザー承認の正式アイコン（同梱の原本を縮小しただけで描き換えていない）
        h('img', { class: 'title__icon', attrs: { src: resolvePublicPath('icons/icon-512.png'), alt: '', draggable: 'false' } }),
        h('p', { class: 'title__series', text: en ? APP_INFO.seriesNameEn : APP_INFO.seriesName }),
        h('h1', { class: 'title__name', text: t('title.battleCard') }),
        // 英語表示のときは、日本語の正式名称を下に添える
        h('p', { class: 'title__en', text: en ? APP_INFO.gameName : APP_INFO.gameNameEn }),
      ),
      store.loadResult.status === 'unreadable'
        ? h('p', {
            class: 'notice notice--warn',
            text: t('title.unreadable', { reason: t(`title.unreadable.${store.loadResult.reason}`) }),
          })
        : '',
      h(
        'div',
        { class: 'title__buttons' },
        continueBtn,
        button(t('title.newGame'), start, store.hasSave ? 'btn btn--large' : 'btn btn--primary btn--large'),
        button(t('title.settings'), () => ctx.navigate('options'), 'btn'),
      ),
      h('p', { class: 'title__footer', text: t('title.footer', { version: APP_INFO.version }) }),
    );
    return { element };
  },
};
