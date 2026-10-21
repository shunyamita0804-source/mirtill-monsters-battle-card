import { describe, expect, it } from 'vitest';
import { createCardArtResolver } from '../src/game/cards/cardArt.ts';
import { createCardCatalog } from '../src/game/cards/cardCatalog.ts';
import type { CardDefinition } from '../src/game/cards/cardTypes.ts';
import { PLACEHOLDER_CARDS, placeholderCatalog } from '../src/game/cards/placeholderCards.ts';

describe('仮カード', () => {
  it('すべて仮カードとして明示されている', () => {
    expect(PLACEHOLDER_CARDS.length).toBeGreaterThan(0);
    for (const card of PLACEHOLDER_CARDS) {
      expect(card.isPlaceholder).toBe(true);
      expect(card.id.startsWith('tmp-')).toBe(true);
      expect(card.name.startsWith('仮')).toBe(true);
    }
  });

  it('モンスターと技の両方がある', () => {
    const kinds = new Set(PLACEHOLDER_CARDS.map((c) => c.kind));
    expect(kinds).toEqual(new Set(['monster', 'skill']));
  });

  it('カタログからIDで引ける', () => {
    expect(placeholderCatalog.get('tmp-monster-001')?.name).toBe('仮モンスターA');
    expect(placeholderCatalog.get('missing')).toBeUndefined();
    expect(placeholderCatalog.all()).toHaveLength(PLACEHOLDER_CARDS.length);
  });
});

describe('createCardCatalog', () => {
  it('IDの重複はエラー', () => {
    const card: CardDefinition = { id: 'a', kind: 'skill', name: 'x', description: '', isPlaceholder: true };
    expect(() => createCardCatalog([card, card])).toThrow();
  });
});

describe('createCardArtResolver', () => {
  const resolve = createCardArtResolver({
    '/assets/images/cards/skills/skill_001.png': '/static/skill_001-abc.png',
    '/assets/images/cards/monsters/monster_001.webp': '/static/monster_001-def.webp',
  });

  it('assets/ のカテゴリとファイル名から画像URLを引く', () => {
    expect(resolve({ category: 'skillCards', file: 'skill_001.png', layout: 'full' })).toBe('/static/skill_001-abc.png');
    expect(resolve({ category: 'monsterCards', file: 'monster_001.webp', layout: 'frame' })).toBe(
      '/static/monster_001-def.webp',
    );
  });

  it('画像がない・指定がない・ファイル名が規則外なら undefined（仮の絵で表示）', () => {
    expect(resolve(undefined)).toBeUndefined();
    expect(resolve({ category: 'skillCards', file: 'skill_999.png', layout: 'full' })).toBeUndefined();
    expect(resolve({ category: 'skillCards', file: 'Bad Name.png', layout: 'full' })).toBeUndefined();
  });
});
