import { describe, expect, it } from 'vitest';
import {
  battleReducer,
  canSelectCard,
  describeLocation,
  findCardLocation,
  getSelectedLocation,
} from '../src/game/battle/battleState.ts';
import { createPlaceholderBattle, PLACEHOLDER_FIELD_SLOTS } from '../src/game/battle/placeholderBattle.ts';
import { placeholderCatalog } from '../src/game/cards/placeholderCards.ts';

describe('仮の対戦状態', () => {
  const state = createPlaceholderBattle();

  it('あなたのターン1から始まり、何も選択していない', () => {
    expect(state.turn).toEqual({ number: 1, active: 'player' });
    expect(state.selectedInstanceId).toBeNull();
  });

  it('場の枠数がそろっている', () => {
    expect(state.sides.player.field).toHaveLength(PLACEHOLDER_FIELD_SLOTS);
    expect(state.sides.opponent.field).toHaveLength(PLACEHOLDER_FIELD_SLOTS);
  });

  it('すべてのカードが仮カードのカタログに存在し、個体IDは重複しない', () => {
    const all = (['player', 'opponent'] as const).flatMap((side) => [
      ...state.sides[side].field.filter((c) => c !== null),
      ...state.sides[side].hand,
    ]);
    for (const instance of all) {
      expect(placeholderCatalog.get(instance.cardId)).toBeDefined();
    }
    expect(new Set(all.map((c) => c.instanceId)).size).toBe(all.length);
  });

  it('マナは最大値以下', () => {
    for (const side of ['player', 'opponent'] as const) {
      const { current, max } = state.sides[side].mana;
      expect(current).toBeGreaterThanOrEqual(0);
      expect(current).toBeLessThanOrEqual(max);
    }
  });
});

describe('カード選択', () => {
  it('自分の手札・場、相手の場のカードを選択できる', () => {
    let state = createPlaceholderBattle();
    for (const id of ['p-hand-1', 'p-field-2', 'o-field-1']) {
      state = battleReducer(state, { type: 'selectCard', instanceId: id });
      expect(state.selectedInstanceId).toBe(id);
    }
  });

  it('相手の手札（裏向き）と存在しないカードは選択できない', () => {
    const state = createPlaceholderBattle();
    expect(canSelectCard(state, 'o-hand-1')).toBe(false);
    expect(battleReducer(state, { type: 'selectCard', instanceId: 'o-hand-1' })).toBe(state);
    expect(battleReducer(state, { type: 'selectCard', instanceId: 'nope' })).toBe(state);
  });

  it('選択中のカードの場所がわかる', () => {
    const state = battleReducer(createPlaceholderBattle(), { type: 'selectCard', instanceId: 'p-field-2' });
    const location = getSelectedLocation(state);
    expect(location).toMatchObject({ side: 'player', zone: 'field', index: 1 });
    expect(location && describeLocation(location)).toBe('あなたの場 2番');
  });

  it('選択解除', () => {
    const selected = battleReducer(createPlaceholderBattle(), { type: 'selectCard', instanceId: 'p-hand-1' });
    const cleared = battleReducer(selected, { type: 'clearSelection' });
    expect(cleared.selectedInstanceId).toBeNull();
    expect(battleReducer(cleared, { type: 'clearSelection' })).toBe(cleared);
  });

  it('場所の説明', () => {
    expect(describeLocation({ side: 'opponent', zone: 'field', index: 0 })).toBe('相手の場 1番');
    expect(describeLocation({ side: 'player', zone: 'hand', index: 3 })).toBe('あなたの手札');
  });

  it('空き枠は見つからない', () => {
    expect(findCardLocation(createPlaceholderBattle(), 'o-field-3')).toBeNull();
  });
});

describe('仮のターン切り替え', () => {
  it('手番が交互に入れ替わり、ターン数が進み、選択が解除される', () => {
    let state = battleReducer(createPlaceholderBattle(), { type: 'selectCard', instanceId: 'p-hand-1' });
    state = battleReducer(state, { type: 'endTurn' });
    expect(state.turn).toEqual({ number: 2, active: 'opponent' });
    expect(state.selectedInstanceId).toBeNull();
    state = battleReducer(state, { type: 'endTurn' });
    expect(state.turn).toEqual({ number: 3, active: 'player' });
  });

  it('カード・マナは変化しない（戦闘ルールは未実装）', () => {
    const before = createPlaceholderBattle();
    const after = battleReducer(before, { type: 'endTurn' });
    expect(after.sides).toBe(before.sides);
  });
});
