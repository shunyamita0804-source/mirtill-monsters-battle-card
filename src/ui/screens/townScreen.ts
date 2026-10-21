import type { ScreenId } from '../../config/screens.ts';
import { createScreenHeader } from '../components/screenHeader.ts';
import { button, h } from '../dom.ts';
import type { ScreenDefinition } from './types.ts';

interface TownFacility {
  readonly label: string;
  readonly description: string;
  readonly to: ScreenId;
}

/**
 * 街から行ける施設。施設（ダンジョン・ガチャ・大会など）を増やすときはここに足す。
 * 第2段階で実装済みの画面だけを並べている。
 */
const TOWN_FACILITIES: readonly TownFacility[] = [
  { label: 'カードショップ', description: 'カードを見る（仮）', to: 'shop' },
  { label: 'カードバトル', description: '仮の対戦画面', to: 'battle' },
];

export const townScreen: ScreenDefinition = {
  id: 'town',
  title: '街',
  create(ctx) {
    const facilities = TOWN_FACILITIES.map((facility) =>
      h(
        'button',
        {
          class: 'town-facility',
          attrs: { type: 'button' },
          on: { click: () => ctx.navigate(facility.to) },
        },
        h('span', { class: 'town-facility__label', text: facility.label }),
        h('span', { class: 'town-facility__description', text: facility.description }),
        h('span', { class: 'town-facility__arrow', text: '›', attrs: { 'aria-hidden': 'true' } }),
      ),
    );

    const element = h(
      'main',
      { class: 'screen town-screen' },
      createScreenHeader({
        title: '街',
        right: button('タイトル', () => ctx.reset('title'), 'btn btn--ghost btn--small'),
      }),
      // 仮の街マップ（GB版風の街は正式素材・仕様が決まってから実装する）
      h(
        'div',
        { class: 'town-screen__map', attrs: { 'aria-hidden': 'true' } },
        h('div', { class: 'town-screen__building town-screen__building--shop' }, '店'),
        h('div', { class: 'town-screen__building town-screen__building--arena' }, '対戦'),
        h('p', { class: 'town-screen__map-note', text: '街マップ（仮）' }),
      ),
      h('nav', { class: 'town-screen__facilities', attrs: { 'aria-label': '施設' } }, ...facilities),
    );
    return { element };
  },
};
