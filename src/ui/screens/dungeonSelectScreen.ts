import { DUNGEONS } from '../../data/dungeons.ts';
import { getMap } from '../../data/maps.ts';
import { isDeckValid } from '../../game/deck/deck.ts';
import { dungeonRecord, startDungeon } from '../../game/progress/dungeon.ts';
import { messageModal } from '../components/modal.ts';
import { createScreenHeader } from '../components/screenHeader.ts';
import { button, h } from '../dom.ts';
import { once } from '../gameStore.ts';
import type { ScreenDefinition } from './types.ts';

/** 家の壁の地図：行き先のダンジョンを選ぶ */
export const dungeonSelectScreen: ScreenDefinition = {
  id: 'dungeonSelect',
  title: 'ダンジョン選択',
  create(ctx) {
    const store = ctx.store;
    const element = h('main', { class: 'screen dungeon-select' });
    const items = DUNGEONS.map((d) => {
      const record = dungeonRecord(store.save, d.id);
      const chestTotal = d.floors.reduce((n, f) => n + (getMap(f)?.objects.filter((o) => o.type === 'chest').length ?? 0), 0);
      const depart = once(() => {
        store.update((s) => startDungeon(s, d.id));
        ctx.reset('world');
      });
      const go = (): void => {
        if (!isDeckValid(store.save.deck, store.save.collection)) {
          messageModal(element, 'デッキの構成が正しくありません。机でデッキを確認してください。');
          return;
        }
        depart();
      };
      return h(
        'div',
        { class: 'dungeon-select__item' },
        h('h2', { class: 'dungeon-select__name', text: d.name }),
        h('p', { class: 'dungeon-select__desc', text: d.description }),
        h('p', {
          class: 'dungeon-select__progress',
          text: `クリア ${record.clears}回・宝箱 ${record.openedChests.length}/${chestTotal}${record.bossDefeated ? '・ボス撃破済み' : ''}`,
        }),
        button('出発する', go, 'btn btn--primary'),
      );
    });
    element.append(
      createScreenHeader({ title: '壁の地図', back: { label: '戻る', onTap: () => ctx.back('world') } }),
      h('p', { class: 'notice', text: '行き先を選んでください。敵に触れるとバトル。負けても家に戻るだけで、何度でも挑戦できます。' }),
      ...items,
    );
    return { element };
  },
};
