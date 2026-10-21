import { describe, expect, it } from 'vitest';
import { DUNGEON_B1, HOME, TOWN } from '../src/data/maps.ts';
import { adjacentCellOf, findPath, findPathToObject, isBlocked } from '../src/game/world/world.ts';

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
