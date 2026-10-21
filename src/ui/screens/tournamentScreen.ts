import { cardCatalog, getMonster } from '../../data/cards.ts';
import { CURRENCY, getPack } from '../../data/economy.ts';
import { getTournament, TOURNAMENTS, type TournamentDefinition } from '../../data/tournaments.ts';
import {
  claimTournamentRewards,
  enterTournament,
  entryCheck,
  recordMatch,
  tournamentRecord,
  withdraw,
} from '../../game/progress/tournament.ts';
import { confirmModal, openModal } from '../components/modal.ts';
import { createScreenHeader } from '../components/screenHeader.ts';
import { button, h } from '../dom.ts';
import { newId, once } from '../gameStore.ts';
import type { ScreenDefinition } from './types.ts';

function roundLabel(t: TournamentDefinition, i: number): string {
  const left = t.rounds.length - i;
  if (left === 1) return '決勝';
  if (left === 2) return '準決勝';
  return `${i + 1}回戦`;
}

function prizeLines(t: TournamentDefinition): string[] {
  const fw = t.rewards.firstWin;
  const first = [
    `${fw.coins}${CURRENCY.unit}`,
    ...fw.unlockPacks.map((p) => `「${getPack(p)?.name ?? p}」解放`),
    ...(fw.rankUp ? [`${fw.rankUp}ランクに昇格`] : []),
    ...fw.cards.map((c) => `${cardCatalog.get(c.cardId)?.name ?? c.cardId}×${c.count}`),
  ];
  return [
    `参加報酬：${t.rewards.participationCoins}${CURRENCY.unit}`,
    `初回優勝：${first.join('、')}`,
    `再優勝：${t.rewards.repeatWin.coins}${CURRENCY.unit}`,
  ];
}

/**
 * 大会会場の受付：受付 → 参加条件・景品 → 対戦 → 結果 → 次戦 → 優勝 → 景品。
 * 進行状況はセーブに保存されるので、途中でやめても次回ここから再開できる。
 */
export const tournamentScreen: ScreenDefinition = {
  id: 'tournament',
  title: '大会受付',
  create(ctx) {
    const store = ctx.store;
    const element = h('main', { class: 'screen tournament' });

    const startMatch = once((t: TournamentDefinition, round: number) => {
      const opponent = t.rounds[round];
      if (!opponent) return;
      store.pendingBattle = {
        title: `${t.name} ${roundLabel(t, round)}`,
        opponent,
        allowSurrender: true,
        onFinish: (winner) => {
          const won = winner === 'player';
          store.update((s) => ({
            ...recordMatch(s, round, won),
            stats: { ...s.stats, battlesWon: s.stats.battlesWon + (won ? 1 : 0), battlesLost: s.stats.battlesLost + (won ? 0 : 1) },
          }));
          ctx.back('tournament');
        },
      };
      ctx.navigate('battle');
    });

    const claim = once(() => {
      const r = claimTournamentRewards(store.save);
      if (r.status !== 'ok') {
        render();
        return;
      }
      store.update(() => r.save);
      const s = r.summary;
      const lines = [
        `${s.coins}${CURRENCY.unit} を受け取った。`,
        ...s.unlockedPacks.map((p) => `新パック「${getPack(p)?.name ?? p}」が解放された！（ショップのガチャで購入できます）`),
        ...(s.rankUp ? [`ランクが ${s.rankUp} に上がった！`] : []),
        ...s.cards.map((c) => `${cardCatalog.get(c.cardId)?.name ?? c.cardId} ×${c.count} を手に入れた。`),
      ];
      const handle = openModal(element, {
        title: s.won ? (s.firstWin ? '初優勝の景品' : '優勝の景品') : '参加報酬',
        body: lines.map((t) => h('p', { class: 'modal__text', text: t })),
        actions: [{ label: 'OK', primary: true, onTap: () => handle.close() }],
        onClose: render,
      });
    });

    const tournamentCard = (t: TournamentDefinition): HTMLElement => {
      const check = entryCheck(store.save, t);
      const record = tournamentRecord(store.save, t.id);
      const join = button('参加する', () => {
        confirmModal(
          element,
          `${t.name}に参加しますか？`,
          [
            h('p', { class: 'modal__text', text: `${t.rounds.length}連勝で優勝（参加${t.participants}人・仮）` }),
            ...prizeLines(t).map((l) => h('p', { class: 'modal__text', text: l })),
            h('p', { class: 'modal__text modal__text--sub', text: '途中でやめても、次回ここから再開できます。' }),
          ],
          '参加する',
          () => {
            store.update((s) => enterTournament(s, t.id, newId('entry')));
            render();
          },
        );
      }, 'btn btn--primary');
      join.disabled = !check.ok;
      return h(
        'div',
        { class: `tournament__item${check.ok ? '' : ' is-locked'}`, dataset: { id: t.id } },
        h('h2', { class: 'tournament__name', text: `${t.name}（仮）` }),
        h('p', { class: 'tournament__desc', text: t.description }),
        h('p', { class: 'tournament__cond', text: `参加条件：${t.requiredRank}ランク以上・正しいデッキ／対戦数 ${t.rounds.length}（仮）` }),
        h('ul', { class: 'tournament__prizes' }, ...prizeLines(t).map((l) => h('li', { text: l }))),
        h('p', { class: 'tournament__record', text: `参加${record.entries}回・優勝${record.wins}回${record.firstWinClaimed ? '（初回景品受取済）' : ''}` }),
        check.ok ? null : h('p', { class: 'tournament__ng', text: check.reasons.join(' / ') }),
        join,
      );
    };

    const render = (): void => {
      const save = store.save;
      const active = save.activeTournament;
      const t = active ? getTournament(active.tournamentId) : undefined;
      const body: (HTMLElement | null)[] = [];
      if (!active || !t) {
        body.push(
          h('div', { class: 'tournament__desk' }, h('div', { class: 'tournament__clerk', text: '受付', attrs: { 'aria-hidden': 'true' } }), h('p', { class: 'shop-menu__bubble', text: `大会会場へようこそ！あなたのランクは ${save.rank} です。` })),
          ...TOURNAMENTS.map(tournamentCard),
        );
      } else if (active.status === 'inProgress') {
        const opponent = t.rounds[active.round];
        body.push(
          h('h2', { class: 'tournament__name', text: `${t.name} 参加中` }),
          h(
            'ol',
            { class: 'tournament__bracket' },
            ...t.rounds.map((r, i) =>
              h(
                'li',
                { class: `tournament__round${i < active.round ? ' is-won' : i === active.round ? ' is-next' : ''}` },
                h('span', { class: 'tournament__round-label', text: roundLabel(t, i) }),
                h('span', { class: 'tournament__round-name', text: r.name }),
                h('span', { class: 'tournament__round-state', text: i < active.round ? '勝利' : i === active.round ? '次の対戦' : '—' }),
              ),
            ),
          ),
          opponent
            ? h('p', { class: 'tournament__opponent', text: `相手のモンスター：${opponent.monsters.map((m) => getMonster(m).name).join('・')}` })
            : null,
          button(`${roundLabel(t, active.round)}を戦う`, () => startMatch(t, active.round), 'btn btn--primary btn--large'),
          h('p', { class: 'notice', text: '途中で会場を出ても、次回この続きから再開できます。対戦の途中でアプリを閉じた場合は、その回戦の最初からやり直しになります。' }),
          button('棄権する', () => {
            confirmModal(element, '棄権しますか？', [h('p', { class: 'modal__text', text: '大会は敗退扱いになります（参加報酬は受け取れます）。' })], '棄権する', () => {
              store.update(withdraw);
              render();
            });
          }, 'btn btn--ghost'),
        );
      } else {
        const won = active.status === 'won';
        body.push(
          h('div', { class: `tournament__result${won ? ' is-won' : ''}` },
            h('p', { class: 'tournament__result-title', text: won ? `${t.name} 優勝！` : `${t.name} 敗退` }),
            h('p', { class: 'tournament__result-sub', text: won ? 'おめでとうございます！' : `${roundLabel(t, active.round)}で敗退しました。また挑戦しましょう。` }),
          ),
          button('景品を受け取る', claim, 'btn btn--primary btn--large'),
        );
      }
      element.replaceChildren(
        createScreenHeader({ title: '大会受付', back: { label: '戻る', onTap: () => ctx.back('world') } }),
        h('div', { class: 'tournament__body' }, ...body),
      );
    };

    render();
    return { element };
  },
};
