import { describe, expect, it } from 'vitest';
import { computeStageLayout, MAX_STAGE_WIDTH, shortStandaloneHeight } from '../src/core/stageLayout.ts';

describe('computeStageLayout', () => {
  it('基準解像度ちょうどなら等倍', () => {
    expect(computeStageLayout(390, 844)).toEqual({ scale: 1, width: 390, height: 844, offsetX: 0, offsetY: 0 });
  });

  it('同じ比率なら拡大縮小のみ', () => {
    const layout = computeStageLayout(780, 1688);
    expect(layout.scale).toBe(2);
    expect(layout.height).toBe(844);
    expect(layout.offsetX).toBe(0);
    expect(layout.offsetY).toBe(0);
  });

  it('縦長の端末では幅に合わせ、論理高さを伸ばして余白を作らない', () => {
    // 例：iPhone 15 のセーフエリア内（393×759）より縦長な 375×900
    const layout = computeStageLayout(375, 900);
    expect(layout.scale).toBeCloseTo(375 / 390);
    expect(layout.width).toBe(390);
    expect(layout.height).toBeGreaterThan(844);
    expect(layout.offsetX).toBeCloseTo(0);
    expect(layout.height * layout.scale).toBeLessThanOrEqual(900);
  });

  it('少し横長（iPhone のセーフエリア内 393×759）では高さに合わせ、論理幅を伸ばして左右に余白を作らない', () => {
    const layout = computeStageLayout(393, 759);
    expect(layout.scale).toBeCloseTo(759 / 844);
    expect(layout.height).toBe(844);
    expect(layout.width).toBeGreaterThan(390);
    expect(layout.width * layout.scale).toBeGreaterThan(392);
    expect(layout.offsetX).toBeLessThan(1);
  });

  it('とても横長の画面では高さに合わせ、幅は上限までにして左右中央に寄せる', () => {
    const layout = computeStageLayout(1280, 720);
    expect(layout.scale).toBeCloseTo(720 / 844);
    expect(layout.height).toBe(844);
    expect(layout.width).toBe(MAX_STAGE_WIDTH);
    expect(layout.offsetX).toBeCloseTo((1280 - MAX_STAGE_WIDTH * layout.scale) / 2);
    expect(layout.offsetY).toBeCloseTo(0);
  });

  it.each([
    [390, 844],
    [393, 759],
    [375, 667],
    [320, 568],
    [430, 932],
    [768, 1024],
    [1280, 720],
  ])('%i×%i で基準の 390×844 が表示領域からはみ出さない', (w, h) => {
    const layout = computeStageLayout(w, h);
    expect(layout.width).toBeGreaterThanOrEqual(390);
    expect(layout.height).toBeGreaterThanOrEqual(844);
    expect(layout.offsetX).toBeGreaterThanOrEqual(-1e-9);
    expect(layout.offsetY).toBeGreaterThanOrEqual(-1e-9);
    expect(layout.offsetX + layout.width * layout.scale).toBeLessThanOrEqual(w + 1e-9);
    expect(layout.offsetY + layout.height * layout.scale).toBeLessThanOrEqual(h + 1e-9);
  });

  it('サイズが取れないときは等倍にする', () => {
    expect(computeStageLayout(0, 0).scale).toBe(1);
    expect(computeStageLayout(Number.NaN, 500).scale).toBe(1);
  });
});

describe('shortStandaloneHeight（iPhone のホーム画面から開いたときの高さの補正）', () => {
  const base = { standalone: true, innerWidth: 393, innerHeight: 793, screenHeight: 852, appTop: 0, safeTop: 59 };

  it('高さが上のセーフエリアの分だけ短く渡されたら、画面の本当の高さにする（2026-10-24 の動画の状態）', () => {
    expect(shortStandaloneHeight(base)).toBe(852);
  });

  it('正しい高さで渡されているときは何もしない', () => {
    expect(shortStandaloneHeight({ ...base, innerHeight: 852 })).toBeNull();
  });

  it('Safari（ホーム画面から開いていない）・横持ち・セーフエリアなしでは何もしない', () => {
    expect(shortStandaloneHeight({ ...base, standalone: false })).toBeNull();
    expect(shortStandaloneHeight({ ...base, innerWidth: 852, innerHeight: 393 })).toBeNull();
    expect(shortStandaloneHeight({ ...base, safeTop: 0 })).toBeNull();
  });

  it('足りない高さがセーフエリアと違う・画面が上から始まっていないときは何もしない', () => {
    expect(shortStandaloneHeight({ ...base, innerHeight: 700 })).toBeNull();
    expect(shortStandaloneHeight({ ...base, appTop: 59 })).toBeNull();
  });
});
