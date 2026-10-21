import { describe, expect, it } from 'vitest';
import { APP_INFO, DESIGN_RESOLUTION } from '../src/config/app.ts';

describe('APP_INFO', () => {
  it('正式名称が設定されている', () => {
    expect(APP_INFO.seriesName).toBe('ミルティルモンスターズ');
    expect(APP_INFO.gameName).toBe('ミルティルモンスターズバトルカード');
  });

  it('第2段階である', () => {
    expect(APP_INFO.phase).toBe(2);
  });
});

describe('DESIGN_RESOLUTION', () => {
  it('スマートフォン縦持ちの解像度である', () => {
    expect(DESIGN_RESOLUTION.orientation).toBe('portrait');
    expect(DESIGN_RESOLUTION.height).toBeGreaterThan(DESIGN_RESOLUTION.width);
  });
});
