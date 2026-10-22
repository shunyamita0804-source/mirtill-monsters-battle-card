import { monsterId } from './cards.ts';
import type { OpponentDefinition } from './tournaments.ts';

/**
 * 【仮データ】ダンジョンと敵の編成。
 * 第1ダンジョンは地下3階（B1F：探索導入と通常戦、B2F：分岐と宝箱、B3F：最奥にボス）。
 * 敵・ボスの正式な編成は未確定のため、ここの値はすべて仮。
 */
export interface DungeonDefinition {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  /** 階層ごとのマップID（B1F から順） */
  readonly floors: readonly string[];
  readonly isPlaceholder: boolean;
}

export const DUNGEONS: readonly DungeonDefinition[] = [
  {
    id: 'dungeon-01',
    name: '第1ダンジョン（仮名）',
    description: '地下3階。最奥のボスを倒すとクリア。（名称・敵編成は仮）',
    floors: ['dungeon-01-b1', 'dungeon-01-b2', 'dungeon-01-b3'],
    isPlaceholder: true,
  },
];

export function getDungeon(id: string): DungeonDefinition | undefined {
  return DUNGEONS.find((d) => d.id === id);
}

export const ENCOUNTERS: Readonly<Record<string, OpponentDefinition>> = {
  'enc-b1-a': { id: 'enc-b1-a', name: '野生モンスターの群れ（仮）', monsters: ['a', 'd', 'b'].map(monsterId), lifeScale: 0.6 },
  'enc-b1-b': { id: 'enc-b1-b', name: '野生モンスターの群れ（仮）', monsters: ['c', 'b', 'd'].map(monsterId), lifeScale: 0.65 },
  'enc-b2-a': { id: 'enc-b2-a', name: '宝を守る群れ（仮）', monsters: ['d', 'e', 'a'].map(monsterId), lifeScale: 0.75 },
  'enc-b2-b': { id: 'enc-b2-b', name: '宝を守る群れ（仮）', monsters: ['f', 'b', 'c'].map(monsterId), lifeScale: 0.75 },
  'enc-b2-c': { id: 'enc-b2-c', name: '階段の番人（仮）', monsters: ['e', 'c', 'd'].map(monsterId), lifeScale: 0.8 },
  'enc-b3-a': { id: 'enc-b3-a', name: '深層の群れ（仮）', monsters: ['g', 'a', 'f'].map(monsterId), lifeScale: 0.85 },
  'enc-b3-b': { id: 'enc-b3-b', name: '深層の群れ（仮）', monsters: ['e', 'g', 'b'].map(monsterId), lifeScale: 0.85 },
  'enc-b3-boss': { id: 'enc-b3-boss', name: '最奥のボス（仮）', monsters: ['g', 'e', 'f'].map(monsterId), lifeScale: 0.85 },
  // カード練習場の練習相手（序盤の練習試合）。スターターと同じモンスター3体を少し弱くしたもの（仮。正式な練習相手のデッキは未定）
  'enc-practice': { id: 'enc-practice', name: '練習相手（仮）', monsters: ['a', 'b', 'c'].map(monsterId), lifeScale: 0.6 },
};
