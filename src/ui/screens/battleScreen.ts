import { getMonster, getSkill } from '../../data/cards.ts';
import { BATTLE_RULES, PROVISIONAL_RULE_NOTES } from '../../data/rules.ts';
import { chooseAction } from '../../game/battle/ai.ts';
import {
  actingSide,
  applyAction,
  canDiscardForMana,
  cardUsability,
  createBattle,
  SIDE_LABEL,
  targetsFor,
  type BattleAction,
  type BattleMonster,
  type BattleState,
  type Side,
} from '../../game/battle/engine.ts';
import { STAT_LABEL } from '../../game/cards/cardTypes.ts';
import { buildAutoDeck } from '../../game/deck/deck.ts';
import { randomSeed } from '../../game/rng.ts';
import { openCardDetail } from '../components/cardDetail.ts';
import { confirmModal, openModal } from '../components/modal.ts';
import { createMonsterCard } from '../components/monsterCard.ts';
import { createSkillCard, skillShortText } from '../components/skillCard.ts';
import { button, h } from '../dom.ts';
import { once, type BattleRequest } from '../gameStore.ts';
import type { ScreenDefinition } from './types.ts';

/** 相手の1手ごとの間（ミリ秒） */
const AI_STEP_MS = 650;

interface Targeting {
  readonly cardUid: string;
  readonly targets: readonly string[];
  readonly prompt: string;
}

/**
 * カードバトル画面。ルールはすべて src/game/battle/engine.ts（純粋関数）に任せ、ここは表示と操作だけ。
 * - 手札をタップ → 拡大表示（効果・使用可否）→「使う」→ 必要なら対象を選ぶ
 * - 相手の攻撃を受けると防御の選択が出る
 */
export const battleScreen: ScreenDefinition = {
  id: 'battle',
  title: 'カードバトル',
  create(ctx) {
    const request = ctx.store.pendingBattle;
    const element = h('main', { class: 'screen battle' });
    if (!request) {
      element.append(
        h('p', { class: 'battle__missing', text: '対戦の情報がありません。' }),
        button('戻る', () => ctx.reset('world'), 'btn btn--primary'),
      );
      return { element };
    }
    ctx.store.pendingBattle = null;
    const req: BattleRequest = request;
    const save = ctx.store.save;

    let state: BattleState = createBattle(
      { name: 'あなた', deck: save.deck },
      { name: req.opponent.name, deck: buildAutoDeck(req.opponent.monsters), lifeScale: req.opponent.lifeScale },
      randomSeed(),
    );
    let previewUid: string | null = null;
    /** 前回描画時のライフ（ダメージ・回復の演出に使う） */
    const prevLife = new Map<string, number>();
    let targeting: Targeting | null = null;
    let auto = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let destroyed = false;
    const finish = once((winner: BattleState['winner']) => req.onFinish(winner ?? 'draw'));

    const dispatch = (action: BattleAction): void => {
      const next = applyAction(state, action);
      if (next === state) return;
      state = next;
      previewUid = null;
      targeting = null;
      render();
    };

    /** 防御できるカードが1枚もないときは、防御の選択を出さずに自動で進める */
    const noDefensePossible = (): boolean =>
      state.phase === 'defense' &&
      state.pending?.attacker === 'opponent' &&
      !state.sides.player.hand.some((c) => cardUsability(state, 'player', c.uid).usable);

    const scheduleAi = (): void => {
      if (timer || destroyed) return;
      const side = actingSide(state);
      if (!side) return;
      if (side === 'player' && !auto) {
        if (!noDefensePossible()) return;
        timer = setTimeout(() => {
          timer = null;
          if (!destroyed && noDefensePossible()) dispatch({ type: 'defend', side: 'player', cardUid: null });
        }, AI_STEP_MS + 250);
        return;
      }
      timer = setTimeout(() => {
        timer = null;
        if (destroyed) return;
        const s = actingSide(state);
        if (!s || (s === 'player' && !auto)) return;
        const action = chooseAction(state, s);
        if (action) dispatch(action);
      }, AI_STEP_MS);
    };

    /* ---------- 操作 ---------- */

    const useCard = (cardUid: string): void => {
      const hand = state.sides.player.hand.find((c) => c.uid === cardUid);
      if (!hand || !cardUsability(state, 'player', cardUid).usable) return;
      const skill = getSkill(hand.cardId);
      const targets = targetsFor(state, 'player', skill);
      if (skill.effect.type === 'attack' || skill.effect.type === 'heal') {
        if (targets.length === 1 && targets[0]) {
          dispatch({ type: 'useCard', side: 'player', cardUid, targetUid: targets[0].uid });
          return;
        }
        previewUid = null;
        targeting = {
          cardUid,
          targets: targets.map((t) => t.uid),
          prompt: skill.effect.type === 'attack' ? '攻撃する相手モンスターをタップ' : '回復する味方モンスターをタップ',
        };
        render();
        return;
      }
      dispatch({ type: 'useCard', side: 'player', cardUid });
    };

    const tapMonster = (side: Side, monster: BattleMonster): void => {
      if (targeting && targeting.targets.includes(monster.uid)) {
        dispatch({ type: 'useCard', side: 'player', cardUid: targeting.cardUid, targetUid: monster.uid });
        return;
      }
      const card = getMonster(monster.cardId);
      openCardDetail(element, card, {
        extra: [
          `${SIDE_LABEL[side]}のモンスター`,
          `ライフ ${monster.life}/${monster.maxLife}${monster.acted ? '（このターンは行動済み）' : ''}`,
        ],
      });
    };

    const surrender = (): void => {
      confirmModal(element, '降参しますか？', [h('p', { text: '負けとして扱われます。' })], '降参する', () => {
        state = { ...state, phase: 'ended', winner: 'opponent', endReason: 'knockout' };
        render();
      });
    };

    const showRules = (): void => {
      const handle = openModal(element, {
        title: 'ルール（仮）',
        body: [
          h('p', { class: 'modal__text', text: '正式なルール資料が未着手のため、以下は仮のルールです。' }),
          h('ul', { class: 'rule-list' }, ...PROVISIONAL_RULE_NOTES.map((t) => h('li', { text: t }))),
        ],
        actions: [{ label: '閉じる', primary: true, onTap: () => handle.close() }],
      });
    };

    /* ---------- 表示 ---------- */

    const monsterRow = (side: Side): HTMLElement =>
      h(
        'div',
        { class: `battle__monsters battle__monsters--${side}` },
        ...state.sides[side].monsters.map((m) => {
          const isTarget = targeting?.targets.includes(m.uid) ?? false;
          const before = prevLife.get(m.uid) ?? m.life;
          const diff = m.life - before;
          const isPendingTarget = state.pending?.targetUid === m.uid;
          const view = createMonsterCard(getMonster(m.cardId), { width: 104, life: { current: m.life, max: m.maxLife } });
          return h(
            'button',
            {
              class: `battle__monster${isTarget ? ' is-target' : ''}${isPendingTarget ? ' is-attacked' : ''}${m.acted && m.life > 0 ? ' is-acted' : ''}${diff < 0 ? ' is-hit' : ''}`,
              attrs: { type: 'button', 'aria-label': `${getMonster(m.cardId).name} ライフ${m.life}` },
              dataset: { uid: m.uid },
              on: { click: () => tapMonster(side, m) },
            },
            view,
            m.acted && m.life > 0 ? h('span', { class: 'battle__acted', text: '行動済' }) : null,
            diff !== 0 ? h('span', { class: `battle__float ${diff < 0 ? 'is-damage' : 'is-heal'}`, text: diff < 0 ? String(diff) : `+${diff}` }) : null,
          );
        }),
      );

    const manaView = (side: Side): HTMLElement => {
      const mana = state.sides[side].mana;
      return h(
        'div',
        { class: 'battle-mana', attrs: { 'aria-label': `マナ ${mana}` } },
        h('span', { class: 'battle-mana__label', text: 'マナ' }),
        h(
          'span',
          { class: 'battle-mana__pips' },
          ...Array.from({ length: BATTLE_RULES.maxMana }, (_, i) => h('span', { class: `battle-mana__pip${i < mana ? ' is-on' : ''}` })),
        ),
        h('span', { class: 'battle-mana__value', text: String(mana) }),
      );
    };

    const sideBar = (side: Side): HTMLElement => {
      const s = state.sides[side];
      return h(
        'div',
        { class: `battle__bar battle__bar--${side}${state.active === side && state.phase !== 'ended' ? ' is-active' : ''}` },
        h('span', { class: 'battle__bar-name', text: side === 'player' ? 'あなた' : s.name }),
        h('span', { class: 'battle__bar-info', text: `山札${s.deck.length}・手札${s.hand.length}` }),
        manaView(side),
      );
    };

    const centerPanel = (): HTMLElement => {
      const lastLogs = state.log.slice(-2).map((l) => h('p', { class: 'battle__log-line', text: l.text }));
      let main: HTMLElement;
      if (targeting) {
        main = h(
          'div',
          { class: 'battle__prompt' },
          h('p', { class: 'battle__prompt-text', text: targeting.prompt }),
          button('キャンセル', () => {
            targeting = null;
            render();
          }, 'btn btn--small'),
        );
      } else if (state.phase === 'defense' && state.pending) {
        const p = state.pending;
        const attackerCard = getSkill(p.cardId);
        main = h(
          'div',
          { class: 'battle__prompt' },
          h('p', {
            class: 'battle__prompt-text',
            text:
              p.attacker === 'opponent'
                ? `相手の「${attackerCard.name}」！ ${STAT_LABEL[p.stat]}${p.power}の攻撃${noDefensePossible() ? '（防御できるカードなし）' : ''}`
                : `「${attackerCard.name}」で攻撃中… 相手の防御を待っています`,
          }),
        );
      } else {
        const turnText = state.phase === 'ended' ? '対戦終了' : state.active === 'player' ? 'あなたのターン' : '相手のターン';
        main = h('p', { class: `battle__turn battle__turn--${state.active}`, text: turnText });
      }
      return h('div', { class: 'battle__center' }, main, h('div', { class: 'battle__log', attrs: { 'aria-live': 'polite' } }, ...lastLogs));
    };

    const handRow = (): HTMLElement => {
      const myTurnMain = state.phase === 'main' && state.active === 'player';
      return h(
        'div',
        { class: 'battle__hand', attrs: { 'aria-label': '手札' } },
        ...state.sides.player.hand.map((c) => {
          const skill = getSkill(c.cardId);
          const usable = cardUsability(state, 'player', c.uid).usable;
          return h(
            'button',
            {
              class: `battle__hand-card${usable ? ' is-usable' : ''}${!usable && myTurnMain ? ' is-unusable' : ''}${previewUid === c.uid ? ' is-selected' : ''}`,
              attrs: { type: 'button', 'aria-label': `${skill.name}${usable ? '' : '（使えない）'}` },
              dataset: { uid: c.uid },
              on: {
                click: () => {
                  previewUid = c.uid;
                  targeting = null;
                  render();
                },
              },
            },
            createSkillCard(skill, { width: 62, showText: false }),
            h('span', { class: 'battle__hand-name', text: skill.name }),
          );
        }),
      );
    };

    const previewOverlay = (): HTMLElement | null => {
      if (!previewUid) return null;
      const hand = state.sides.player.hand.find((c) => c.uid === previewUid);
      if (!hand) return null;
      const skill = getSkill(hand.cardId);
      const usability = cardUsability(state, 'player', hand.uid);
      const uid = hand.uid;
      const useBtn = button('使う', () => useCard(uid), 'btn btn--primary');
      useBtn.disabled = !usability.usable || state.phase !== 'main';
      const discardBtn = button(
        `捨ててマナ+${BATTLE_RULES.discardManaGain}`,
        () => dispatch({ type: 'discardForMana', side: 'player', cardUid: uid }),
        'btn',
      );
      discardBtn.disabled = !canDiscardForMana(state, 'player');
      return h(
        'div',
        {
          class: 'battle__preview',
          on: {
            click: () => {
              previewUid = null;
              render();
            },
          },
        },
        h(
          'div',
          { class: 'battle__preview-panel', on: { click: (e) => e.stopPropagation() } },
          createSkillCard(skill, { width: 150, showText: true }),
          h(
            'div',
            { class: 'battle__preview-info' },
            h('p', { class: 'battle__preview-name', text: skill.name }),
            h('p', { class: 'battle__preview-owner', text: `適合：${getMonster(skill.monsterId).name}` }),
            h('p', { class: 'battle__preview-text', text: skillShortText(skill) }),
            usability.usable
              ? h('p', { class: 'battle__preview-ok', text: '使えます' })
              : h('p', { class: 'battle__preview-ng', text: usability.reason ?? '使えません' }),
            h('div', { class: 'battle__preview-actions' }, useBtn, discardBtn, button('閉じる', () => {
              previewUid = null;
              render();
            }, 'btn')),
          ),
        ),
      );
    };

    const defenseOverlay = (): HTMLElement | null => {
      if (auto || state.phase !== 'defense' || !state.pending || state.pending.attacker !== 'opponent') return null;
      if (noDefensePossible()) return null;
      const pending = state.pending;
      const target = state.sides.player.monsters.find((m) => m.uid === pending.targetUid);
      const options = state.sides.player.hand.filter((c) => getSkill(c.cardId).effect.type === 'defense');
      return h(
        'div',
        { class: 'battle__defense' },
        h(
          'div',
          { class: 'battle__defense-panel' },
          h('p', { class: 'battle__defense-title', text: '相手の攻撃！' }),
          h('p', {
            class: 'battle__defense-text',
            text: `「${getSkill(pending.cardId).name}」→ ${target ? getMonster(target.cardId).name : ''}に ${STAT_LABEL[pending.stat]}${pending.power}`,
          }),
          h('p', { class: 'battle__defense-hint', text: `${STAT_LABEL[pending.stat]}の防御カードでダメージを減らせます（マナ ${state.sides.player.mana}）` }),
          h(
            'div',
            { class: 'battle__defense-cards' },
            ...(options.length === 0
              ? [h('p', { class: 'battle__defense-none', text: '手札に防御カードがありません' })]
              : options.map((c) => {
                  const usable = cardUsability(state, 'player', c.uid);
                  const skill = getSkill(c.cardId);
                  const b = h(
                    'button',
                    {
                      class: `battle__defense-card${usable.usable ? '' : ' is-unusable'}`,
                      attrs: { type: 'button', 'aria-label': `${skill.name}で防御` },
                      on: { click: () => dispatch({ type: 'defend', side: 'player', cardUid: c.uid }) },
                    },
                    createSkillCard(skill, { width: 70, showText: false }),
                    h('span', { class: 'battle__defense-label', text: usable.usable ? `-${skill.stat.value}` : (usable.reason ?? '') }),
                  );
                  b.disabled = !usable.usable;
                  return b;
                })),
          ),
          button('防御しない', () => dispatch({ type: 'defend', side: 'player', cardUid: null }), 'btn'),
        ),
      );
    };

    const resultOverlay = (): HTMLElement | null => {
      if (state.phase !== 'ended') return null;
      const w = state.winner;
      const title = w === 'player' ? '勝利！' : w === 'opponent' ? '敗北…' : '引き分け';
      const reason = state.endReason === 'turnLimit' ? `手番の上限（${BATTLE_RULES.turnLimit}）で残りライフ判定` : '';
      const go = button('つづける', () => {
        go.disabled = true;
        finish(state.winner);
      }, 'btn btn--primary btn--large');
      return h(
        'div',
        { class: `battle__result battle__result--${w ?? 'draw'}` },
        h(
          'div',
          { class: 'battle__result-panel' },
          h('p', { class: 'battle__result-title', text: title }),
          h('p', { class: 'battle__result-sub', text: `${req.title}・${state.turn}手番` }),
          reason ? h('p', { class: 'battle__result-sub', text: reason }) : null,
          go,
        ),
      );
    };

    const render = (): void => {
      const handScroll = element.querySelector('.battle__hand')?.scrollLeft ?? 0;
      const myTurn = state.phase === 'main' && state.active === 'player';
      const endBtn = button('ターン終了', () => dispatch({ type: 'endTurn', side: 'player' }), 'btn btn--primary');
      endBtn.disabled = !myTurn || auto;
      const headerRight = h('div', { class: 'battle__header-right' }, h('span', { class: 'battle__turn-no', text: `${state.turn}手番` }));
      const header = h(
        'header',
        { class: 'battle__header' },
        req.allowSurrender ? button('降参', surrender, 'btn btn--ghost btn--small') : h('span'),
        h('h1', { class: 'battle__title', text: req.title }),
        headerRight,
      );
      const qaBar = ctx.store.qa
        ? h(
            'div',
            { class: 'battle__qa' },
            button(auto ? 'QA:オート停止' : 'QA:オート', () => {
              auto = !auto;
              render();
            }, 'btn btn--small'),
            button('QA:即勝利', () => {
              state = { ...state, phase: 'ended', winner: 'player', endReason: 'knockout' };
              render();
            }, 'btn btn--small'),
          )
        : null;

      element.replaceChildren(
        header,
        qaBar ?? '',
        sideBar('opponent'),
        monsterRow('opponent'),
        centerPanel(),
        monsterRow('player'),
        sideBar('player'),
        handRow(),
        h(
          'footer',
          { class: 'battle__footer' },
          button('ルール（仮）', showRules, 'btn btn--small btn--ghost'),
          endBtn,
        ),
      );
      const overlays = [previewOverlay(), defenseOverlay(), resultOverlay()].filter((o): o is HTMLElement => o !== null);
      element.append(...overlays);
      const hand = element.querySelector('.battle__hand');
      if (hand) hand.scrollLeft = handScroll;
      for (const side of ['player', 'opponent'] as const) {
        for (const m of state.sides[side].monsters) prevLife.set(m.uid, m.life);
      }
      element.dataset.phase = state.phase;
      element.dataset.active = state.active;
      element.dataset.acting = actingSide(state) ?? 'none';
      element.dataset.winner = state.winner ?? '';
      scheduleAi();
    };

    render();
    return {
      element,
      destroy: () => {
        destroyed = true;
        if (timer) clearTimeout(timer);
      },
    };
  },
};

