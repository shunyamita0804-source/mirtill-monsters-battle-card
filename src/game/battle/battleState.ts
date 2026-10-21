/**
 * カードバトル画面の状態管理（DOMに依存しない）。
 *
 * 第2段階で扱うのは「表示」「カード選択」「仮のターン切り替え」のみ。
 * 戦闘ルール・ダメージ計算・勝敗処理・マナの増減は仕様未確定のため実装しない。
 */
export type Side = 'player' | 'opponent';
export type Zone = 'field' | 'hand';

export const SIDE_LABEL: Readonly<Record<Side, string>> = {
  player: 'あなた',
  opponent: '相手',
};

export const ZONE_LABEL: Readonly<Record<Zone, string>> = {
  field: '場',
  hand: '手札',
};

/** 場に出ているカード・手札のカード1枚。同じカード定義を複数枚持てるよう個体IDを分ける */
export interface CardInstance {
  readonly instanceId: string;
  readonly cardId: string;
}

export interface Mana {
  readonly current: number;
  readonly max: number;
}

export interface SideState {
  /** 場のカード枠。null は空き枠 */
  readonly field: readonly (CardInstance | null)[];
  readonly hand: readonly CardInstance[];
  readonly mana: Mana;
}

export interface BattleState {
  readonly turn: {
    readonly number: number;
    readonly active: Side;
  };
  readonly sides: Readonly<Record<Side, SideState>>;
  readonly selectedInstanceId: string | null;
}

export type BattleAction =
  | { readonly type: 'selectCard'; readonly instanceId: string }
  | { readonly type: 'clearSelection' }
  | { readonly type: 'endTurn' };

export interface CardLocation {
  readonly side: Side;
  readonly zone: Zone;
  readonly index: number;
  readonly card: CardInstance;
}

export function opponentOf(side: Side): Side {
  return side === 'player' ? 'opponent' : 'player';
}

export function findCardLocation(state: BattleState, instanceId: string): CardLocation | null {
  for (const side of ['player', 'opponent'] as const) {
    const { field, hand } = state.sides[side];
    const fieldIndex = field.findIndex((c) => c?.instanceId === instanceId);
    const fieldCard = field[fieldIndex];
    if (fieldCard) return { side, zone: 'field', index: fieldIndex, card: fieldCard };
    const handIndex = hand.findIndex((c) => c.instanceId === instanceId);
    const handCard = hand[handIndex];
    if (handCard) return { side, zone: 'hand', index: handIndex, card: handCard };
  }
  return null;
}

/** 選択（詳細確認）できるカードか。相手の手札は裏向きなので選べない */
export function canSelectCard(state: BattleState, instanceId: string): boolean {
  const location = findCardLocation(state, instanceId);
  if (!location) return false;
  return !(location.side === 'opponent' && location.zone === 'hand');
}

export function getSelectedLocation(state: BattleState): CardLocation | null {
  return state.selectedInstanceId === null ? null : findCardLocation(state, state.selectedInstanceId);
}

/** 「あなたの場 2番」のような表示用の位置説明 */
export function describeLocation(location: Pick<CardLocation, 'side' | 'zone' | 'index'>): string {
  const base = `${SIDE_LABEL[location.side]}の${ZONE_LABEL[location.zone]}`;
  return location.zone === 'field' ? `${base} ${location.index + 1}番` : base;
}

export function battleReducer(state: BattleState, action: BattleAction): BattleState {
  switch (action.type) {
    case 'selectCard':
      if (state.selectedInstanceId === action.instanceId) return state;
      if (!canSelectCard(state, action.instanceId)) return state;
      return { ...state, selectedInstanceId: action.instanceId };
    case 'clearSelection':
      return state.selectedInstanceId === null ? state : { ...state, selectedInstanceId: null };
    case 'endTurn':
      // 仮のターン切り替え：手番を交代してターン数を進め、選択を解除するだけ
      return {
        ...state,
        turn: { number: state.turn.number + 1, active: opponentOf(state.turn.active) },
        selectedInstanceId: null,
      };
  }
}
