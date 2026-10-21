import type { BattleState, CardInstance, SideState } from './battleState.ts';

/**
 * 画面確認用の仮の対戦状態。
 * 場の枠数・手札枚数・マナの値はいずれも仮で、正式なルールではない。
 */
export const PLACEHOLDER_FIELD_SLOTS = 3;

function instances(prefix: string, cardIds: readonly string[]): CardInstance[] {
  return cardIds.map((cardId, i) => ({ instanceId: `${prefix}-${i + 1}`, cardId }));
}

export function createPlaceholderBattle(): BattleState {
  const player: SideState = {
    field: instances('p-field', ['tmp-monster-001', 'tmp-monster-002', 'tmp-monster-003']),
    hand: instances('p-hand', ['tmp-skill-001', 'tmp-skill-002', 'tmp-skill-003', 'tmp-skill-004', 'tmp-skill-006']),
    mana: { current: 3, max: 5 },
  };
  const opponent: SideState = {
    // 空き枠の表示確認のため1枠空けておく
    field: [...instances('o-field', ['tmp-monster-004', 'tmp-monster-005']), null],
    hand: instances('o-hand', ['tmp-skill-001', 'tmp-skill-002', 'tmp-skill-003', 'tmp-skill-005']),
    mana: { current: 2, max: 5 },
  };
  return {
    turn: { number: 1, active: 'player' },
    sides: { player, opponent },
    selectedInstanceId: null,
  };
}
