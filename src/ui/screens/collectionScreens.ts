import { HIDDEN_MONSTER_ID, MONSTERS, SKILLS, SUPPORTS } from '../../data/cards.ts';
import { PACKS } from '../../data/economy.ts';
import { cardCatalog } from '../../data/cards.ts';
import type { CardDefinition } from '../../game/cards/cardTypes.ts';
import { createCardGrid } from '../components/cardGrid.ts';
import { createScreenHeader } from '../components/screenHeader.ts';
import { h } from '../dom.ts';
import type { ScreenDefinition } from './types.ts';

/** 図鑑（家の本棚）：すべてのカード。未入手は影、隠しモンスターは復元するまで「？？？」 */
export const collectionScreen: ScreenDefinition = {
  id: 'collection',
  title: '図鑑',
  create(ctx) {
    const save = ctx.store.save;
    const element = h('main', { class: 'screen collection' });
    const cards: CardDefinition[] = [...MONSTERS.filter((m) => m.id !== HIDDEN_MONSTER_ID || save.hiddenRestored), ...SKILLS, ...SUPPORTS];
    const ownedKinds = cards.filter((c) => (save.collection[c.id] ?? 0) > 0).length;
    element.append(
      createScreenHeader({ title: '図鑑', back: { label: '戻る', onTap: () => ctx.back('world') } }),
      h('p', { class: 'notice', text: `登録 ${ownedKinds}/${cards.length} 種類（カードはすべて仮データ）` }),
      createCardGrid({ cards, owned: save.collection, hideUnowned: true, modalParent: element }),
    );
    return { element };
  },
};

/** ショップの「カードを見る」：解放済みパックの収録カード（所持枚数つき） */
export const cardListScreen: ScreenDefinition = {
  id: 'cardList',
  title: 'カード一覧',
  create(ctx) {
    const save = ctx.store.save;
    const element = h('main', { class: 'screen card-list' });
    const ids = new Set(PACKS.filter((p) => save.unlockedPacks.includes(p.id)).flatMap((p) => p.cardIds));
    const cards = [...ids].map((id) => cardCatalog.get(id)).filter((c): c is CardDefinition => c !== undefined);
    element.append(
      createScreenHeader({ title: 'カードを見る', back: { label: '戻る', onTap: () => ctx.back('shopMenu') } }),
      h('p', { class: 'notice', text: '解放済みのパックに収録されているカードです。タップで拡大・詳細。' }),
      createCardGrid({ cards, owned: save.collection, hideUnowned: false, modalParent: element }),
    );
    return { element };
  },
};
