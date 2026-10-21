import { APP_INFO } from '../../config/app.ts';
import { MONSTERS, SKILLS } from '../../data/cards.ts';
import { CURRENCY, PACKS } from '../../data/economy.ts';
import { addCards, addCoins, unlockPacks } from '../../game/save/saveData.ts';
import { confirmModal, messageModal } from '../components/modal.ts';
import { createScreenHeader } from '../components/screenHeader.ts';
import { button, h } from '../dom.ts';
import type { ScreenDefinition } from './types.ts';

const fmt = (iso: string): string => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('ja-JP');
};

/** ベッド：休む（セーブ確認）・記録・設定 */
export const settingsScreen: ScreenDefinition = {
  id: 'settings',
  title: 'ベッド',
  create(ctx) {
    const store = ctx.store;
    const element = h('main', { class: 'screen settings' });
    const render = (): void => {
      const s = store.save;
      const rows: [string, string][] = [
        ['主人公', s.player.gender === 'female' ? '女の子' : '男の子'],
        ['ランク', s.rank],
        ['所持金', `${s.coins}${CURRENCY.unit}`],
        ['カード', `${Object.values(s.collection).reduce((a, b) => a + b, 0)}枚`],
        ['対戦', `${s.stats.battlesWon}勝 ${s.stats.battlesLost}敗`],
        ['開封したパック', `${s.stats.packsOpened}個`],
        ['はじめた日時', fmt(s.createdAt)],
        ['最後に保存', fmt(s.updatedAt)],
      ];
      element.replaceChildren(
        createScreenHeader({ title: 'ベッド', back: { label: '戻る', onTap: () => ctx.back('world') } }),
        h(
          'div',
          { class: 'settings__body' },
          button('休む（セーブする）', () => {
            store.persist();
            messageModal(element, store.lastSaveOk ? 'ぐっすり休んだ。\nセーブしました。' : 'セーブに失敗しました。ブラウザの保存領域を確認してください。', render);
          }, 'btn btn--primary btn--large'),
          h('p', { class: 'settings__note', text: '進行状況はカードの入手・移動・対戦のたびに自動でも保存されます（この端末のブラウザ内）。' }),
          h('dl', { class: 'settings__rows' }, ...rows.flatMap(([k, v]) => [h('dt', { text: k }), h('dd', { text: v })])),
          h('h2', { class: 'settings__heading', text: 'このバージョンについて' }),
          h(
            'ul',
            { class: 'rule-list' },
            h('li', { text: `${APP_INFO.gameName} v${APP_INFO.version}（開発版）` }),
            h('li', { text: 'カード・ルール・価格・提供割合・大会・敵編成は仮の値です' }),
            h('li', { text: '街・家・ショップ・大会会場・ダンジョンは仮マップ（正式背景は未着手）' }),
            h('li', { text: '主人公の歩行グラフィックは QA 試作品です' }),
            h('li', { text: '技カードの枠は「技カードUIテンプレート V4（承認待ち）」を使用' }),
          ),
          button('タイトルへ', () => ctx.reset('title'), 'btn'),
          button('セーブデータを消す', () => {
            confirmModal(element, 'セーブデータを消しますか？', [h('p', { class: 'modal__text', text: 'カード・所持金・進行状況がすべて消えます。元に戻せません。' })], '消す', () => {
              confirmModal(element, '本当に消しますか？', [h('p', { class: 'modal__text', text: 'この操作は取り消せません。' })], '完全に消す', () => {
                store.deleteSave();
                ctx.reset('title');
              });
            });
          }, 'btn btn--danger'),
          store.qa
            ? h(
                'div',
                { class: 'settings__qa' },
                h('h2', { class: 'settings__heading', text: 'QA用（?qa=1 のときだけ表示）' }),
                button('+1000G', () => {
                  store.update((x) => addCoins(x, 1000));
                  render();
                }, 'btn btn--small'),
                button('全カードを4枚ずつ', () => {
                  store.update((x) => addCards(x, [...MONSTERS.filter((m) => !m.hidden), ...SKILLS].map((c) => ({ cardId: c.id, count: 4 }))));
                  render();
                }, 'btn btn--small'),
                button('全パック解放', () => {
                  store.update((x) => unlockPacks(x, PACKS.map((p) => p.id)));
                  render();
                }, 'btn btn--small'),
              )
            : null,
        ),
      );
    };
    render();
    return { element };
  },
};
