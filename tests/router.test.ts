import { describe, expect, it, vi } from 'vitest';
import { INITIAL_SCREEN, isScreenId, SCREEN_IDS, type ScreenId } from '../src/config/screens.ts';
import { Router } from '../src/core/router.ts';

describe('画面ID', () => {
  it('タイトルから始まり、歩行・デッキ・ショップ・ガチャ・大会・バトルの画面がある', () => {
    expect(INITIAL_SCREEN).toBe('title');
    for (const id of ['world', 'deck', 'shopMenu', 'gacha', 'dungeonSelect', 'tournament', 'battle', 'settings'] as const) {
      expect(SCREEN_IDS).toContain(id);
    }
  });

  it('isScreenId', () => {
    expect(isScreenId('battle')).toBe(true);
    expect(isScreenId('nowhere')).toBe(false);
  });
});

describe('Router', () => {
  it('タイトル → 歩行 → デッキ → 戻る → バトル → 戻る', () => {
    const router = new Router<ScreenId>('title');
    const listener = vi.fn();
    router.subscribe(listener);

    router.reset('world');
    expect(router.current).toBe('world');
    expect(router.canGoBack).toBe(false);

    router.navigate('deck');
    expect(router.history).toEqual(['world', 'deck']);
    expect(router.back()).toBe(true);
    expect(router.current).toBe('world');

    router.navigate('battle');
    expect(router.back()).toBe(true);
    expect(router.current).toBe('world');

    expect(listener.mock.calls.map(([change]) => change)).toEqual([
      { from: 'title', to: 'world' },
      { from: 'world', to: 'deck' },
      { from: 'deck', to: 'world' },
      { from: 'world', to: 'battle' },
      { from: 'battle', to: 'world' },
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
    const router = new Router<ScreenId>('world');
    const listener = vi.fn();
    router.subscribe(listener);
    router.navigate('world');
    expect(router.history).toEqual(['world']);
    router.navigate('deck');
    router.reset('deck');
    expect(router.history).toEqual(['deck']);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('購読解除後は通知しない', () => {
    const router = new Router<ScreenId>('title');
    const listener = vi.fn();
    const unsubscribe = router.subscribe(listener);
    unsubscribe();
    router.navigate('world');
    expect(listener).not.toHaveBeenCalled();
  });
});
