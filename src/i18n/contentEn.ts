import { HIDDEN_MONSTER_ID, MONSTERS, SKILLS, SUPPORTS } from '../data/cards.ts';

/**
 * data/ の固有名・説明の英語（固定 ID → 英語）。日本語は data/ 側の値をそのまま使う（同じ文を二重に持たない）。
 *
 * キーは「種類:ID:項目」。ここにないものは日本語のまま表示し、contentMissing() で一覧にできる。
 * いまのカード・パック・大会・ダンジョン・マップはすべて仮データなので、英語も仮訳（正式な英語名は未決）。
 */

/** 仮カードの英語名（仮訳）。仮であることがわかるよう「Temp」を付ける */
function placeholderCardNames(): Record<string, string> {
  const names: Record<string, string> = {};
  for (const m of MONSTERS) {
    if (m.id === HIDDEN_MONSTER_ID) continue;
    names[`card:${m.id}:name`] = m.name.replace(/^仮モンスター/, 'Temp Monster ');
  }
  for (const s of SKILLS) {
    names[`card:${s.id}:name`] = s.name.replace(/^仮技/, 'Temp Skill ').replace(/^隠し技（未確定）/, 'Hidden Skill (TBD) ');
  }
  for (const s of SUPPORTS) {
    names[`card:${s.id}:name`] = s.name.replace(/^仮サポート/, 'Temp Support ').replace(/^仮全体/, 'Temp Field ');
  }
  return names;
}

export const CONTENT_EN: Readonly<Record<string, string>> = {
  ...placeholderCardNames(),
  [`card:${HIDDEN_MONSTER_ID}:name`]: '??? (Hidden monster, TBD)',
  [`card:${HIDDEN_MONSTER_ID}:description`]:
    'A hidden monster you can restore by collecting 10 shards. Its official name, art and abilities are not decided yet.',
  'card:monster:description': 'A temporary monster for screen checks. Not official monster data.',

  // パック（仮）
  'pack:pack-01:name': 'Set 1 Pack (Temp)',
  'pack:pack-01:description': 'Temp Monsters A–D, their skills, and temp supports.',
  'pack:pack-01:unlockHint': 'Available from the start',
  'pack:pack-02:name': 'Set 2 Pack (Temp)',
  'pack:pack-02:description': 'Temp Monsters E–G, their skills, and temp supports.',
  'pack:pack-02:unlockHint': 'Unlocks when you first win the Rank E Cup',
  'pack:pack-03:name': 'Set 3 Pack (Temp)',
  'pack:pack-03:description': 'Temp Monsters H and I, their skills, and the hidden monster’s skills.',
  'pack:pack-03:unlockHint': 'Unlocks when you first win the Rank D Cup',

  // 大会（仮）
  'tournament:tournament-e:name': 'Rank E Cup',
  'tournament:tournament-e:description': 'Your first official cup (details are temporary). Win 3 in a row to take the title.',
  'tournament:tournament-d:name': 'Rank D Cup',
  'tournament:tournament-d:description': 'A cup for Rank E champions (details are temporary).',
  'opponent:e-1:name': 'Temp opponent (E, Round 1)',
  'opponent:e-2:name': 'Temp opponent (E, Semifinal)',
  'opponent:e-3:name': 'Temp opponent (E, Final)',
  'opponent:d-1:name': 'Temp opponent (D, Round 1)',
  'opponent:d-2:name': 'Temp opponent (D, Semifinal)',
  'opponent:d-3:name': 'Temp opponent (D, Final)',

  // ダンジョン（仮）
  'dungeon:dungeon-01:name': 'Dungeon 1 (Temp name)',
  'dungeon:dungeon-01:description': '3 basement floors. Defeat the boss at the bottom to clear it. (Name and enemies are temporary)',
  'opponent:enc-b1-a:name': 'Wild monster pack (Temp)',
  'opponent:enc-b1-b:name': 'Wild monster pack (Temp)',
  'opponent:enc-b2-a:name': 'Treasure guards (Temp)',
  'opponent:enc-b2-b:name': 'Treasure guards (Temp)',
  'opponent:enc-b2-c:name': 'Stairway keeper (Temp)',
  'opponent:enc-b3-a:name': 'Deep-floor pack (Temp)',
  'opponent:enc-b3-b:name': 'Deep-floor pack (Temp)',
  'opponent:enc-b3-boss:name': 'Boss of the depths (Temp)',

  // ---------- マップ・扉・家具（仮マップ。src/data/maps.ts） ----------
  'map:town:name': 'Town (Temp map)',
  'map:home:name': 'Home (Temp map)',
  'map:shop:name': 'Card Shop (Temp map)',
  'map:hall:name': 'Tournament Hall (Temp map)',
  'map:dungeon-01-b1:name': 'B1F',
  'map:dungeon-01-b2:name': 'B2F',
  'map:dungeon-01-b3:name': 'B3F',
  // 街
  'object:door-hall:label': 'Tournament Hall',
  'object:door-dungeon:label': 'Dungeon Entrance',
  'object:door-home:label': 'Home',
  'object:door-shop:label': 'Card Shop',
  'object:sign-fountain:label': 'Fountain',
  'object:sign-fountain:message': "The fountain in the middle of town. (Temp map: the official town background isn't made yet)",
  // 家
  'object:home-bed:label': 'Bed',
  'object:home-map:label': 'Wall map',
  'object:home-shelf:label': 'Bookshelf',
  'object:home-desk:label': 'Desk',
  'object:home-exit:label': 'Outside',
  // カードショップ
  'object:shop-clerk:label': 'Clerk',
  'object:shop-counter:label': 'Counter',
  'object:shop-gacha:label': 'Card Gacha Machine',
  'object:shop-shelf:label': 'Card shelf',
  'object:shop-shelf:message': 'Cards are neatly lined up.',
  'object:shop-exit:label': 'Outside',
  // 大会会場
  'object:hall-receptionist:label': 'Reception',
  'object:hall-desk:label': 'Reception desk',
  'object:hall-table:label': 'Battle table',
  'object:hall-table:message': 'The battle table in the middle of the indoor hall. Tournament matches are played here.',
  'object:hall-seats-l:label': 'Seats',
  'object:hall-seats-l:message': 'Spectator seats.',
  'object:hall-seats-r:label': 'Seats',
  'object:hall-seats-r:message': 'Spectator seats.',
  'object:hall-exit:label': 'Outside',
  // ダンジョン
  'object:b1-down:label': 'To B2F',
  'object:b1-exit:label': 'Back to town',
  'object:b2-down:label': 'To B3F',
  'object:b2-up:label': 'To B1F',
  'object:b3-up:label': 'To B2F',
};
