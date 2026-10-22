import { getMonster } from '../../data/cards.ts';
import { getPack } from '../../data/economy.ts';
import { getTournament, TOURNAMENTS, type TournamentDefinition } from '../../data/tournaments.ts';
import {
  claimTournamentRewards,
  enterTournament,
  entryCheck,
  recordMatch,
  tournamentRecord,
  withdraw,
} from '../../game/progress/tournament.ts';
import { cardName, opponentName, packName, tournamentDescription, tournamentName } from '../../i18n/content.ts';
import { t as tr } from '../../i18n/i18n.ts';
import { confirmModal, openModal } from '../components/modal.ts';
import { createScreenHeader } from '../components/screenHeader.ts';
import { button, h } from '../dom.ts';
import { newId, once } from '../gameStore.ts';
import type { ScreenDefinition } from './types.ts';

function roundLabel(t: TournamentDefinition, i: number): string {
  const left = t.rounds.length - i;
  if (left === 1) return tr('tournament.roundFinal');
  if (left === 2) return tr('tournament.roundSemi');
  return tr('tournament.roundN', { n: i + 1 });
}

const packLabel = (id: string): string => {
  const pack = getPack(id);
  return pack ? packName(pack) : id;
};

function prizeLines(t: TournamentDefinition): string[] {
  const fw = t.rewards.firstWin;
  const first = [
    tr('common.coins', { n: fw.coins }),
    ...fw.unlockPacks.map((p) => tr('tournament.prizePack', { pack: packLabel(p) })),
    ...(fw.rankUp ? [tr('tournament.prizeRank', { rank: fw.rankUp })] : []),
    ...fw.cards.map((c) => tr('tournament.prizeCard', { name: cardName(c.cardId), n: c.count })),
  ];
  return [
    tr('tournament.participation', { n: t.rewards.participationCoins }),
    tr('tournament.firstWin', { rewards: first.join(tr('tournament.prizeSeparator')) }),
    tr('tournament.repeatWin', { n: t.rewards.repeatWin.coins }),
  ];
}

/**
 * 大会会場の受付：受付 → 参加条件・景品 → 対戦 → 結果 → 次戦 → 優勝 → 景品。
 * 進行状況はセーブに保存されるので、途中でやめても次回ここから再開できる。
 */
export const tournamentScreen: ScreenDefinition = {
  id: 'tournament',
  titleKey: 'tournament.title',
  create(ctx) {
    const store = ctx.store;
    const element = h('main', { class: 'screen tournament' });

    const startMatch = once((t: TournamentDefinition, round: number) => {
      const opponent = t.rounds[round];
      if (!opponent) return;
      store.pendingBattle = {
        title: tr('tournament.battleTitle', { name: tournamentName(t), round: roundLabel(t, round) }),
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
        tr('tournament.received', { n: s.coins }),
        ...s.unlockedPacks.map((p) => tr('tournament.packUnlocked', { pack: packLabel(p) })),
        ...(s.rankUp ? [tr('tournament.rankUp', { rank: s.rankUp })] : []),
        ...s.cards.map((c) => tr('tournament.cardGot', { name: cardName(c.cardId), n: c.count })),
      ];
      const handle = openModal(element, {
        title: tr(s.won ? (s.firstWin ? 'tournament.rewardFirst' : 'tournament.rewardWin') : 'tournament.rewardEntry'),
        body: lines.map((t) => h('p', { class: 'modal__text', text: t })),
        actions: [{ label: tr('common.ok'), primary: true, onTap: () => handle.close() }],
        onClose: render,
      });
    });

    const tournamentCard = (t: TournamentDefinition): HTMLElement => {
      const check = entryCheck(store.save, t);
      const record = tournamentRecord(store.save, t.id);
      const join = button(tr('tournament.enter'), () => {
        confirmModal(
          element,
          tr('tournament.enterConfirm', { name: tournamentName(t) }),
          [
            h('p', { class: 'modal__text', text: tr('tournament.enterRule', { n: t.rounds.length, players: t.participants }) }),
            ...prizeLines(t).map((l) => h('p', { class: 'modal__text', text: l })),
            h('p', { class: 'modal__text modal__text--sub', text: tr('tournament.resumeNote') }),
          ],
          tr('tournament.enter'),
          () => {
            store.update((s) => enterTournament(s, t.id, newId('entry')));
            render();
          },
          tr('common.cancel'),
        );
      }, 'btn btn--primary');
      join.disabled = !check.ok;
      return h(
        'div',
        { class: `tournament__item${check.ok ? '' : ' is-locked'}`, dataset: { id: t.id } },
        h('h2', { class: 'tournament__name', text: tr('tournament.nameTemp', { name: tournamentName(t) }) }),
        h('p', { class: 'tournament__desc', text: tournamentDescription(t) }),
        h('p', { class: 'tournament__cond', text: tr('tournament.condition', { rank: t.requiredRank, n: t.rounds.length }) }),
        h('ul', { class: 'tournament__prizes' }, ...prizeLines(t).map((l) => h('li', { text: l }))),
        h('p', {
          class: 'tournament__record',
          text: tr(record.firstWinClaimed ? 'tournament.recordClaimed' : 'tournament.record', { entries: record.entries, wins: record.wins }),
        }),
        check.ok ? null : h('p', { class: 'tournament__ng', text: check.reasons.join(tr('tournament.issueSeparator')) }),
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
          h('div', { class: 'tournament__desk' }, h('div', { class: 'tournament__clerk', text: tr('tournament.clerk'), attrs: { 'aria-hidden': 'true' } }), h('p', { class: 'shop-menu__bubble', text: tr('tournament.welcome', { rank: save.rank }) })),
          ...TOURNAMENTS.map(tournamentCard),
        );
      } else if (active.status === 'inProgress') {
        const opponent = t.rounds[active.round];
        body.push(
          h('h2', { class: 'tournament__name', text: tr('tournament.inProgress', { name: tournamentName(t) }) }),
          h(
            'ol',
            { class: 'tournament__bracket' },
            ...t.rounds.map((r, i) =>
              h(
                'li',
                { class: `tournament__round${i < active.round ? ' is-won' : i === active.round ? ' is-next' : ''}` },
                h('span', { class: 'tournament__round-label', text: roundLabel(t, i) }),
                h('span', { class: 'tournament__round-name', text: opponentName(r) }),
                h('span', { class: 'tournament__round-state', text: i < active.round ? tr('tournament.stateWon') : i === active.round ? tr('tournament.stateNext') : tr('common.none') }),
              ),
            ),
          ),
          opponent
            ? h('p', { class: 'tournament__opponent', text: tr('tournament.opponents', { names: opponent.monsters.map((m) => cardName(getMonster(m))).join(tr('common.listSeparator')) }) })
            : null,
          button(tr('tournament.fight', { round: roundLabel(t, active.round) }), () => startMatch(t, active.round), 'btn btn--primary btn--large'),
          h('p', { class: 'notice', text: tr('tournament.leaveNote') }),
          button(tr('tournament.withdraw'), () => {
            confirmModal(element, tr('tournament.withdrawConfirm'), [h('p', { class: 'modal__text', text: tr('tournament.withdrawText') })], tr('tournament.withdraw'), () => {
              store.update(withdraw);
              render();
            }, tr('common.cancel'));
          }, 'btn btn--ghost'),
        );
      } else {
        const won = active.status === 'won';
        body.push(
          h('div', { class: `tournament__result${won ? ' is-won' : ''}` },
            h('p', { class: 'tournament__result-title', text: tr(won ? 'tournament.won' : 'tournament.lost', { name: tournamentName(t) }) }),
            h('p', { class: 'tournament__result-sub', text: won ? tr('tournament.wonSub') : tr('tournament.lostSub', { round: roundLabel(t, active.round) }) }),
          ),
          button(tr('tournament.claim'), claim, 'btn btn--primary btn--large'),
        );
      }
      element.replaceChildren(
        createScreenHeader({ title: tr('tournament.title'), back: { label: tr('common.back'), onTap: () => ctx.back('world') } }),
        h('div', { class: 'tournament__body' }, ...body),
      );
    };

    render();
    return { element };
  },
};
