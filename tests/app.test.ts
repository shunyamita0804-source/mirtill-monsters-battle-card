import { describe, expect, it } from 'vitest';
import { APP_INFO, DESIGN_RESOLUTION } from '../src/config/app.ts';

describe('APP_INFO', () => {
  it('正式名称が設定されている', () => {
    expect(APP_INFO.seriesName).toBe('ミストラルモンスターズ');
    expect(APP_INFO.seriesNameEn).toBe('Mistral Monsters');
    expect(APP_INFO.gameName).toBe('ミストラルモンスターズ バトルカード');
    expect(APP_INFO.gameNameEn).toBe('Mistral Monsters Battle Card');
    expect(APP_INFO.shortName).toBe('ミストラルBC');
  });

  it('夜間一括指示の段階である', () => {
    expect(APP_INFO.phase).toBe(3);
  });
});

describe('DESIGN_RESOLUTION', () => {
  it('スマートフォン縦持ちの解像度である', () => {
    expect(DESIGN_RESOLUTION.orientation).toBe('portrait');
    expect(DESIGN_RESOLUTION.height).toBeGreaterThan(DESIGN_RESOLUTION.width);
  });
});
