/**
 * 再現可能な乱数（mulberry32）。状態は数値1つなので保存・テストがしやすい。
 * 純粋関数として「次の値と次の状態」を返す。
 */
export interface RngResult {
  readonly value: number;
  readonly seed: number;
}

export function nextRandom(seed: number): RngResult {
  let t = (seed + 0x6d2b79f5) | 0;
  const nextSeed = t;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  return { value, seed: nextSeed };
}

/** 0 以上 max 未満の整数 */
export function nextInt(seed: number, max: number): { value: number; seed: number } {
  const r = nextRandom(seed);
  return { value: Math.floor(r.value * max), seed: r.seed };
}

/** Fisher–Yates シャッフル（新しい配列を返す） */
export function shuffle<T>(items: readonly T[], seed: number): { items: T[]; seed: number } {
  const result = [...items];
  let s = seed;
  for (let i = result.length - 1; i > 0; i--) {
    const r = nextInt(s, i + 1);
    s = r.seed;
    const j = r.value;
    const tmp = result[i] as T;
    result[i] = result[j] as T;
    result[j] = tmp;
  }
  return { items: result, seed: s };
}

/** 新しいシード（UI 側で使う。ロジックのテストでは固定値を渡す） */
export function randomSeed(): number {
  return Math.floor(Math.random() * 0x7fffffff);
}
