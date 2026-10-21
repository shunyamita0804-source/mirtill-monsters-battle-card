/**
 * 欠片の隠し場所（計10個、各1度だけ）。
 * 位置はマップ上に表示しない。その場所で「しらべる」と見つかる。
 * 隠しモンスターの正式名称・画像は未確定。欠片の個数（10個）は指示書どおり。場所は仮。
 */
export interface FragmentDefinition {
  readonly id: string;
  readonly mapId: string;
  readonly x: number;
  readonly y: number;
}

export const FRAGMENTS: readonly FragmentDefinition[] = [
  { id: 'fragment-01', mapId: 'town', x: 1, y: 2 },
  { id: 'fragment-02', mapId: 'town', x: 12, y: 7 },
  { id: 'fragment-03', mapId: 'town', x: 5, y: 22 },
  { id: 'fragment-04', mapId: 'town', x: 14, y: 24 },
  { id: 'fragment-05', mapId: 'dungeon-01-b1', x: 9, y: 1 },
  { id: 'fragment-06', mapId: 'dungeon-01-b1', x: 3, y: 14 },
  { id: 'fragment-07', mapId: 'dungeon-01-b2', x: 5, y: 11 },
  { id: 'fragment-08', mapId: 'dungeon-01-b2', x: 12, y: 16 },
  { id: 'fragment-09', mapId: 'dungeon-01-b3', x: 10, y: 1 },
  { id: 'fragment-10', mapId: 'dungeon-01-b3', x: 1, y: 16 },
];

export const FRAGMENT_TOTAL = 10;
