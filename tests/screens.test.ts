import { describe, expect, it } from 'vitest';
import { SCREEN_IDS } from '../src/config/screens.ts';
import { SCREENS } from '../src/ui/screens/registry.ts';

describe('画面の登録', () => {
  it('すべての画面IDに画面定義があり、IDが一致する', () => {
    expect(Object.keys(SCREENS).sort()).toEqual([...SCREEN_IDS].sort());
    for (const id of SCREEN_IDS) {
      expect(SCREENS[id].id).toBe(id);
      expect(SCREENS[id].title).not.toBe('');
    }
  });
});
