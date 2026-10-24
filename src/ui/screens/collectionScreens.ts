import { HIDDEN_MONSTER_ID, MONSTERS, SKILLS, SUPPORTS } from '../../data/cards.ts';
import { PACKS } from '../../data/economy.ts';
import { cardCatalog } from '../../data/cards.ts';
import type { CardDefinition } from '../../game/cards/cardTypes.ts';
import { t } from '../../i18n/i18n.ts';
import { createCardGrid } from '../components/cardGrid.ts';
import { createScreenHeader } from '../components/screenHeader.ts';
import { h } from '../dom.ts';
import researcherFace from '@assets/images/characters/face_researcher.webp';
import type { ScreenDefinition } from './types.ts';

/** 図鑑（家の本棚）：すべてのカード。未入手は影、隠しモンスターは復元するまで「？？？」 */
export const collectionScreen: ScreenDefinition = {
  id: 'collection',
  titleKey: 'collection.title',
  create(ctx) {
    const save = ctx.store.save;
    const element = h('main', { class: 'screen collection' });
    // 退役した技（旧ラズックのクロスガード）は、持っているときだけ並べる
    const skills = SKILLS.filter((s) => !s.retired || (save.collection[s.id] ?? 0) > 0);
    const cards: CardDefinition[] = [...MONSTERS.filter((m) => m.id !== HIDDEN_MONSTER_ID || save.hiddenRestored), ...skills, ...SUPPORTS];
    const ownedKinds = cards.filter((c) => (save.collection[c.id] ?? 0) > 0).length;
    element.append(
      createScreenHeader({ title: t('collection.title'), back: { label: t('common.back'), onTap: () => ctx.back('world') } }),
      // 研究所の場所の絵（デザイン第4弾）の上に、研究員の顔（第5弾）と登録数の吹き出し。ショップの店員と同じ形
      h(
        'div',
        { class: 'shop-menu__clerk collection__desk' },
        h('img', { class: 'shop-menu__clerk-figure shop-menu__face', attrs: { src: researcherFace, alt: t('story.speaker.researcher'), draggable: 'false' } }),
        h('p', { class: 'shop-menu__bubble', text: t('collection.count', { owned: ownedKinds, total: cards.length }) }),
      ),
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
