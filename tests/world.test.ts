import { describe, expect, it } from 'vitest';
import { DUNGEON_B1, HOME, TOWN } from '../src/data/maps.ts';
import { adjacentCellOf, findPath, findPathToObject, isBlocked, objectsAt } from '../src/game/world/world.ts';

const blockedIn = (map: typeof HOME) => (x: number, y: number) => isBlocked(map, x, y, () => true);

describe('歩行マップの経路探索', () => {
  it('床のマスへは最短経路で行ける（噴水は迂回する）', () => {
    const straight = findPath(TOWN, TOWN.spawn, { x: 7, y: 18 }, blockedIn(TOWN));
    expect(straight).toHaveLength(21 - 18);
    const around = findPath(TOWN, TOWN.spawn, { x: 7, y: 14 }, blockedIn(TOWN));
    expect(around?.at(-1)).toEqual({ x: 7, y: 14 });
    expect(around?.some((p) => p.x === 7 && (p.y === 15 || p.y === 16))).toBe(false);
  });

  it('壁で囲まれたマスへは行けない', () => {
    expect(findPath(TOWN, TOWN.spawn, { x: 0, y: 0 }, blockedIn(TOWN))).toBeNull();
  });

  it('複数マスの家具（ベッド）は、どの角をタップしても隣まで行ける', () => {
    const bed = HOME.objects.find((o) => o.id === 'home-bed');
    if (!bed) throw new Error('bed');
    const path = findPathToObject(HOME, { x: 7, y: 1 }, bed, blockedIn(HOME));
    expect(path).not.toBeNull();
    const end = path?.at(-1) ?? HOME.spawn;
    expect(adjacentCellOf(bed, end)).not.toBeNull();
  });

  it('敵の隣まで行ける（接触でバトル）', () => {
    const enemy = DUNGEON_B1.objects.find((o) => o.type === 'enemy');
    if (!enemy) throw new Error('enemy');
    const path = findPathToObject(DUNGEON_B1, DUNGEON_B1.spawn, enemy, blockedIn(DUNGEON_B1));
    expect(path).not.toBeNull();
  });
});

describe('街のダンジョン入口', () => {
  const gate = TOWN.objects.find((o) => o.id === 'door-dungeon');

  it('入口はダンジョン選択につながる出入口', () => {
    expect(gate?.type).toBe('warp');
    expect(gate?.type === 'warp' && gate.target.kind).toBe('dungeonGate');
  });

  it('出現位置・各建物の前から、道を歩いて入口まで行ける（途中で塞がれていない）', () => {
    for (const from of [TOWN.spawn, { x: 3, y: 12 }, { x: 13, y: 12 }, { x: 7, y: 6 }]) {
      const path = findPath(TOWN, from, { x: 7, y: 25 }, blockedIn(TOWN));
      expect(path, `${from.x},${from.y}`).not.toBeNull();
      expect(path?.at(-1)).toEqual({ x: 7, y: 25 });
      // 途中で他の施設の入口を踏まない（誤った施設へ移動しない）
      const others = path?.slice(0, -1).filter((p) => objectsAt(TOWN, p.x, p.y).some((o) => o.type === 'warp' && o.id !== 'door-dungeon'));
      expect(others).toEqual([]);
    }
  });

  it('入口の手前（戻ってくる位置）は歩けるマス', () => {
    expect(isBlocked(TOWN, 7, 24, () => true)).toBe(false);
    expect(isBlocked(TOWN, 8, 24, () => true)).toBe(false);
  });
});
