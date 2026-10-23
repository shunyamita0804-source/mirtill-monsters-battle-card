import { DUNGEONS } from '../../data/dungeons.ts';
import { getMap } from '../../data/maps.ts';
import { isDeckValid } from '../../game/deck/deck.ts';
import { dungeonRecord, startDungeon } from '../../game/progress/dungeon.ts';
import { messageModal } from '../components/modal.ts';
import { createScreenHeader } from '../components/screenHeader.ts';
import { button, h } from '../dom.ts';
import { once } from '../gameStore.ts';
import { sound } from '../sound.ts';
import { t } from '../../i18n/i18n.ts';
import { dungeonDescription, dungeonName } from '../../i18n/content.ts';
import type { ScreenDefinition } from './types.ts';

/** 家の壁の地図：行き先のダンジョンを選ぶ */
export const dungeonSelectScreen: ScreenDefinition = {
  id: 'dungeonSelect',
  titleKey: 'world.dungeonSelect.title',
  create(ctx) {
    const store = ctx.store;
    const element = h('main', { class: 'screen dungeon-select' });
    const items = DUNGEONS.map((d) => {
      const record = dungeonRecord(store.save, d.id);
      const chestTotal = d.floors.reduce((n, f) => n + (getMap(f)?.objects.filter((o) => o.type === 'chest').length ?? 0), 0);
      const depart = once(() => {
        // ダンジョンの門を開けて入る
        sound.play('gateOpen');
        store.update((s) => startDungeon(s, d.id));
        ctx.reset('world');
      });
      const go = (): void => {
        if (!isDeckValid(store.save.deck, store.save.collection)) {
          messageModal(element, t('world.dungeonSelect.deckInvalid'));
          return;
        }
        depart();
      };
      return h(
        'div',
        { class: 'dungeon-select__item' },
        h('h2', { class: 'dungeon-select__name', text: dungeonName(d) }),
        h('p', { class: 'dungeon-select__desc', text: dungeonDescription(d) }),
        h('p', {
          class: 'dungeon-select__progress',
          text: t(record.bossDefeated ? 'world.dungeonSelect.progressBoss' : 'world.dungeonSelect.progress', {
            clears: record.clears,
            opened: record.openedChests.length,
            total: chestTotal,
          }),
        }),
        button(t('world.dungeonSelect.depart'), go, 'btn btn--primary'),
      );
    });
    element.append(
      createScreenHeader({ title: t('world.dungeonSelect.header'), back: { label: t('common.back'), onTap: () => ctx.back('world') } }),
      h('p', { class: 'notice', text: t('world.dungeonSelect.notice') }),
      ...items,
    );
    return { element };
  },
};
