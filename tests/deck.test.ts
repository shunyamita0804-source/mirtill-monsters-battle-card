import { describe, expect, it } from 'vitest';
import { cardCatalog, monsterId, skillId, supportId } from '../src/data/cards.ts';
import { ENCOUNTERS } from '../src/data/dungeons.ts';
import { TOURNAMENTS } from '../src/data/tournaments.ts';
import { DECK_RULES } from '../src/data/rules.ts';
import {
  buildAutoDeck,
  buildDeckFromCollection,
  countCards,
  createStarterCollection,
  createStarterDeck,
  validateDeck,
} from '../src/game/deck/deck.ts';

describe('デッキ構成チェック（仮ルール）', () => {
  it('スターターデッキはモンスター3体・山札60枚（同じカードは3枚まで）で、所持カードで組める', () => {
    const deck = createStarterDeck();
    expect(deck.monsters).toHaveLength(3);
    expect(deck.skills).toHaveLength(60);
    expect(DECK_RULES.maxCopies).toBe(3);
    expect(Math.max(...Object.values(countCards(deck.skills)))).toBeLessThanOrEqual(3);
    expect(validateDeck(deck, createStarterCollection())).toEqual([]);
  });

  it('ダンジョン・大会のすべての相手のデッキが正しい構成になる', () => {
    const teams = [...Object.values(ENCOUNTERS).map((e) => e.monsters), ...TOURNAMENTS.flatMap((t) => t.rounds.map((o) => o.monsters))];
    expect(teams.length).toBeGreaterThan(0);
    for (const monsters of teams) expect(validateDeck(buildAutoDeck(monsters))).toEqual([]);
  });

  it('枚数不足・モンスター数・重複モンスターを検出する', () => {
    const deck = createStarterDeck();
    const codes = (d: Parameters<typeof validateDeck>[0]) => validateDeck(d).map((i) => i.code);
    expect(codes({ ...deck, skills: deck.skills.slice(1) })).toContain('skillCount');
    expect(codes({ ...deck, monsters: deck.monsters.slice(1) })).toContain('monsterCount');
    expect(codes({ ...deck, monsters: [monsterId('a'), monsterId('a'), monsterId('b')] })).toContain('duplicateMonster');
  });

  it('上限を超える同名カードと、適合しない技を検出する', () => {
    const deck = createStarterDeck();
    const skills = [...deck.skills];
    skills[4] = skillId('a', 1); // a-2 の1枚を a-1 に替えて a-1 を5枚にする
    skills[59] = skillId('d', 1); // デッキにいないモンスターの技
    const codes = validateDeck({ ...deck, skills }).map((i) => i.code);
    expect(codes).toContain('tooManyCopies');
    expect(codes).toContain('notCompatible');
  });

  it('所持枚数を超えるデッキを検出する', () => {
    const collection = { ...createStarterCollection(), [skillId('a', 1)]: 2 };
    expect(validateDeck(createStarterDeck(), collection).map((i) => i.code)).toContain('notOwned');
  });

  it('NPC 用の自動デッキは正しい構成になる（仮サポートも入る）', () => {
    const deck = buildAutoDeck(['e', 'f', 'g'].map(monsterId));
    expect(validateDeck(deck)).toEqual([]);
    expect(Math.max(...Object.values(countCards(deck.skills)))).toBeLessThanOrEqual(DECK_RULES.maxCopies);
    expect(deck.skills.some((id) => cardCatalog.get(id)?.kind === 'support')).toBe(true);
  });

  it('サポートはどのモンスターのデッキにも入れられる。モンスターカードは山札に入れられない', () => {
    const deck = createStarterDeck();
    const skills = [...deck.skills];
    skills[0] = supportId(1);
    expect(validateDeck({ ...deck, skills })).toEqual([]);
    skills[1] = monsterId('a');
    expect(validateDeck({ ...deck, skills }).map((i) => i.code)).toContain('notSkill');
  });

  it('おまかせ構築は、適合技が足りなければ持っているサポートで埋める', () => {
    const collection = { ...createStarterCollection(), [supportId(1)]: 4, [supportId(2)]: 4 };
    const monsters = [monsterId('a'), monsterId('b'), monsterId('d')]; // d の技は持っていない
    const deck = buildDeckFromCollection(monsters, collection);
    expect(deck.skills.filter((id) => id.startsWith('sup-'))).toHaveLength(8);
  });

  it('所持カードからのおまかせ構築', () => {
    const collection = createStarterCollection();
    const deck = buildDeckFromCollection(createStarterDeck().monsters, collection);
    expect(validateDeck(deck, collection)).toEqual([]);
    const short = buildDeckFromCollection([monsterId('a'), monsterId('b'), monsterId('d')], collection);
    expect(short.skills.length).toBeLessThan(60);
  });
});
