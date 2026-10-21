import { cardCatalog, getMonster, HIDDEN_MONSTER_ID } from '../../data/cards.ts';
import { CURRENCY, PACKS, type PackDefinition } from '../../data/economy.ts';
import { FRAGMENT_TOTAL } from '../../data/fragments.ts';
import { RARITY_LABEL } from '../../game/cards/cardTypes.ts';
import { packCardRates, purchasePack } from '../../game/economy/gacha.ts';
import { canRestoreHidden, fragmentCount, restoreHidden } from '../../game/progress/fragments.ts';
import { randomSeed } from '../../game/rng.ts';
import { openCardDetail } from '../components/cardDetail.ts';
import { createCardView } from '../components/cardView.ts';
import { confirmModal, messageModal, openModal } from '../components/modal.ts';
import { createScreenHeader } from '../components/screenHeader.ts';
import { button, h } from '../dom.ts';
import { newId } from '../gameStore.ts';
import type { ScreenDefinition } from './types.ts';

/** ショップの店員メニュー：カードを見る／売る（価格未確定のため無効）／ガチャ／特別復元（欠片を持っているときだけ） */
export const shopMenuScreen: ScreenDefinition = {
  id: 'shopMenu',
  title: 'カードショップ',
  create(ctx) {
    const store = ctx.store;
    const element = h('main', { class: 'screen shop-menu' });
    const render = (): void => {
      const save = store.save;
      const fragments = fragmentCount(save);
      const sell = button('売る', () => undefined, 'shop-menu__item');
      sell.disabled = true;
      element.replaceChildren(
        createScreenHeader({ title: 'カードショップ', back: { label: '戻る', onTap: () => ctx.back('world') } }),
        h(
          'div',
          { class: 'shop-menu__clerk' },
          h('div', { class: 'shop-menu__clerk-figure', text: '店員', attrs: { 'aria-hidden': 'true' } }),
          h('p', { class: 'shop-menu__bubble', text: 'いらっしゃいませ！ご用件は何でしょう？' }),
        ),
        h('p', { class: 'shop-menu__coins', text: `所持金 ${save.coins}${CURRENCY.unit}` }),
        h(
          'nav',
          { class: 'shop-menu__items' },
          button('カードを見る', () => ctx.navigate('cardList'), 'shop-menu__item'),
          h('div', { class: 'shop-menu__disabled' }, sell, h('span', { class: 'shop-menu__note', text: '買取価格が未確定のため、まだ利用できません' })),
          button('カードガチャ', () => ctx.navigate('gacha'), 'shop-menu__item'),
          fragments > 0 || save.hiddenRestored ? button(`特別復元（欠片 ${fragments}/${FRAGMENT_TOTAL}）`, () => openRestore(), 'shop-menu__item shop-menu__item--special') : null,
        ),
      );
    };

    const openRestore = (): void => {
      const save = store.save;
      if (save.hiddenRestored) {
        messageModal(element, '隠しモンスターはすでに復元済みです。');
        return;
      }
      if (!canRestoreHidden(save)) {
        messageModal(element, `ふしぎな欠片が ${fragmentCount(save)}/${FRAGMENT_TOTAL} 個。\n10個集めると、欠片に眠るモンスターを1体だけ復元できます。\n（欠片は街やダンジョンのどこかに隠れています）`, undefined, '特別復元');
        return;
      }
      const tx = newId('restore');
      confirmModal(element, '特別復元', [h('p', { class: 'modal__text', text: '欠片10個を使って、隠しモンスターのカードを1枚復元しますか？（技カードは付きません）' })], '復元する', () => {
        const r = restoreHidden(store.save, tx);
        if (r.status !== 'ok') return;
        store.update(() => r.save);
        const monster = getMonster(HIDDEN_MONSTER_ID);
        const handle = openModal(element, {
          title: '復元成功！',
          body: [
            h('div', { class: 'card-detail__card' }, createCardView(monster, 150, true)),
            h('p', { class: 'modal__text', text: `${monster.name} のカードを1枚手に入れた。` }),
            h('p', { class: 'modal__text modal__text--sub', text: '正式な名称・画像・能力は未確定です。技カードは第3弾パックから入手できます。' }),
          ],
          actions: [{ label: '閉じる', primary: true, onTap: () => handle.close() }],
          onClose: render,
        });
      });
    };

    render();
    return { element };
  },
};

/** カードガチャマシン（カプセルではなくカードパックが出る） */
export const gachaScreen: ScreenDefinition = {
  id: 'gacha',
  title: 'カードガチャ',
  create(ctx) {
    const store = ctx.store;
    const element = h('main', { class: 'screen gacha' });

    const showRates = (pack: PackDefinition): void => {
      const rates = packCardRates(pack);
      const total = rates.reduce((s, r) => s + r.rate, 0);
      const handle = openModal(element, {
        title: `${pack.name}：収録カードと提供割合`,
        className: 'gacha-rates',
        body: [
          h('p', { class: 'modal__text modal__text--warn', text: '※ 提供割合・収録内容・価格は仮の値です（未承認）' }),
          h('p', { class: 'modal__text', text: `1パック${pack.cardsPerPack}枚。1枚ごとに次の割合で排出します。` }),
          h('p', { class: 'modal__text', text: `レアリティ別：${(['C', 'U', 'R'] as const).map((r) => `${RARITY_LABEL[r]} ${pack.rarityRates[r]}%`).join(' / ')}` }),
          h(
            'table',
            { class: 'gacha-rates__table' },
            h('thead', {}, h('tr', {}, h('th', { text: 'カード' }), h('th', { text: '分類' }), h('th', { text: 'レア' }), h('th', { text: '割合' }))),
            h(
              'tbody',
              {},
              ...rates.map((r) => {
                const card = cardCatalog.get(r.cardId);
                return h(
                  'tr',
                  {},
                  h('td', { text: card?.name ?? r.cardId }),
                  h('td', { text: card?.kind === 'monster' ? 'モンスター' : '技' }),
                  h('td', { text: r.rarity }),
                  h('td', { text: `${r.rate.toFixed(3)}%` }),
                );
              }),
            ),
            h('tfoot', {}, h('tr', {}, h('td', { text: '合計', attrs: { colspan: '3' } }), h('td', { text: `${total.toFixed(3)}%` }))),
          ),
        ],
        actions: [{ label: '閉じる', primary: true, onTap: () => handle.close() }],
      });
    };

    const buy = (pack: PackDefinition): void => {
      const save = store.save;
      if (save.coins < pack.price) {
        messageModal(element, `所持金が足りません（${pack.price}${CURRENCY.unit} 必要）。\nダンジョンや大会で稼ぎましょう。`);
        return;
      }
      // 購入確認を開いた時点で購入IDを1つ作る。同じIDの購入は1回しか処理されない（二重決済防止）
      const tx = newId('purchase');
      confirmModal(
        element,
        '購入確認',
        [
          h('p', { class: 'modal__text', text: `${pack.name} を ${pack.price}${CURRENCY.unit} で購入しますか？` }),
          h('p', { class: 'modal__text', text: `所持金 ${save.coins}${CURRENCY.unit} → ${save.coins - pack.price}${CURRENCY.unit}` }),
          h('p', { class: 'modal__text modal__text--sub', text: '※ ゲーム内通貨のみ。価格は仮の値です。' }),
        ],
        '購入する',
        () => {
          const before = store.save.collection;
          const r = purchasePack(store.save, pack.id, tx, randomSeed());
          // 先に画面を描き直してから演出を重ねる（描き直しで演出が消えないように）
          render();
          if (r.status === 'ok') {
            store.update(() => r.save);
            render();
            openPack(pack, r.cards, before);
          } else if (r.status === 'error') {
            messageModal(element, r.message);
          }
        },
      );
    };

    /** パック開封の演出：パックが震えて開き、カードを1枚ずつめくる */
    const openPack = (pack: PackDefinition, cards: readonly string[], before: Readonly<Record<string, number>>): void => {
      const seen = new Set<string>();
      // 詳細は演出の上に重ねる（演出の下に隠れて閉じられなくならないように）
      const overlay = h('div', { class: 'pack-open' });
      const slots = cards.map((id) => {
        const card = cardCatalog.get(id);
        const isNew = (before[id] ?? 0) === 0 && !seen.has(id);
        seen.add(id);
        const face = card ? createCardView(card, 92, false) : h('div');
        return h(
          'button',
          { class: 'pack-open__card', attrs: { type: 'button' }, on: { click: () => card && openCardDetail(overlay, card, { owned: store.save.collection[id] ?? 0 }) } },
          h('div', { class: 'pack-open__back' }),
          h('div', { class: 'pack-open__face' }, face),
          h('span', { class: 'pack-open__name', text: card?.name ?? id }),
          isNew ? h('span', { class: 'pack-open__new', text: 'NEW' }) : null,
        );
      });
      const packEl = h('div', { class: 'pack-open__pack', text: pack.name });
      const cardsEl = h('div', { class: 'pack-open__cards' }, ...slots);
      const done = button('閉じる', () => overlay.remove(), 'btn btn--primary');
      done.disabled = true;
      overlay.append(packEl, cardsEl, h('p', { class: 'pack-open__hint', text: 'カードは所持に追加されました。タップで詳細。' }), done);
      element.append(overlay);
      setTimeout(() => packEl.classList.add('is-opening'), 50);
      setTimeout(() => {
        packEl.classList.add('is-open');
        slots.forEach((s, i) => setTimeout(() => s.classList.add('is-revealed'), 250 * i));
        setTimeout(() => {
          done.disabled = false;
        }, 250 * slots.length);
      }, 800);
    };

    const render = (): void => {
      const save = store.save;
      const packs = PACKS.map((pack) => {
        const unlocked = save.unlockedPacks.includes(pack.id);
        const buyBtn = button(`購入 ${pack.price}${CURRENCY.unit}`, () => buy(pack), 'btn btn--primary btn--small');
        buyBtn.disabled = !unlocked;
        return h(
          'div',
          { class: `gacha__pack${unlocked ? '' : ' is-locked'}`, dataset: { id: pack.id } },
          h('div', { class: 'gacha__pack-art', text: unlocked ? pack.name.replace('（仮）', '') : '？' }),
          h(
            'div',
            { class: 'gacha__pack-info' },
            h('p', { class: 'gacha__pack-name', text: pack.name }),
            h('p', { class: 'gacha__pack-desc', text: unlocked ? pack.description : `未解放：${pack.unlockHint}` }),
            h('p', { class: 'gacha__pack-meta', text: `${pack.cardsPerPack}枚入り・${unlocked ? '解放済' : '未解放'}` }),
            h('div', { class: 'gacha__pack-actions' }, button('収録・提供割合', () => showRates(pack), 'btn btn--small'), buyBtn),
          ),
        );
      });
      element.replaceChildren(
        createScreenHeader({ title: 'カードガチャ', back: { label: '戻る', onTap: () => ctx.back('shopMenu') } }),
        h(
          'div',
          { class: 'gacha__machine', attrs: { 'aria-hidden': 'true' } },
          h('div', { class: 'gacha__machine-top', text: 'カードガチャマシン' }),
          h('div', { class: 'gacha__machine-slot' }, h('div', { class: 'gacha__machine-pack' })),
          h('p', { class: 'gacha__machine-note', text: 'カードパックが出てきます（仮の見た目）' }),
        ),
        h('p', { class: 'gacha__coins', text: `所持金 ${save.coins}${CURRENCY.unit}` }),
        h('div', { class: 'gacha__packs' }, ...packs),
      );
    };

    render();
    return { element };
  },
};
