import type { Gender } from '../../game/save/saveData.ts';
import { t } from '../../i18n/i18n.ts';
import { button, h } from '../dom.ts';
import { once } from '../gameStore.ts';
import maleSheet from '@assets/images/characters/player_male_idle_front.png';
import femaleSheet from '@assets/images/characters/player_female_idle_front.png';
import type { ScreenDefinition } from './types.ts';

/** 主人公の選択（男性：黒髪・青系の帽子と服／女性：赤系の帽子と服）。歩行素材は QA 試作品 */
export const newGameScreen: ScreenDefinition = {
  id: 'newGame',
  titleKey: 'newGame.title',
  create(ctx) {
    const element = h('main', { class: 'screen new-game' });
    const start = once((gender: Gender) => {
      ctx.store.newGame(gender);
      ctx.store.flashMessage = t('newGame.welcome');
      ctx.reset('world');
    });
    const choice = (gender: Gender, label: string, note: string, sheet: string): HTMLElement => {
      const sprite = h('div', { class: 'new-game__sprite' });
      sprite.style.backgroundImage = `url("${sheet}")`;
      return h(
        'button',
        { class: 'new-game__choice', attrs: { type: 'button' }, dataset: { gender }, on: { click: () => start(gender) } },
        sprite,
        h('span', { class: 'new-game__label', text: label }),
        h('span', { class: 'new-game__note', text: note }),
      );
    };
    element.append(
      h('h1', { class: 'new-game__title', text: t('newGame.heading') }),
      h('div', { class: 'new-game__choices' },
        choice('male', t('newGame.male'), t('newGame.maleNote'), maleSheet),
        choice('female', t('newGame.female'), t('newGame.femaleNote'), femaleSheet),
      ),
      button(t('newGame.back'), () => ctx.back('title'), 'btn btn--ghost'),
    );
    return { element };
  },
};
