/**
 * 正式カードの英語【仮訳】（2026-10-23。正式な英語訳は未承認）。
 *
 * 正式な英語が決まったら、このファイルの文を差し替える（日本語の正本 src/data/official/ は変えない）。
 * 仮訳であることを忘れないよう、正式カードの英語はここにまとめて、ほかの英訳（contentEn.ts）と分けている。
 * キーは「card:<ゲーム内 ID>:name」「card:<ゲーム内 ID>:effect」「card:<ゲーム内 ID>:description」。
 */
export const OFFICIAL_DRAFT_EN: Readonly<Record<string, string>> = {
  'card:mon-soramo:name': 'Soramo',
  'card:mon-soramo:description': 'Soramo (Monster Rank C).',

  'card:skl-soramo-01:name': 'Scratch',
  'card:skl-soramo-02:name': 'Body Slam',
  'card:skl-soramo-03:name': 'Reckless Tackle',
  'card:skl-soramo-03:effect': 'If this skill hits, your monster loses 1 life.',
  'card:skl-soramo-04:name': 'Fury Scratch',
  'card:skl-soramo-05:name': 'Tail Attack',
  'card:skl-soramo-06:name': 'Star Dive',
  'card:skl-soramo-07:name': 'Howl',
  'card:skl-soramo-07:effect': "The chosen enemy monster's next POW skill deals 1 less damage.",
  'card:skl-soramo-08:name': 'Sand Throw',
  'card:skl-soramo-08:effect': 'The chosen enemy monster cannot attack next time.',
  'card:skl-soramo-09:name': 'Soramo Beam',
  'card:skl-soramo-10:name': 'Stardust Ray',
  'card:skl-soramo-11:name': 'Curl Up',
  'card:skl-soramo-11:effect': 'POW skill damage -3.',
  'card:skl-soramo-12:name': 'Tail Guard',
  'card:skl-soramo-12:effect': 'INT skill damage -3.',
  'card:skl-soramo-13:name': 'Stand Firm',
  'card:skl-soramo-13:effect': 'Attack damage -3.',
  'card:skl-soramo-14:name': 'Nimble Jump',
  'card:skl-soramo-14:effect': 'Dodge the attack.',
  'card:skl-soramo-15:name': 'Star Guard',
  'card:skl-soramo-15:effect': 'Attack damage -3.',
  'card:skl-soramo-16:name': 'Star Shadow Step',
  'card:skl-soramo-16:effect': 'Dodge the attack.',
};
