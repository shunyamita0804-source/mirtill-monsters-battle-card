import { describe, expect, it, vi } from 'vitest';
import { INITIAL_SCREEN, isScreenId, SCREEN_IDS, type ScreenId } from '../src/config/screens.ts';
import { Router } from '../src/core/router.ts';

describe('画面ID', () => {
  it('第2段階の4画面がある', () => {
    expect([...SCREEN_IDS]).toEqual(['title', 'town', 'shop', 'battle']);
    expect(INITIAL_SCREEN).toBe('title');
  });

  it('isScreenId', () => {
    expect(isScreenId('battle')).toBe(true);
    expect(isScreenId('gacha')).toBe(false);
  });
});

describe('Router', () => {
  it('タイトル → 街 → ショップ → 戻る → バトル → 戻る', () => {
    const router = new Router<ScreenId>('title');
    const listener = vi.fn();
    router.subscribe(listener);

    router.reset('town');
    expect(router.current).toBe('town');
    expect(router.canGoBack).toBe(false);

    router.navigate('shop');
    expect(router.history).toEqual(['town', 'shop']);
    expect(router.back()).toBe(true);
    expect(router.current).toBe('town');

    router.navigate('battle');
    expect(router.back()).toBe(true);
    expect(router.current).toBe('town');

    expect(listener.mock.calls.map(([change]) => change)).toEqual([
      { from: 'title', to: 'town' },
      { from: 'town', to: 'shop' },
      { from: 'shop', to: 'town' },
      { from: 'town', to: 'battle' },
      { from: 'battle', to: 'town' },
    ]);
  });

  it('戻れないときは false で通知しない', () => {
    const router = new Router<ScreenId>('title');
    const listener = vi.fn();
    router.subscribe(listener);
    expect(router.back()).toBe(false);
    expect(listener).not.toHaveBeenCalled();
  });

  it('現在と同じ画面への移動・リセットは通知しない', () => {
    const router = new Router<ScreenId>('town');
    const listener = vi.fn();
    router.subscribe(listener);
    router.navigate('town');
    expect(router.history).toEqual(['town']);
    router.navigate('shop');
    router.reset('shop');
    expect(router.history).toEqual(['shop']);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('購読解除後は通知しない', () => {
    const router = new Router<ScreenId>('title');
    const listener = vi.fn();
    const unsubscribe = router.subscribe(listener);
    unsubscribe();
    router.navigate('town');
    expect(listener).not.toHaveBeenCalled();
  });
});
