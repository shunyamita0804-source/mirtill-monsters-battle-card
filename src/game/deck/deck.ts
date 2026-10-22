import { cardCatalog, monsterId, skillId, skillsOf, supportId, SUPPORTS } from '../../data/cards.ts';
import { DECK_RULES } from '../../data/rules.ts';

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
  const nameOf = (id: string): string => cardCatalog.get(id)?.name ?? id;

  if (deck.monsters.length !== DECK_RULES.monsterCount) {
    issues.push({
      code: 'monsterCount',
      message: `モンスターは${DECK_RULES.monsterCount}体必要です（現在${deck.monsters.length}体）`,
    });
  }
  if (!DECK_RULES.allowDuplicateMonsters && new Set(deck.monsters).size !== deck.monsters.length) {
    issues.push({ code: 'duplicateMonster', message: '同じモンスターは1体までです' });
  }
  for (const id of deck.monsters) {
    const card = cardCatalog.get(id);
    if (!card) issues.push({ code: 'unknownCard', message: `存在しないカードです: ${id}` });
    else if (card.kind !== 'monster') issues.push({ code: 'notMonster', message: `${card.name} はモンスターではありません` });
  }

  if (deck.skills.length !== DECK_RULES.skillCount) {
    issues.push({
      code: 'skillCount',
      message: `山札（技カード＋サポート）は${DECK_RULES.skillCount}枚必要です（現在${deck.skills.length}枚）`,
    });
  }
  const skillCounts = countCards(deck.skills);
  for (const [id, count] of Object.entries(skillCounts)) {
    const card = cardCatalog.get(id);
    if (!card) {
      issues.push({ code: 'unknownCard', message: `存在しないカードです: ${id}` });
      continue;
    }
    if (card.kind === 'monster') {
      issues.push({ code: 'notSkill', message: `${card.name} は山札に入れられません（技カード・サポートのみ）` });
      continue;
    }
    if (count > DECK_RULES.maxCopies) {
      issues.push({
        code: 'tooManyCopies',
        message: `${card.name} は${DECK_RULES.maxCopies}枚までです（現在${count}枚）`,
      });
    }
    // サポートはどのモンスターのデッキにも入れられる。技はデッキのモンスターの適合技だけ
    if (card.kind === 'skill' && !deck.monsters.includes(card.monsterId)) {
      issues.push({ code: 'notCompatible', message: `${card.name} はデッキのモンスターの技ではありません` });
    }
  }

  if (collection) {
    const all = countCards([...deck.monsters, ...deck.skills]);
    for (const [id, count] of Object.entries(all)) {
      const owned = collection[id] ?? 0;
      if (owned < count) {
        issues.push({ code: 'notOwned', message: `${nameOf(id)} の所持枚数が足りません（所持${owned}・必要${count}）` });
      }
    }
  }
  return issues;
}

export function isDeckValid(deck: Deck, collection?: CardCounts): boolean {
  return validateDeck(deck, collection).length === 0;
}

/** 新しく始めたときのデッキ（仮）：仮モンスターA〜C と、それぞれの技1〜4・6 を4枚ずつ */
export const STARTER_MONSTER_KEYS = ['a', 'b', 'c'] as const;
const STARTER_SKILL_NUMBERS = [1, 2, 3, 4, 6] as const;

export function createStarterDeck(): Deck {
  const skills: string[] = [];
  for (const key of STARTER_MONSTER_KEYS) {
    for (const no of STARTER_SKILL_NUMBERS) {
      for (let i = 0; i < DECK_RULES.maxCopies; i++) skills.push(skillId(key, no));
    }
  }
  return { monsters: STARTER_MONSTER_KEYS.map(monsterId), skills };
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
  if (pool.length === 0) return { monsters, skills };
  const counts: Record<string, number> = {};
  let i = 0;
  while (skills.length < DECK_RULES.skillCount && i < pool.length * DECK_RULES.maxCopies) {
    const id = pool[i % pool.length] as string;
    if ((counts[id] ?? 0) < DECK_RULES.maxCopies) {
      counts[id] = (counts[id] ?? 0) + 1;
      skills.push(id);
    }
    i++;
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
