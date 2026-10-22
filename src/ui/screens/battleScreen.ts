import { getMonster, getPlayCard, getSkill, getSupport } from '../../data/cards.ts';
import { PROVISIONAL_RULE_NOTES } from '../../data/rules.ts';
import { chooseAction } from '../../game/battle/ai.ts';
import {
  actingSide,
  applyAction,
  canConvertToMana,
  cardUsability,
  createBattle,
  manaOf,
  pendingDamage,
  SIDE_LABEL,
  supportUsesLeft,
  targetsFor,
  type BattleAction,
  type BattleMonster,
  type BattleState,
  type Side,
} from '../../game/battle/engine.ts';
import { describePlayCard, STAT_LABEL, supportShortText } from '../../game/cards/cardTypes.ts';
import { buildAutoDeck } from '../../game/deck/deck.ts';
import { randomSeed, shuffle } from '../../game/rng.ts';
import { openCardDetail } from '../components/cardDetail.ts';
import { confirmModal, openModal } from '../components/modal.ts';
import wineButtonUrl from '@assets/images/ui/button/btn_command_blank_wine.png';
import { commandButton, confirmCommand } from '../components/commandButton.ts';
import { createMonsterCard } from '../components/monsterCard.ts';
import { createPlayCard, createSkillCard } from '../components/skillCard.ts';
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
/** マナにするカードが情報箱へ飛んでいく時間（ミリ秒） */
const MANA_FLY_MS = 380;
/** 場面の表示（あなたのターン・マナ化など）が出ている時間（ミリ秒） */
const BANNER_MS = 1100;

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
    /** 前回描画時のマナ（マナが増えた演出に使う） */
    const prevMana = new Map<Side, number>();
    /** マナ化で選んだ手札（まとめてマナにする） */
    const manaPicks = new Set<string>();
    /** 最後に出した場面の表示（同じ表示を繰り返さない） */
    let bannerKey = '';
    /** 前回出したコマンド（同じなら出てくる動きをつけない） */
    let lastCommandKey = '';
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

    /** いまの画面の拡大率（ステージは拡大縮小されているので、位置の計算に使う） */
    const stageScale = (): number => {
      const w = element.offsetWidth;
      return w > 0 ? element.getBoundingClientRect().width / w : 1;
    };

    /** 選んだ手札をまとめてマナにする：カードが情報箱へ飛んでいき、着いたらマナが増える */
    const convertPicked = (): void => {
      if (!state || dealing() || manaPicks.size === 0) return;
      const picks = state.sides.player.hand.filter((c) => manaPicks.has(c.uid)).map((c) => c.uid);
      const goal = element.querySelector('.battle-info--player .battle-info__mana');
      const root = element.getBoundingClientRect();
      const scale = stageScale();
      if (goal) {
        const g = goal.getBoundingClientRect();
        for (const uid of picks) {
          const from = element.querySelector(`.battle__hand-card[data-uid="${uid}"] .skill-card`);
          if (!from) continue;
          const r = from.getBoundingClientRect();
          const fly = from.cloneNode(true) as HTMLElement;
          fly.classList.add('battle__mana-fly');
          fly.style.left = `${(r.left - root.left) / scale}px`;
          fly.style.top = `${(r.top - root.top) / scale}px`;
          fly.style.setProperty('--dx', `${(g.left + g.width / 2 - (r.left + r.width / 2)) / scale}px`);
          fly.style.setProperty('--dy', `${(g.top + g.height / 2 - (r.top + r.height / 2)) / scale}px`);
          element.append(fly);
          setTimeout(() => fly.remove(), MANA_FLY_MS + 50);
          element.querySelector(`.battle__hand-card[data-uid="${uid}"]`)?.classList.add('is-leaving');
        }
      }
      busyUntil = Math.max(busyUntil, Date.now() + MANA_FLY_MS);
      setTimeout(() => {
        if (destroyed || !state) return;
        let next = state;
        for (const uid of picks) next = applyAction(next, { type: 'convertToMana', side: 'player', cardUid: uid });
        manaPicks.clear();
        selectedUid = null;
        state = next;
        render();
      }, MANA_FLY_MS);
    };

    /** マナ化で手札をタップ：マナにする候補に入れる／外す（最初のターンは決まった枚数まで） */
    const toggleManaPick = (uid: string): void => {
      if (!state) return;
      if (manaPicks.has(uid)) manaPicks.delete(uid);
      else {
        const limit = state.manaConvertLimit;
        if (limit !== null && manaPicks.size >= limit) return;
        manaPicks.add(uid);
      }
    };

    /** 守備に使えるカードが1枚もないときは、守備の選択を出さずに自動で進める */
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
      const card = getPlayCard(hand.cardId);
      const targets = targetsFor(state, 'player', card);
      if (card.effect.type === 'attack' || card.effect.type === 'heal') {
        if (targets.length === 1 && targets[0]) {
          dispatch({ type: 'useCard', side: 'player', cardUid, targetUid: targets[0].uid });
          return;
        }
        targeting = {
          cardUid,
          targets: targets.map((t) => t.uid),
          prompt: card.effect.type === 'attack' ? '攻撃する相手モンスターをタップしてください' : '回復する味方モンスターをタップしてください',
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
          { class: 'battle-info__mana', attrs: { 'aria-label': `マナ ${manaOf(st)}` } },
          h('span', { class: 'battle-info__mana-label', text: 'マナ' }),
          h('span', { class: 'battle-info__mana-value', text: String(manaOf(st)) }),
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
            // 守備待ちの攻撃の対象には、いまのダメージ予定を出す（PS版の対象表示）
            const incoming = isPendingTarget && s.phase === 'defense' && s.pending ? pendingDamage(s.pending) : null;
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
              incoming !== null ? h('span', { class: 'battle__incoming', text: String(incoming) }) : null,
              diff < 0 ? h('span', { class: 'battle__burst', attrs: { 'aria-hidden': 'true' } }) : null,
              diff !== 0 ? h('span', { class: `battle__float ${diff < 0 ? 'is-damage' : 'is-heal'}`, text: diff < 0 ? String(diff) : `+${diff}` }) : null,
            );
          }),
        ),
      );

    /** 中段：左に説明文、右に選んだ技カードの拡大 */
    const detailPanel = (s: BattleState): HTMLElement => {
      const hand = selectedUid ? s.sides.player.hand.find((c) => c.uid === selectedUid) : undefined;
      const card = hand ? getPlayCard(hand.cardId) : undefined;
      const logs = s.log.slice(-2).map((l) => h('p', { class: 'battle-text__log', text: l.text }));
      let body: (HTMLElement | null)[];
      if (targeting) {
        body = [h('p', { class: 'battle-text__prompt', text: targeting.prompt })];
      } else if (s.phase === 'defense' && s.pending) {
        const p = s.pending;
        body = [
          h('p', {
            class: 'battle-text__prompt',
            text:
              p.attacker === 'opponent'
                ? `相手の「${getSkill(p.cardId).name}」！ ${STAT_LABEL[p.stat]}${p.power}の攻撃${noDefensePossible(s) ? '（守備できるカードなし）' : ''}`
                : `「${getSkill(p.cardId).name}」で攻撃中… 相手の守備を待っています（いまのダメージ ${pendingDamage(p)}）`,
          }),
        ];
      } else if (s.phase === 'mana' && s.active === 'player') {
        // マナ化：手札をタップして候補を選び、「マナにする」でまとめてマナに
        const limit = s.manaConvertLimit;
        body = [
          h('p', {
            class: 'battle-text__prompt',
            text:
              limit === null
                ? 'マナ化：マナにするカードをタップして選び（何枚でも・1枚＝1マナ）、「マナにする」。終わったら「ターン終了」'
                : limit > 0
                  ? `最初のターンはマナ化だけ。あと${limit}枚まで選んで「マナにする」。終わったら「ターン終了」`
                  : '最初のターンにマナにできる枚数に達しました。「ターン終了」を押してください',
          }),
          h('p', { class: 'battle-text__ok', text: `選んだカード ${manaPicks.size}枚` }),
          card ? h('p', { class: 'battle-text__desc', text: `${card.name}：${describePlayCard(card)}` }) : null,
        ];
      } else if (card && hand) {
        const usability = cardUsability(s, 'player', hand.uid);
        const owner =
          card.kind === 'skill'
            ? `適合：${getMonster(card.monsterId).name}`
            : card.duration === 'field'
              ? 'サポート（全体・場に残る）'
              : `サポート（このターンあと${supportUsesLeft(s, 'player', card) ?? '-'}回）`;
        body = [
          h('p', { class: 'battle-text__name', text: card.name }),
          h('p', { class: 'battle-text__owner', text: owner }),
          h('p', { class: 'battle-text__desc', text: describePlayCard(card) }),
          usability.usable
            ? h('p', { class: 'battle-text__ok', text: '使えます' })
            : h('p', { class: 'battle-text__ng', text: usability.reason ?? '使えません' }),
        ];
      } else {
        body = [
          h('p', {
            class: 'battle-text__hint',
            text:
              s.phase === 'main' && s.active === 'player'
                ? '手札のカードをタップすると、説明と「使う」が出ます。攻撃を終えるときは右上の「攻撃終了」'
                : '手札のカードをタップすると、ここに説明と拡大したカードが出ます。',
          }),
        ];
      }
      return h(
        'div',
        { class: 'battle-detail' },
        h('div', { class: 'battle-text' }, h('div', { class: 'battle-text__body' }, ...body), h('div', { class: 'battle-text__logs', attrs: { 'aria-live': 'polite' } }, ...logs)),
        h(
          'div',
          { class: 'battle-detail__card' },
          card ? createPlayCard(card, { width: 136, showText: true }) : h('div', { class: 'battle-detail__empty', text: 'カード' }),
        ),
      );
    };

    const handRow = (s: BattleState): HTMLElement => {
      const myTurnMain = s.phase === 'main' && s.active === 'player';
      const myMana = s.phase === 'mana' && s.active === 'player' && !auto;
      let newIndex = 0;
      const row = h(
        'div',
        { class: 'battle__hand', attrs: { 'aria-label': '手札' } },
        ...s.sides.player.hand.map((c) => {
          const card = getPlayCard(c.cardId);
          const usable = cardUsability(s, 'player', c.uid).usable;
          const isNew = !shownHand.has(c.uid);
          const picked = myMana && manaPicks.has(c.uid);
          const el = h(
            'button',
            {
              class: `battle__hand-card${usable ? ' is-usable' : ''}${!usable && myTurnMain ? ' is-unusable' : ''}${selectedUid === c.uid ? ' is-selected' : ''}${picked ? ' is-picked' : ''}${isNew ? ' is-dealt' : ''}`,
              attrs: {
                type: 'button',
                'aria-label': `${card.name}${picked ? '（マナにする）' : usable ? '' : '（使えない）'}`,
                ...(myMana ? { 'aria-pressed': String(picked) } : {}),
              },
              dataset: { uid: c.uid },
              on: {
                click: () => {
                  selectedUid = c.uid;
                  targeting = null;
                  if (myMana && !dealing()) toggleManaPick(c.uid);
                  render();
                },
              },
            },
            createPlayCard(card, { width: 62, showText: false }),
            h('span', { class: 'battle__hand-name', text: card.name }),
            picked ? h('span', { class: 'battle__hand-mana', text: 'マナ' }) : null,
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
      // 守備に使えるのは狙われたモンスターのカードだけなので、そのカードだけ並べる
      const options = s.sides.player.hand.filter((c) => {
        const card = getPlayCard(c.cardId);
        return card.kind === 'skill' && ['defense', 'evade'].includes(card.effect.type) && card.monsterId === target?.cardId;
      });
      const used = pending.responses.map((id) => getSkill(id).name).join('・');
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
          h('p', {
            class: 'battle__defense-hint',
            text: `狙われたモンスターの${STAT_LABEL[pending.stat]}の防御・回避カードを何枚でも使えます（マナ ${manaOf(s.sides.player)}）`,
          }),
          h('p', {
            class: 'battle__defense-hint',
            text: `いまのダメージ ${pendingDamage(pending)}${used ? `（使った守備：${used}）` : ''}`,
          }),
          h(
            'div',
            { class: 'battle__defense-cards' },
            ...options.map((c) => {
              const usable = cardUsability(s, 'player', c.uid);
              const skill = getSkill(c.cardId);
              const label = skill.effect.type === 'evade' ? '回避' : `-${skill.stat.value}`;
              const b = h(
                'button',
                {
                  class: `battle__defense-card${usable.usable ? '' : ' is-unusable'}`,
                  attrs: { type: 'button', 'aria-label': `${skill.name}で守備` },
                  on: { click: () => dispatch({ type: 'defend', side: 'player', cardUid: c.uid }) },
                },
                createSkillCard(skill, { width: 70, showText: false }),
                h('span', { class: 'battle__defense-label', text: usable.usable ? label : (usable.reason ?? '') }),
              );
              b.disabled = !usable.usable;
              return b;
            }),
          ),
          (() => {
            const end = commandButton(
              pending.responses.length === 0 ? '守備しない' : '守備を終える',
              () => dispatch({ type: 'defend', side: 'player', cardUid: null }),
              'cancel',
            );
            end.classList.add('battle__defense-end');
            return end;
          })(),
        ),
      );
    };

    const resultOverlay = (s: BattleState): HTMLElement | null => {
      if (s.phase !== 'ended') return null;
      const w = s.winner;
      const title = w === 'player' ? '勝利！' : w === 'opponent' ? '敗北…' : '引き分け';
      const reason = s.endReason === 'deckOut' ? `${w === 'player' ? '相手' : 'あなた'}の山札切れ` : '';
      const go = commandButton('つづける', () => {
        go.disabled = true;
        finish(s.winner);
      });
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

    /** 場面の表示（あなたのターン・マナ化など）。場面が変わったときだけ短く出す */
    const phaseBanner = (s: BattleState): HTMLElement | null => {
      if (s.phase === 'ended' || s.phase === 'defense') return null;
      const key = `${s.turn}-${s.active}-${s.phase}`;
      if (key === bannerKey) return null;
      bannerKey = key;
      const who = s.active === 'player' ? 'あなた' : '相手';
      const sub =
        s.manaConvertLimit !== null ? `先攻1ターン目：マナ化だけ（${s.manaConvertLimit}枚まで）` : s.phase === 'mana' ? 'マナ化' : 'ドロー → 攻撃';
      const el = h(
        'div',
        { class: `battle__banner battle__banner--${s.active}`, attrs: { 'aria-hidden': 'true' } },
        h('span', { class: 'battle__banner-main', text: s.phase === 'mana' && s.manaConvertLimit === null ? `${who}のマナ化` : `${who}のターン` }),
        h('span', { class: 'battle__banner-sub', text: sub }),
      );
      setTimeout(() => el.remove(), BANNER_MS);
      return el;
    };

    /** 場の全体カード（上の帯の右に出す。タップで詳しく） */
    const fieldChip = (s: BattleState): HTMLElement => {
      if (!s.field) return h('span', { class: 'battle-turn__first', text: s.first === 'player' ? 'あなたが先攻' : 'あなたが後攻' });
      const card = getSupport(s.field.cardId);
      return h(
        'button',
        {
          class: `battle-turn__field battle-turn__field--${s.field.owner}`,
          attrs: { type: 'button', 'aria-label': `場のカード ${card.name}` },
          on: { click: () => openCardDetail(element, card, { extra: [`${SIDE_LABEL[s.field?.owner ?? 'player']}が出した場のカード`] }) },
        },
        h('span', { class: 'battle-turn__field-label', text: '場' }),
        h('span', { class: 'battle-turn__field-text', text: supportShortText(card).replace(/^場：/, '') }),
      );
    };

    /** マナが増えた・ダメージを受けたときの演出と効果音（前回の描画との差で判断する） */
    const playEffects = (s: BattleState): void => {
      for (const side of ['player', 'opponent'] as const) {
        const now = manaOf(s.sides[side]);
        const before = prevMana.get(side);
        prevMana.set(side, now);
        if (before === undefined || now <= before) continue;
        const box = element.querySelector(`.battle-info--${side} .battle-info__mana`);
        if (box) {
          box.classList.add('is-mana-up');
          box.append(h('span', { class: 'battle__mana-float', text: `+${now - before}` }), h('span', { class: 'battle__mana-spark', attrs: { 'aria-hidden': 'true' } }));
        }
        sound.play('manaGain');
      }
      if (element.querySelector('.battle__monster.is-hit')) sound.play('damageHit');
    };

    /** 攻撃終了。まだ使えるカードがあるときは確かめる（押しまちがい防止） */
    const requestEndAttack = (s: BattleState): void => {
      const end = (): void => dispatch({ type: 'endAttack', side: 'player' });
      if (s.sides.player.hand.some((c) => cardUsability(s, 'player', c.uid).usable)) {
        confirmCommand(element, 'まだ使えるカードがあります。攻撃を終えてマナ化へ進みますか？', { ok: 'マナ化へ進む', cancel: '攻撃を続ける' }, end);
      } else end();
    };

    /** 上の帯の右端の小さな「攻撃終了」（自分の攻撃中だけ。画面中央をふさがずにいつでも押せる） */
    const turnEndButton = (s: BattleState, blocked: boolean): HTMLElement | null => {
      if (s.phase !== 'main' || s.active !== 'player' || auto || blocked || targeting) return null;
      return h(
        'button',
        { class: 'battle-turn__end', attrs: { type: 'button', 'aria-label': '攻撃終了' }, on: { click: () => requestEndAttack(s) } },
        h('img', { class: 'battle-turn__end-img', attrs: { src: wineButtonUrl, alt: '', draggable: 'false' } }),
        h('span', { class: 'battle-turn__end-label', text: '攻撃終了' }),
      );
    };

    /**
     * コマンドの帯。必要なときだけ、画面中央に帯を敷いてコマンドを縦に並べる（下に常に並べない）。
     * - 攻撃：カードを選ぶと「使う（使えるときだけ）／やめる」。使えるカードが1枚もなければ「攻撃終了」を出す
     *   （ふだんの攻撃終了は上の帯の右端の小さなボタン）
     * - 対象選択中：モンスターを隠さないよう、低い位置の帯に「やめる」
     * - マナ化：「マナにする（N枚）」（選んだとき）／「ターン終了」
     * - 相手の番・配っている間・オート中は出さない
     */
    const commandBand = (s: BattleState, blocked: boolean): HTMLElement | null => {
      const buttons: HTMLButtonElement[] = [];
      const mine = s.active === 'player' && !auto && !blocked;
      const selected = selectedUid ? s.sides.player.hand.find((c) => c.uid === selectedUid) : undefined;
      const anyUsable = s.sides.player.hand.some((c) => cardUsability(s, 'player', c.uid).usable);
      const deselect = (): void => {
        selectedUid = null;
        targeting = null;
        render();
      };
      let low = false;
      if (mine && s.phase === 'main') {
        if (targeting) {
          buttons.push(commandButton('やめる', deselect, 'cancel'));
          low = true;
        } else if (selected) {
          if (cardUsability(s, 'player', selected.uid).usable) buttons.push(commandButton('使う', () => useCard(selected.uid)));
          buttons.push(commandButton('やめる', deselect, 'cancel'));
        } else if (!anyUsable) {
          // 使えるカードが1枚もなければ、することは攻撃終了だけなので帯で出す
          buttons.push(commandButton('攻撃終了', () => requestEndAttack(s), 'cancel'));
        }
      } else if (mine && s.phase === 'mana') {
        if (manaPicks.size > 0 && canConvertToMana(s, 'player')) buttons.push(commandButton(`マナにする（${manaPicks.size}枚）`, convertPicked));
        buttons.push(
          commandButton(
            'ターン終了',
            () => {
              const end = (): void => dispatch({ type: 'endTurn', side: 'player' });
              if (manaPicks.size > 0) {
                confirmCommand(element, '選んだカードをまだマナにしていません。このままターンを終えますか？', { ok: 'このまま終える', cancel: 'マナ化にもどる' }, end);
              } else end();
            },
            'cancel',
          ),
        );
      }
      if (buttons.length === 0) {
        lastCommandKey = '';
        return null;
      }
      const key = buttons.map((b) => b.getAttribute('aria-label')).join('|');
      const band = h(
        'div',
        { class: `battle__command-band${low ? ' is-low' : ''}`, attrs: { role: 'group', 'aria-label': '操作' } },
        h('div', { class: 'battle__command-list' }, ...buttons),
      );
      // 中身が変わったときだけ帯が開く動きをつける
      if (key !== lastCommandKey) band.classList.add('is-enter');
      lastCommandKey = key;
      return band;
    };

    const render = (): void => {
      element.dataset.stage = state ? 'play' : 'order';
      if (!state) {
        element.replaceChildren(header(), orderView());
        return;
      }
      const s = state;
      // 手札から無くなったカード・マナ化以外の場面では、マナにする候補を消す
      if (s.phase !== 'mana' || s.active !== 'player') manaPicks.clear();
      for (const uid of [...manaPicks]) if (!s.sides.player.hand.some((c) => c.uid === uid)) manaPicks.delete(uid);
      const handScroll = element.querySelector('.battle__hand')?.scrollLeft ?? 0;
      const hand = handRow(s);
      const blocked = dealing();
      const commands = commandBand(s, blocked);

      const phaseText = s.phase === 'mana' ? '・マナ化' : s.phase === 'ended' ? '' : s.phase === 'defense' ? '・守備' : '・攻撃';
      const turnText =
        s.phase === 'ended' ? '対戦終了' : `${s.turn}手番・${s.active === 'player' ? 'あなた' : '相手'}${phaseText}`;
      element.replaceChildren(
        header(),
        qaBar() ?? '',
        h(
          'div',
          { class: `battle-turn battle-turn--${s.phase === 'ended' ? 'ended' : s.active}` },
          h('span', { class: 'battle-turn__text', text: turnText }),
          h('div', { class: 'battle-turn__right' }, fieldChip(s), turnEndButton(s, blocked)),
        ),
        monsterRow(s, 'opponent'),
        monsterRow(s, 'player'),
        detailPanel(s),
        hand,
      );
      const overlays = [commands, defenseOverlay(s), resultOverlay(s), phaseBanner(s)].filter((o): o is HTMLElement => o !== null);
      element.append(...overlays);
      const handEl = element.querySelector('.battle__hand');
      if (handEl) handEl.scrollLeft = handScroll;
      playEffects(s);
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
