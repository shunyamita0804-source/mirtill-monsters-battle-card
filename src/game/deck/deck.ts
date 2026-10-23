import { cardCatalog, monsterId, skillId, skillsOf, supportId, SUPPORTS } from '../../data/cards.ts';
import { SORAMO_SKILLS, SORAMO_TEAM } from '../../data/soramo.ts';
import { DECK_RULES } from '../../data/rules.ts';
import { cardName } from '../../i18n/content.ts';
import { t } from '../../i18n/i18n.ts';

export interface Deck {
  readonly monsters: readonly string[];
  readonly skills: readonly string[];
}

/** カードIDごとの枚数 */
export type CardCounts = Readonly<Record<string, number>>;

export function countCards(ids: readonly string[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const id of ids) counts[id] = (counts[id] ?? 0) + 1;
  return counts;
}

export type DeckIssueCode =
  | 'monsterCount'
  | 'duplicateMonster'
  | 'unknownCard'
  | 'notMonster'
  | 'notSkill'
  | 'skillCount'
  | 'tooManyCopies'
  | 'notCompatible'
  | 'notOwned';

export interface DeckIssue {
  readonly code: DeckIssueCode;
  readonly message: string;
}

/**
 * デッキの構成チェック。collection を渡すと所持枚数も確認する。
 * ルールの値は src/data/rules.ts（仮ルール）。
 */
export function validateDeck(deck: Deck, collection?: CardCounts): DeckIssue[] {
  const issues: DeckIssue[] = [];
  const nameOf = (id: string): string => cardName(id);

  if (deck.monsters.length !== DECK_RULES.monsterCount) {
    issues.push({
      code: 'monsterCount',
      message: t('deck.issue.monsterCount', { n: DECK_RULES.monsterCount, current: deck.monsters.length }),
    });
  }
  if (!DECK_RULES.allowDuplicateMonsters && new Set(deck.monsters).size !== deck.monsters.length) {
    issues.push({ code: 'duplicateMonster', message: t('deck.issue.duplicateMonster') });
  }
  for (const id of deck.monsters) {
    const card = cardCatalog.get(id);
    if (!card) issues.push({ code: 'unknownCard', message: t('deck.issue.unknownCard', { id }) });
    else if (card.kind !== 'monster') issues.push({ code: 'notMonster', message: t('deck.issue.notMonster', { name: cardName(card) }) });
  }

  if (deck.skills.length !== DECK_RULES.skillCount) {
    issues.push({
      code: 'skillCount',
      message: t('deck.issue.deckCount', { n: DECK_RULES.skillCount, current: deck.skills.length }),
    });
  }
  const skillCounts = countCards(deck.skills);
  for (const [id, count] of Object.entries(skillCounts)) {
    const card = cardCatalog.get(id);
    if (!card) {
      issues.push({ code: 'unknownCard', message: t('deck.issue.unknownCard', { id }) });
      continue;
    }
    if (card.kind === 'monster') {
      issues.push({ code: 'notSkill', message: t('deck.issue.notSkill', { name: cardName(card) }) });
      continue;
    }
    if (count > DECK_RULES.maxCopies) {
      issues.push({
        code: 'tooManyCopies',
        message: t('deck.issue.tooMany', { name: cardName(card), n: DECK_RULES.maxCopies, current: count }),
      });
    }
    // サポートはどのモンスターのデッキにも入れられる。技はデッキのモンスターの適合技だけ
    if (card.kind === 'skill' && !deck.monsters.includes(card.monsterId)) {
      issues.push({ code: 'notCompatible', message: t('deck.issue.notCompatible', { name: cardName(card) }) });
    }
  }

  if (collection) {
    const all = countCards([...deck.monsters, ...deck.skills]);
    for (const [id, count] of Object.entries(all)) {
      const owned = collection[id] ?? 0;
      if (owned < count) {
        issues.push({ code: 'notOwned', message: t('deck.issue.notOwned', { name: nameOf(id), owned, count }) });
      }
    }
  }
  return issues;
}

export function isDeckValid(deck: Deck, collection?: CardCounts): boolean {
  return validateDeck(deck, collection).length === 0;
}

/**
 * 新しく始めたときのデッキ（仮）：仮モンスターA〜C と、それぞれの技1〜6 を3枚ずつ（54枚）＋仮サポート6枚＝60枚。
 * 同じカードは3枚までなので、技だけでは60枚に届かない分をサポートで埋める。
 */
export const STARTER_MONSTER_KEYS = ['a', 'b', 'c'] as const;
const STARTER_SKILL_NUMBERS = [1, 2, 3, 4, 5, 6] as const;
const STARTER_SUPPORTS = [1, 2, 4] as const;
const STARTER_SUPPORT_COPIES = 2;

export function createPlaceholderStarterDeck(): Deck {
  const skills: string[] = [];
  for (const key of STARTER_MONSTER_KEYS) {
    for (const no of STARTER_SKILL_NUMBERS) {
      for (let i = 0; i < DECK_RULES.maxCopies; i++) skills.push(skillId(key, no));
    }
  }
  for (const no of STARTER_SUPPORTS) {
    for (let i = 0; i < STARTER_SUPPORT_COPIES; i++) skills.push(supportId(no));
  }
  return { monsters: STARTER_MONSTER_KEYS.map(monsterId), skills };
}

/**
 * 【テスト用】ソラモのデッキ（2026-10-23 ユーザー指示「技の発動を見るため、仮のカードはすべてソラモに」）。
 * ソラモ3体＋ソラモの技16種を3枚ずつ（48枚）＋仮サポート1〜6を2枚ずつ（12枚）＝60枚。
 * 正式なスターターデッキの内訳は未承認（これは技を試すための仮の組み合わせ）
 */
const TEST_SORAMO_SUPPORT_COPIES = 2;
export function createSoramoTestDeck(): Deck {
  const skills: string[] = [];
  for (const skill of SORAMO_SKILLS) {
    for (let i = 0; i < DECK_RULES.maxCopies; i++) skills.push(skill.id);
  }
  for (const card of SUPPORTS) {
    for (let i = 0; i < TEST_SORAMO_SUPPORT_COPIES && skills.length < DECK_RULES.skillCount; i++) skills.push(card.id);
  }
  return { monsters: [...SORAMO_TEAM], skills };
}

/** 新しく始めたときのデッキ。いまはテスト用のソラモのデッキ（仮モンスターA〜C の旧スターターは createPlaceholderStarterDeck） */
export function createStarterDeck(): Deck {
  return createSoramoTestDeck();
}

/** 旧スターター（仮モンスターA〜C）と同じ内容の所持カード（テスト用） */
export function createPlaceholderStarterCollection(): Record<string, number> {
  const deck = createPlaceholderStarterDeck();
  return countCards([...deck.monsters, ...deck.skills]);
}

/** 新しく始めたときの所持カード（スターターデッキと同じ内容） */
export function createStarterCollection(): Record<string, number> {
  const deck = createStarterDeck();
  return countCards([...deck.monsters, ...deck.skills]);
}

/** NPC のデッキに入れる仮サポート（各2枚） */
const NPC_SUPPORTS = [1, 2, 4, 5].map(supportId);
const NPC_SUPPORT_COPIES = 2;

/**
 * NPC（ダンジョンの敵・大会の相手）用のデッキを自動で組む。
 * 仮サポートを少し入れ、残りはモンスターの適合技を順番に、上限枚数を超えないように入れて60枚にする。
 */
export function buildAutoDeck(monsters: readonly string[]): Deck {
  const pool = monsters.flatMap((m) => skillsOf(m).map((s) => s.id));
  const skills: string[] = pool.length === 0 ? [] : NPC_SUPPORTS.flatMap((id) => Array<string>(NPC_SUPPORT_COPIES).fill(id));
  const counts: Record<string, number> = countCards(skills);
  if (pool.length === 0) return { monsters, skills };
  let i = 0;
  while (skills.length < DECK_RULES.skillCount && i < pool.length * DECK_RULES.maxCopies) {
    const id = pool[i % pool.length] as string;
    if ((counts[id] ?? 0) < DECK_RULES.maxCopies) {
      counts[id] = (counts[id] ?? 0) + 1;
      skills.push(id);
    }
    i++;
  }
  // 適合技だけで60枚に届かないとき（技の少ないモンスターなど）は、サポートを上限まで足して埋める
  for (const card of SUPPORTS) {
    while (skills.length < DECK_RULES.skillCount && (counts[card.id] ?? 0) < DECK_RULES.maxCopies) {
      counts[card.id] = (counts[card.id] ?? 0) + 1;
      skills.push(card.id);
    }
  }
  return { monsters, skills };
}

/**
 * 所持カードから、指定モンスター3体で組める一番近いデッキを自動で作る（デッキ編集の「おまかせ」）。
 * 適合技を先に入れ、足りない分を持っているサポートで埋める。それでも足りなければ60枚に満たないデッキを返す（画面側で不足を表示）。
 */
export function buildDeckFromCollection(monsters: readonly string[], collection: CardCounts): Deck {
  const skills: string[] = [];
  const used: Record<string, number> = {};
  // 安い技・攻撃を優先しすぎないよう、番号順に1枚ずつ巡回して入れる（適合技 → サポートの順）
  const fill = (candidates: readonly { readonly id: string }[]): void => {
    let added = true;
    while (skills.length < DECK_RULES.skillCount && added) {
      added = false;
      for (const s of candidates) {
        if (skills.length >= DECK_RULES.skillCount) break;
        const n = used[s.id] ?? 0;
        if (n < DECK_RULES.maxCopies && n < (collection[s.id] ?? 0)) {
          used[s.id] = n + 1;
          skills.push(s.id);
          added = true;
        }
      }
    }
  };
  fill(monsters.flatMap((m) => skillsOf(m)));
  fill(SUPPORTS);
  return { monsters, skills };
}
