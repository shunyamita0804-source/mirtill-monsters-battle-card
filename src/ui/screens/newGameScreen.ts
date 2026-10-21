import type { Gender } from '../../game/save/saveData.ts';
import { button, h } from '../dom.ts';
import { once } from '../gameStore.ts';
import maleSheet from '@assets/images/characters/player_male_walk_qa.png';
import femaleSheet from '@assets/images/characters/player_female_walk_qa.png';
import type { ScreenDefinition } from './types.ts';

/** 主人公の選択（男性：黒髪・青系の帽子と服／女性：赤系の帽子と服）。歩行素材は QA 試作品 */
export const newGameScreen: ScreenDefinition = {
  id: 'newGame',
  title: '主人公の選択',
  create(ctx) {
    const element = h('main', { class: 'screen new-game' });
    const start = once((gender: Gender) => {
      ctx.store.newGame(gender);
      ctx.store.flashMessage =
        'ようこそ！\n家の机でデッキ、壁の地図でダンジョン、本棚で図鑑、ベッドで設定を確認できます。\nショップでカードパック、大会会場で大会に参加できます。';
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
      h('h1', { class: 'new-game__title', text: '主人公を選んでください' }),
      h('div', { class: 'new-game__choices' },
        choice('male', '男の子', '黒髪・青い帽子と服', maleSheet),
        choice('female', '女の子', '赤い帽子と服', femaleSheet),
      ),
      h('p', { class: 'notice', text: '歩行グラフィックは確認用の試作品（QA）です。正式素材ではありません。' }),
      button('タイトルへ戻る', () => ctx.back('title'), 'btn btn--ghost'),
    );
    return { element };
  },
};
