import { HIDDEN_MONSTER_ID, MONSTERS, SKILLS, SUPPORTS } from '../../data/cards.ts';
import { PACKS } from '../../data/economy.ts';
import { cardCatalog } from '../../data/cards.ts';
import type { CardDefinition } from '../../game/cards/cardTypes.ts';
import { t } from '../../i18n/i18n.ts';
import { createCardGrid } from '../components/cardGrid.ts';
import { createScreenHeader } from '../components/screenHeader.ts';
import { h } from '../dom.ts';
import type { ScreenDefinition } from './types.ts';

/** 図鑑（家の本棚）：すべてのカード。未入手は影、隠しモンスターは復元するまで「？？？」 */
export const collectionScreen: ScreenDefinition = {
  id: 'collection',
  titleKey: 'collection.title',
  create(ctx) {
    const save = ctx.store.save;
    const element = h('main', { class: 'screen collection' });
    const cards: CardDefinition[] = [...MONSTERS.filter((m) => m.id !== HIDDEN_MONSTER_ID || save.hiddenRestored), ...SKILLS, ...SUPPORTS];
    const ownedKinds = cards.filter((c) => (save.collection[c.id] ?? 0) > 0).length;
    element.append(
      createScreenHeader({ title: t('collection.title'), back: { label: t('common.back'), onTap: () => ctx.back('world') } }),
      h('p', { class: 'notice', text: t('collection.count', { owned: ownedKinds, total: cards.length }) }),
      createCardGrid({ cards, owned: save.collection, hideUnowned: true, modalParent: element }),
    );
    return { element };
  },
};

/** ショップの「カードを見る」：解放済みパックの収録カード（所持枚数つき） */
export const cardListScreen: ScreenDefinition = {
  id: 'cardList',
  titleKey: 'cardList.title',
  create(ctx) {
    const save = ctx.store.save;
    const element = h('main', { class: 'screen card-list' });
    const ids = new Set(PACKS.filter((p) => save.unlockedPacks.includes(p.id)).flatMap((p) => p.cardIds));
    const cards = [...ids].map((id) => cardCatalog.get(id)).filter((c): c is CardDefinition => c !== undefined);
    element.append(
      createScreenHeader({ title: t('cardList.heading'), back: { label: t('common.back'), onTap: () => ctx.back('shopMenu') } }),
      h('p', { class: 'notice', text: t('cardList.note') }),
      createCardGrid({ cards, owned: save.collection, hideUnowned: false, modalParent: element }),
    );
    return { element };
  },
};
