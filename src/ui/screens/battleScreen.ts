import {
  battleReducer,
  canSelectCard,
  describeLocation,
  getSelectedLocation,
  SIDE_LABEL,
  type BattleAction,
  type BattleState,
  type CardInstance,
  type Mana,
  type Side,
} from '../../game/battle/battleState.ts';
import { createPlaceholderBattle } from '../../game/battle/placeholderBattle.ts';
import { placeholderCatalog } from '../../game/cards/placeholderCards.ts';
import { CARD_KIND_LABEL } from '../../game/cards/cardTypes.ts';
import { createCardDetail } from '../components/cardDetail.ts';
import { createCardBack, createCardView, type CardViewSize } from '../components/cardView.ts';
import { createScreenHeader } from '../components/screenHeader.ts';
import { button, h } from '../dom.ts';
import type { ScreenDefinition } from './types.ts';

/**
 * カードバトル画面（基盤のみ）。
 * 表示・カード選択・詳細確認・仮のターン切り替えだけを扱い、戦闘ルールは実装しない。
 * 状態の変更はすべて battleReducer（src/game/battle）を通す。
 */
export const battleScreen: ScreenDefinition = {
  id: 'battle',
  title: 'カードバトル',
  create(ctx) {
    let state: BattleState = createPlaceholderBattle();
    /** 詳細を開いているカード（UIだけの状態） */
    let detailInstanceId: string | null = null;

    const element = h('main', { class: 'screen battle-screen' });

    const dispatch = (action: BattleAction): void => {
      state = battleReducer(state, action);
      render();
    };

    const openDetail = (instanceId: string): void => {
      if (!canSelectCard(state, instanceId)) return;
      detailInstanceId = instanceId;
      dispatch({ type: 'selectCard', instanceId });
    };

    const closeDetail = (): void => {
      detailInstanceId = null;
      render();
    };

    /** 1回目のタップで選択、選択中のカードをもう一度タップで詳細 */
    const tapCard = (instanceId: string): void => {
      if (state.selectedInstanceId === instanceId) openDetail(instanceId);
      else dispatch({ type: 'selectCard', instanceId });
    };

    const cardView = (instance: CardInstance, size: CardViewSize): HTMLElement => {
      const card = placeholderCatalog.get(instance.cardId);
      if (!card) return h('div', { class: `card card--missing card--${size}`, text: '?' });
      return createCardView(card, {
        size,
        selected: state.selectedInstanceId === instance.instanceId,
        onTap: () => tapCard(instance.instanceId),
      });
    };

    const fieldRow = (side: Side): HTMLElement =>
      h(
        'div',
        { class: `battle-field battle-field--${side}`, attrs: { 'aria-label': `${SIDE_LABEL[side]}の場` } },
        ...state.sides[side].field.map((instance) =>
          h(
            'div',
            { class: 'battle-field__slot' },
            instance ? cardView(instance, 'field') : h('div', { class: 'battle-field__empty', text: '空き' }),
          ),
        ),
      );

    const render = (): void => {
      const handScroll = element.querySelector('.battle-hand__cards')?.scrollLeft ?? 0;
      const { turn, sides } = state;
      const playerTurn = turn.active === 'player';
      const selected = getSelectedLocation(state);
      const selectedCard = selected ? placeholderCatalog.get(selected.card.cardId) : undefined;

      const handCards = h(
        'div',
        { class: 'battle-hand__cards' },
        ...sides.player.hand.map((instance) => cardView(instance, 'hand')),
      );

      const detailButton = button(
        '詳細',
        () => {
          if (state.selectedInstanceId) openDetail(state.selectedInstanceId);
        },
        'btn btn--small',
      );
      detailButton.disabled = selected === null;

      element.replaceChildren(
        createScreenHeader({
          title: 'カードバトル',
          back: { label: '街へ', onTap: () => ctx.back('town') },
          right: h('span', { class: 'battle-turn-count', text: `ターン ${turn.number}` }),
        }),
        // 相手側
        h(
          'section',
          { class: 'battle-side battle-side--opponent', dataset: { active: String(!playerTurn) } },
          h(
            'div',
            { class: 'battle-side__info' },
            h('span', { class: 'battle-side__name', text: SIDE_LABEL.opponent }),
            h(
              'div',
              { class: 'battle-opponent-hand', attrs: { 'aria-label': `相手の手札 ${sides.opponent.hand.length}枚` } },
              ...sides.opponent.hand.map(() => createCardBack('mini')),
              h('span', { class: 'battle-opponent-hand__count', text: `×${sides.opponent.hand.length}` }),
            ),
            manaView(sides.opponent.mana),
          ),
          fieldRow('opponent'),
        ),
        h(
          'div',
          { class: `battle-turn-banner battle-turn-banner--${turn.active}`, attrs: { role: 'status' } },
          playerTurn ? 'あなたのターン' : '相手のターン（仮）',
        ),
        // プレイヤー側
        h(
          'section',
          { class: 'battle-side battle-side--player', dataset: { active: String(playerTurn) } },
          fieldRow('player'),
          h(
            'div',
            { class: 'battle-side__info' },
            h('span', { class: 'battle-side__name', text: SIDE_LABEL.player }),
            manaView(sides.player.mana),
          ),
        ),
        h(
          'section',
          { class: 'battle-hand', attrs: { 'aria-label': '手札' } },
          h('p', { class: 'battle-hand__label', text: `手札 ${sides.player.hand.length}枚` }),
          handCards,
        ),
        h(
          'footer',
          { class: 'battle-actions' },
          h(
            'div',
            { class: 'battle-actions__selection' },
            ...(selected && selectedCard
              ? [
                  h('span', {
                    class: 'battle-actions__where',
                    text: `${describeLocation(selected)}・${CARD_KIND_LABEL[selectedCard.kind]}`,
                  }),
                  h('span', { class: 'battle-actions__name', text: selectedCard.name }),
                ]
              : [h('span', { class: 'battle-actions__hint', text: 'カードをタップして選択\nもう一度タップで詳細' })]),
          ),
          h(
            'div',
            { class: 'battle-actions__buttons' },
            detailButton,
            button(
              playerTurn ? 'ターン終了' : '相手ターン終了（仮）',
              () => dispatch({ type: 'endTurn' }),
              'btn btn--primary btn--small',
            ),
          ),
        ),
      );

      if (detailInstanceId) {
        const location = getSelectedLocation(state);
        const card = location ? placeholderCatalog.get(location.card.cardId) : undefined;
        if (location && card && location.card.instanceId === detailInstanceId) {
          element.append(createCardDetail({ card, locationLabel: describeLocation(location), onClose: closeDetail }));
        } else {
          detailInstanceId = null;
        }
      }

      handCards.scrollLeft = handScroll;
    };

    render();
    return { element };
  },
};

function manaView(mana: Mana): HTMLElement {
  const pips = Array.from({ length: mana.max }, (_, i) =>
    h('span', { class: `mana__pip${i < mana.current ? ' is-filled' : ''}` }),
  );
  return h(
    'div',
    { class: 'mana', attrs: { 'aria-label': `マナ ${mana.current}/${mana.max}` } },
    h('span', { class: 'mana__label', text: 'マナ' }),
    h('span', { class: 'mana__pips', attrs: { 'aria-hidden': 'true' } }, ...pips),
    h('span', { class: 'mana__value', text: `${mana.current}/${mana.max}` }),
  );
}
