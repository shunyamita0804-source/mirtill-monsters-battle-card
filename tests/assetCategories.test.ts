import { existsSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  ASSET_CATEGORIES,
  assetRelativePath,
  isValidAssetFileName,
} from '../src/core/assetCategories.ts';

const assetsRoot = fileURLToPath(new URL('../assets/', import.meta.url));

describe('ASSET_CATEGORIES', () => {
  it.each(Object.entries(ASSET_CATEGORIES))('%s のディレクトリが assets/ に存在する', (_key, dir) => {
    const full = `${assetsRoot}${dir}`;
    expect(existsSync(full)).toBe(true);
    expect(statSync(full).isDirectory()).toBe(true);
  });
});

describe('素材ファイル名の命名規則', () => {
  it('小文字英数字・ハイフン・アンダースコアのみ許可', () => {
    expect(isValidAssetFileName('monster_001.png')).toBe(true);
    expect(isValidAssetFileName('bgm-title.ogg')).toBe(true);
    expect(isValidAssetFileName('Monster 001.PNG')).toBe(false);
    expect(isValidAssetFileName('モンスター.png')).toBe(false);
    expect(isValidAssetFileName('../secret.png')).toBe(false);
  });

  it('カテゴリ付きの相対パスを返す', () => {
    expect(assetRelativePath('monsterCards', 'monster_001.png')).toBe(
      'images/cards/monsters/monster_001.png',
    );
  });

  it('規則外のファイル名は例外', () => {
    expect(() => assetRelativePath('ui', 'Bad Name.png')).toThrow();
  });
});
