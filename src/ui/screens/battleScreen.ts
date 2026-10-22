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
import { describeSkill, STAT_LABEL } from '../../game/cards/cardTypes.ts';
import { buildAutoDeck } from '../../game/deck/deck.ts';
import { randomSeed, shuffle } from '../../game/rng.ts';
import { openCardDetail } from '../components/cardDetail.ts';
import { confirmModal, openModal } from '../components/modal.ts';
import { createMonsterCard } from '../components/monsterCard.ts';
import { createSkillCard } from '../components/skillCard.ts';
import { button, h } from '../dom.ts';
import { once, type BattleRequest } from '../gameStore.ts';
import { sound } from '../sound.ts';
import type { ScreenDefinition } from './types.ts';

/** 相手の1手ごとの間（ミリ秒） */
const AI_STEP_MS = 650;
/** カードを1枚配る間隔（ミリ秒） */
const DEAL_MS = 110;
/** 先攻・後攻のカードをめくってからバトルを始めるまで（ミリ秒） */
const ORDER_REVEAL_MS = 1300;

interface Targeting {
  readonly cardUid: string;
  readonly targets: readonly string[];
  readonly prompt: string;
}

type OrderLabel = '先攻' | '後攻';

/**
 * カードバトル画面。ルールはすべて src/game/battle/engine.ts（純粋関数）に任せ、ここは表示と操作だけ。
 *
 * 流れ：先攻・後攻を決める（伏せたカード2枚から1枚を選ぶ）→ 手札を1枚ずつ配る → 対戦 → 結果
 * 配置（縦持ち）：上＝手番の表示／中＝相手と自分の情報箱＋モンスター3体／中段＝説明文と選んだ技カードの拡大／下＝手札と操作
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
    const seed = randomSeed();

    // 先攻・後攻のカード（並び順はランダム）
    const orderCards: OrderLabel[] = shuffle<OrderLabel>(['先攻', '後攻'], seed ^ 0x5bd1e995).items;
    let orderPicked: number | null = null;

    let state: BattleState | null = null;
    let selectedUid: string | null = null;
    /** 表示済みの手札（新しく来たカードだけを配る演出にする） */
    const shownHand = new Set<string>();
    /** 配っている間は操作と相手の行動を待たせる */
    let busyUntil = 0;
    /** 前回描画時のライフ（ダメージ・回復の演出に使う） */
    const prevLife = new Map<string, number>();
    let targeting: Targeting | null = null;
    let auto = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let destroyed = false;
    const finish = once((winner: BattleState['winner']) => req.onFinish(winner ?? 'draw'));

    const dealing = (): boolean => Date.now() < busyUntil;

    const dispatch = (action: BattleAction): void => {
      if (!state) return;
      const next = applyAction(state, action);
      if (next === state) return;
      state = next;
      targeting = null;
      if (selectedUid && !state.sides.player.hand.some((c) => c.uid === selectedUid)) selectedUid = null;
      render();
    };

    /** 防御できるカードが1枚もないときは、防御の選択を出さずに自動で進める */
    const noDefensePossible = (s: BattleState): boolean =>
      s.phase === 'defense' &&
      s.pending?.attacker === 'opponent' &&
      !s.sides.player.hand.some((c) => cardUsability(s, 'player', c.uid).usable);

    const scheduleAi = (): void => {
      if (timer || destroyed || !state) return;
      const side = actingSide(state);
      if (!side) return;
      const wait = Math.max(0, busyUntil - Date.now());
      if (side === 'player' && !auto) {
        if (!noDefensePossible(state)) {
          // 配り終わったら操作できるように描き直す
          if (wait > 0) timer = setTimeout(() => ((timer = null), render()), wait);
          return;
        }
        timer = setTimeout(() => {
          timer = null;
          if (!destroyed && state && noDefensePossible(state)) dispatch({ type: 'defend', side: 'player', cardUid: null });
        }, AI_STEP_MS + 250 + wait);
        return;
      }
      timer = setTimeout(() => {
        timer = null;
        if (destroyed || !state) return;
        const s = actingSide(state);
        if (!s || (s === 'player' && !auto)) return;
        const action = chooseAction(state, s);
        if (action) dispatch(action);
      }, AI_STEP_MS + wait);
    };

    /* ---------- 先攻・後攻 ---------- */

    const pickOrder = (index: number): void => {
      if (orderPicked !== null) return;
      orderPicked = index;
      sound.play('turnOrderSelect');
      render();
      const first: Side = orderCards[index] === '先攻' ? 'player' : 'opponent';
      setTimeout(() => {
        if (destroyed) return;
        state = createBattle(
          { name: 'あなた', deck: save.deck },
          { name: req.opponent.name, deck: buildAutoDeck(req.opponent.monsters), lifeScale: req.opponent.lifeScale },
          seed,
          first,
        );
        render();
      }, ORDER_REVEAL_MS);
    };

    const orderView = (): HTMLElement => {
      const picked = orderPicked;
      const result = picked === null ? null : orderCards[picked];
      return h(
        'div',
        { class: 'battle-order' },
        h('p', { class: 'battle-order__title', text: picked === null ? '先攻・後攻を決めよう' : `あなたは${result}！` }),
        h('p', { class: 'battle-order__hint', text: picked === null ? '伏せられたカードを1枚選んでください' : result === '先攻' ? 'あなたから始めます' : '相手から始めます' }),
        h(
          'div',
          { class: 'battle-order__cards' },
          ...orderCards.map((label, i) =>
            h(
              'button',
              {
                class: `battle-order__card${picked !== null ? ' is-open' : ''}${picked === i ? ' is-picked' : ''}`,
                attrs: { type: 'button', 'aria-label': picked === null ? `カード${i + 1}` : label },
                dataset: { index: String(i) },
                on: { click: () => pickOrder(i) },
              },
              h('span', { class: 'battle-order__back', attrs: { 'aria-hidden': 'true' } }),
              h('span', { class: `battle-order__face battle-order__face--${label === '先攻' ? 'first' : 'second'}`, text: label }),
            ),
          ),
        ),
        h('p', { class: 'battle-order__vs', text: `VS ${req.opponent.name}` }),
      );
    };

    /* ---------- 操作 ---------- */

    const useCard = (cardUid: string): void => {
      if (!state || dealing()) return;
      const hand = state.sides.player.hand.find((c) => c.uid === cardUid);
      if (!hand || !cardUsability(state, 'player', cardUid).usable) return;
      const skill = getSkill(hand.cardId);
      const targets = targetsFor(state, 'player', skill);
      if (skill.effect.type === 'attack' || skill.effect.type === 'heal') {
        if (targets.length === 1 && targets[0]) {
          dispatch({ type: 'useCard', side: 'player', cardUid, targetUid: targets[0].uid });
          return;
        }
        targeting = {
          cardUid,
          targets: targets.map((t) => t.uid),
          prompt: skill.effect.type === 'attack' ? '攻撃する相手モンスターをタップしてください' : '回復する味方モンスターをタップしてください',
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
      openCardDetail(element, getMonster(monster.cardId), {
        extra: [
          `${SIDE_LABEL[side]}のモンスター`,
          `ライフ ${monster.life}/${monster.maxLife}${monster.acted ? '（このターンは行動済み）' : ''}`,
        ],
      });
    };

    const surrender = (): void => {
      confirmModal(element, '降参しますか？', [h('p', { text: '負けとして扱われます。' })], '降参する', () => {
        if (!state) return;
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

    const infoBox = (s: BattleState, side: Side): HTMLElement => {
      const st = s.sides[side];
      const active = s.active === side && s.phase !== 'ended';
      return h(
        'div',
        { class: `battle-info battle-info--${side}${active ? ' is-active' : ''}` },
        h('span', { class: 'battle-info__tag', text: side === 'player' ? 'あなた' : '相手' }),
        h('span', { class: 'battle-info__name', text: side === 'player' ? 'あなた' : st.name }),
        h(
          'div',
          { class: 'battle-info__mana', attrs: { 'aria-label': `マナ ${st.mana}` } },
          h('span', { class: 'battle-info__mana-label', text: 'マナ' }),
          h('span', { class: 'battle-info__mana-value', text: String(st.mana) }),
        ),
        h(
          'span',
          { class: 'battle-info__pips', attrs: { 'aria-hidden': 'true' } },
          ...Array.from({ length: BATTLE_RULES.maxMana }, (_, i) => h('span', { class: `battle-info__pip${i < st.mana ? ' is-on' : ''}` })),
        ),
        h('span', { class: 'battle-info__count', text: `山札 ×${st.deck.length}` }),
        h('span', { class: 'battle-info__count', text: `手札 ×${st.hand.length}` }),
      );
    };

    const monsterRow = (s: BattleState, side: Side): HTMLElement =>
      h(
        'div',
        { class: `battle-side battle-side--${side}` },
        infoBox(s, side),
        h(
          'div',
          { class: 'battle-side__monsters' },
          ...s.sides[side].monsters.map((m) => {
            const isTarget = targeting?.targets.includes(m.uid) ?? false;
            const before = prevLife.get(m.uid) ?? m.life;
            const diff = m.life - before;
            const isPendingTarget = s.pending?.targetUid === m.uid;
            return h(
              'button',
              {
                class: `battle__monster${isTarget ? ' is-target' : ''}${isPendingTarget ? ' is-attacked' : ''}${m.acted && m.life > 0 ? ' is-acted' : ''}${diff < 0 ? ' is-hit' : ''}`,
                attrs: { type: 'button', 'aria-label': `${getMonster(m.cardId).name} ライフ${m.life}` },
                dataset: { uid: m.uid },
                on: { click: () => tapMonster(side, m) },
              },
              createMonsterCard(getMonster(m.cardId), { width: 74, life: { current: m.life, max: m.maxLife }, showName: false }),
              h('span', { class: 'battle__monster-life', text: String(m.life) }),
              m.acted && m.life > 0 ? h('span', { class: 'battle__acted', text: '行動済' }) : null,
              diff !== 0 ? h('span', { class: `battle__float ${diff < 0 ? 'is-damage' : 'is-heal'}`, text: diff < 0 ? String(diff) : `+${diff}` }) : null,
            );
          }),
        ),
      );

    /** 中段：左に説明文、右に選んだ技カードの拡大 */
    const detailPanel = (s: BattleState): HTMLElement => {
      const hand = selectedUid ? s.sides.player.hand.find((c) => c.uid === selectedUid) : undefined;
      const skill = hand ? getSkill(hand.cardId) : undefined;
      const logs = s.log.slice(-2).map((l) => h('p', { class: 'battle-text__log', text: l.text }));
      let body: (HTMLElement | null)[];
      if (targeting) {
        body = [
          h('p', { class: 'battle-text__prompt', text: targeting.prompt }),
          button('キャンセル', () => {
            targeting = null;
            render();
          }, 'btn btn--small'),
        ];
      } else if (s.phase === 'defense' && s.pending) {
        const p = s.pending;
        body = [
          h('p', {
            class: 'battle-text__prompt',
            text:
              p.attacker === 'opponent'
                ? `相手の「${getSkill(p.cardId).name}」！ ${STAT_LABEL[p.stat]}${p.power}の攻撃${noDefensePossible(s) ? '（防御できるカードなし）' : ''}`
                : `「${getSkill(p.cardId).name}」で攻撃中… 相手の防御を待っています`,
          }),
        ];
      } else if (skill && hand) {
        const usability = cardUsability(s, 'player', hand.uid);
        body = [
          h('p', { class: 'battle-text__name', text: skill.name }),
          h('p', { class: 'battle-text__owner', text: `適合：${getMonster(skill.monsterId).name}` }),
          h('p', { class: 'battle-text__desc', text: describeSkill(skill) }),
          usability.usable
            ? h('p', { class: 'battle-text__ok', text: '使えます' })
            : h('p', { class: 'battle-text__ng', text: usability.reason ?? '使えません' }),
        ];
      } else {
        body = [h('p', { class: 'battle-text__hint', text: '手札のカードをタップすると、ここに説明と拡大したカードが出ます。' })];
      }
      return h(
        'div',
        { class: 'battle-detail' },
        h('div', { class: 'battle-text' }, h('div', { class: 'battle-text__body' }, ...body), h('div', { class: 'battle-text__logs', attrs: { 'aria-live': 'polite' } }, ...logs)),
        h(
          'div',
          { class: 'battle-detail__card' },
          skill ? createSkillCard(skill, { width: 136, showText: true }) : h('div', { class: 'battle-detail__empty', text: 'カード' }),
        ),
      );
    };

    const handRow = (s: BattleState): HTMLElement => {
      const myTurnMain = s.phase === 'main' && s.active === 'player';
      let newIndex = 0;
      const row = h(
        'div',
        { class: 'battle__hand', attrs: { 'aria-label': '手札' } },
        ...s.sides.player.hand.map((c) => {
          const skill = getSkill(c.cardId);
          const usable = cardUsability(s, 'player', c.uid).usable;
          const isNew = !shownHand.has(c.uid);
          const el = h(
            'button',
            {
              class: `battle__hand-card${usable ? ' is-usable' : ''}${!usable && myTurnMain ? ' is-unusable' : ''}${selectedUid === c.uid ? ' is-selected' : ''}${isNew ? ' is-dealt' : ''}`,
              attrs: { type: 'button', 'aria-label': `${skill.name}${usable ? '' : '（使えない）'}` },
              dataset: { uid: c.uid },
              on: {
                click: () => {
                  selectedUid = c.uid;
                  targeting = null;
                  render();
                },
              },
            },
            createSkillCard(skill, { width: 62, showText: false }),
            h('span', { class: 'battle__hand-name', text: skill.name }),
          );
          if (isNew) {
            // 1枚ずつ高速で配る：見た目の遅れと効果音を同じ間隔でずらす
            el.style.animationDelay = `${newIndex * DEAL_MS}ms`;
            sound.play('cardDraw', newIndex * DEAL_MS);
            newIndex++;
            shownHand.add(c.uid);
          }
          return el;
        }),
      );
      if (newIndex > 0) busyUntil = Math.max(busyUntil, Date.now() + newIndex * DEAL_MS + 200);
      return row;
    };

    const defenseOverlay = (s: BattleState): HTMLElement | null => {
      if (auto || s.phase !== 'defense' || !s.pending || s.pending.attacker !== 'opponent') return null;
      if (noDefensePossible(s)) return null;
      const pending = s.pending;
      const target = s.sides.player.monsters.find((m) => m.uid === pending.targetUid);
      const options = s.sides.player.hand.filter((c) => getSkill(c.cardId).effect.type === 'defense');
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
          h('p', { class: 'battle__defense-hint', text: `${STAT_LABEL[pending.stat]}の防御カードでダメージを減らせます（マナ ${s.sides.player.mana}）` }),
          h(
            'div',
            { class: 'battle__defense-cards' },
            ...options.map((c) => {
              const usable = cardUsability(s, 'player', c.uid);
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
            }),
          ),
          button('防御しない', () => dispatch({ type: 'defend', side: 'player', cardUid: null }), 'btn'),
        ),
      );
    };

    const resultOverlay = (s: BattleState): HTMLElement | null => {
      if (s.phase !== 'ended') return null;
      const w = s.winner;
      const title = w === 'player' ? '勝利！' : w === 'opponent' ? '敗北…' : '引き分け';
      const reason = s.endReason === 'turnLimit' ? `手番の上限（${BATTLE_RULES.turnLimit}）で残りライフ判定` : '';
      const go = button('つづける', () => {
        go.disabled = true;
        finish(s.winner);
      }, 'btn btn--primary btn--large');
      return h(
        'div',
        { class: `battle__result battle__result--${w ?? 'draw'}` },
        h(
          'div',
          { class: 'battle__result-panel' },
          h('p', { class: 'battle__result-title', text: title }),
          h('p', { class: 'battle__result-sub', text: `${req.title}・${s.turn}手番` }),
          reason ? h('p', { class: 'battle__result-sub', text: reason }) : null,
          go,
        ),
      );
    };

    const header = (): HTMLElement =>
      h(
        'header',
        { class: 'battle__header' },
        req.allowSurrender ? button('降参', surrender, 'btn btn--ghost btn--small') : h('span'),
        h('h1', { class: 'battle__title', text: req.title }),
        button('ルール', showRules, 'btn btn--ghost btn--small'),
      );

    const qaBar = (): HTMLElement | null =>
      ctx.store.qa && state
        ? h(
            'div',
            { class: 'battle__qa' },
            button(auto ? 'QA:オート停止' : 'QA:オート', () => {
              auto = !auto;
              render();
            }, 'btn btn--small'),
            button('QA:即勝利', () => {
              if (!state) return;
              state = { ...state, phase: 'ended', winner: 'player', endReason: 'knockout' };
              render();
            }, 'btn btn--small'),
          )
        : null;

    const render = (): void => {
      element.dataset.stage = state ? 'play' : 'order';
      if (!state) {
        element.replaceChildren(header(), orderView());
        return;
      }
      const s = state;
      const handScroll = element.querySelector('.battle__hand')?.scrollLeft ?? 0;
      const hand = handRow(s);
      const blocked = dealing();
      const myTurn = s.phase === 'main' && s.active === 'player' && !auto && !blocked;
      const selected = selectedUid ? s.sides.player.hand.find((c) => c.uid === selectedUid) : undefined;
      const useBtn = button('使う', () => selected && useCard(selected.uid), 'btn btn--primary');
      useBtn.disabled = !myTurn || !selected || !cardUsability(s, 'player', selected.uid).usable || targeting !== null;
      const discardBtn = button(`捨ててマナ+${BATTLE_RULES.discardManaGain}`, () => {
        if (selected) dispatch({ type: 'discardForMana', side: 'player', cardUid: selected.uid });
      }, 'btn');
      discardBtn.disabled = !myTurn || !selected || !canDiscardForMana(s, 'player');
      const endBtn = button('ターン終了', () => dispatch({ type: 'endTurn', side: 'player' }), 'btn');
      endBtn.disabled = !myTurn;

      const turnText =
        s.phase === 'ended' ? '対戦終了' : `${s.turn}手番・${s.active === 'player' ? 'あなたの番' : '相手の番'}`;
      element.replaceChildren(
        header(),
        qaBar() ?? '',
        h(
          'div',
          { class: `battle-turn battle-turn--${s.phase === 'ended' ? 'ended' : s.active}` },
          h('span', { class: 'battle-turn__text', text: turnText }),
          h('span', { class: 'battle-turn__first', text: s.first === 'player' ? 'あなたが先攻' : 'あなたが後攻' }),
        ),
        monsterRow(s, 'opponent'),
        monsterRow(s, 'player'),
        detailPanel(s),
        hand,
        h('footer', { class: 'battle__footer' }, useBtn, discardBtn, endBtn),
      );
      const overlays = [defenseOverlay(s), resultOverlay(s)].filter((o): o is HTMLElement => o !== null);
      element.append(...overlays);
      const handEl = element.querySelector('.battle__hand');
      if (handEl) handEl.scrollLeft = handScroll;
      for (const side of ['player', 'opponent'] as const) {
        for (const m of s.sides[side].monsters) prevLife.set(m.uid, m.life);
      }
      element.dataset.phase = s.phase;
      element.dataset.active = s.active;
      element.dataset.acting = blocked ? 'dealing' : (actingSide(s) ?? 'none');
      element.dataset.winner = s.winner ?? '';
      element.dataset.first = s.first;
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
