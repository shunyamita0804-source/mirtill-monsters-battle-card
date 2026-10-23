import type { MessageEntry } from '../i18n.ts';

/**
 * 序盤イベント（となりの家の女性・カード練習場・練習試合）の会話とヒント。
 *
 * - 台詞は「セイモン序盤会話台本 V1」（Seimon_Opening_Tutorial_DesignPack_20261022）の【仮】。ユーザー承認前は正式シナリオではない
 * - 英語は同じ資料の仮訳（正式な英文は未承認）
 * - 女性の正式な名前は未定。名前の札には仮の呼び名「となりの家の女性」を出す
 */
export const STORY = {
  // 名前の札（話している人）
  'story.speaker.neighborGuide': { ja: '隣家の女性', en: 'Neighbor' },

  // 会話の操作
  'story.ui.skip': { ja: 'スキップ', en: 'Skip' },
  'story.ui.next': { ja: '次へ', en: 'Next' },
  'story.ui.portraitTemp': { ja: '仮', en: 'Temp' },
  'story.ui.portraitNote': { ja: '会話の絵は制作中', en: 'Portrait in progress' },
  'story.expr.normal': { ja: '通常', en: 'Normal' },
  'story.expr.smile': { ja: '笑顔', en: 'Smile' },
  'story.expr.explain': { ja: '説明', en: 'Explain' },
  'story.expr.surprised': { ja: '驚き', en: 'Surprised' },
  'story.expr.troubled': { ja: '困り', en: 'Troubled' },
  'story.expr.happy': { ja: '喜び', en: 'Happy' },

  // 街の目的地の案内（練習場へ向かう間だけ）
  'story.goal.practice': { ja: '目的地：カード練習場（北西）', en: 'Go to: Practice Hall (northwest)' },
  'story.npc.marker': { ja: '人', en: 'NPC' },

  // E01 家から出た直後
  'story.T001': { ja: 'あ、おはよう。ちょうど会いたいと思ってたの。', en: 'Hey, good morning. I was just hoping to see you.' },
  'story.T002': {
    ja: '最近、街でもカードバトルの話ばかり。あなたはもう遊んでみた？',
    en: 'Everyone in town has been talking about card battles lately. Have you tried one yet?',
  },
  'story.T003.a': { ja: 'まだ', en: 'Not yet' },
  'story.T003.b': { ja: '少しだけ', en: 'Just a little' },
  'story.T004A': { ja: 'それなら、ちょうどよかった。', en: "Then I've got perfect timing." },
  'story.T004B': { ja: 'じゃあ、今度一緒にやってみない？', en: "Then why don't we try it together sometime?" },

  // E02 世界と遊びへの誘い
  'story.T005': {
    ja: '聖獣をモチーフにしたカードで対戦するの。いま、あちこちで人気なんだよ。',
    en: "You battle using cards inspired by sacred beasts. It's catching on everywhere.",
  },
  'story.T006': { ja: '本物の聖獣が戦うわけじゃないから、そこは安心して。', en: "The real beasts don't fight, so there's no need to worry." },
  'story.T007': { ja: 'よかったら、練習場で一度やってみない？', en: 'Would you like to try a practice match?' },
  'story.T008.a': { ja: '練習してみる', en: "Let's practice" },
  'story.T008.b': { ja: 'あとで', en: 'Maybe later' },
  'story.T009A': { ja: '決まり！　じゃあ、練習場へ行こう。', en: "It's a deal! Let's head to the practice hall." },
  'story.T009B': { ja: 'もちろん。気が向いたら声をかけてね。', en: 'Of course. Just let me know whenever you feel like it.' },

  // E04 練習場への案内
  'story.T010': {
    ja: '練習場は街の北西側。噴水のある広場を通っていけるよ。',
    en: 'The practice hall is in the northwest part of town. You can get there through the fountain square.',
  },
  'story.T011': { ja: '急がなくていいから、景色を見ながら行こう。', en: 'No need to rush. We can enjoy the walk.' },

  // E05 カード練習場の入口・練習開始
  'story.T012': { ja: '着いたね。ここなら、初めてでも気軽に試せるよ。', en: 'Here we are. This is a great place to give it a try.' },
  'story.T013': { ja: '難しく考えなくて大丈夫。カードを使いながら覚えていこう。', en: "Don't worry about remembering everything. You'll learn as you play." },
  'story.T014.a': { ja: '対戦してみる', en: 'Start a match' },
  'story.T014.b': { ja: '今はやめる', en: 'Not right now' },

  // E06 対戦開始前
  'story.T015': { ja: '対戦では、三体の聖獣カードを場に出すんだ。', en: 'In a card battle, you start with three sacred beast cards in play.' },
  'story.T016': {
    ja: '手札の技を使って、相手のカードのライフを減らしていくの。',
    en: "You use cards from your hand to reduce the Life of your opponent's cards.",
  },
  'story.T017': {
    ja: 'カードをマナに変えるか、技として使うか。その選び方が大事だよ。',
    en: 'Choosing which cards to play and which to turn into Mana makes a big difference.',
  },

  // E07 対戦後
  'story.T018W': { ja: '初めてとは思えないね。なかなかやるじゃない。', en: 'Not bad at all for your first match.' },
  'story.T018L': {
    ja: 'いい勝負だったね。最初は少しずつ慣れれば大丈夫。',
    en: "That was a good match! You'll get the hang of it with practice.",
  },
  'story.T019': {
    ja: 'ほかのカードを集めたり、デッキを工夫したりすると、戦い方も変わってくるよ。',
    en: 'Collecting more cards and building new decks opens up all kinds of strategies.',
  },
  'story.T020': {
    ja: '街にはほかにもいろんな場所があるし、自由に見て回ってね。',
    en: "There's plenty more to see around town, so feel free to explore.",
  },
  'story.T021': { ja: 'また練習したくなったら、ここで声をかけて。', en: 'If you want another practice match, just come find me here.' },

  // 後日の再開
  'story.T022': { ja: 'カードの練習、またしてみる？', en: 'Want to practice card battles again?' },
  'story.T023.a': { ja: '練習する', en: 'Practice' },
  'story.T023.b': { ja: 'やめておく', en: 'Not now' },

  // 案内役がいないときの練習テーブル（地の文）
  'story.sys.tableOffer': { ja: '練習テーブルだ。練習試合をしてみる？', en: 'A practice table. Play a practice match?' },
  'story.sys.tableYes': { ja: '練習試合をする', en: 'Play a match' },
  'story.sys.tableNo': { ja: 'やめておく', en: 'Not now' },
  'story.sys.practiceDone': { ja: '練習試合が終わった。', en: 'The practice match is over.' },

  // 練習試合
  'story.practice.title': { ja: '練習試合', en: 'Practice Match' },

  // 練習試合のヒント（バトルの場面に合わせて1回ずつ）
  'story.hint.title': { ja: 'ヒント', en: 'Tip' },
  'story.hint.ok': { ja: 'わかった', en: 'Got it' },
  'story.hint.monsters': {
    ja: '下の3体があなたのモンスターカード、上の3体が相手。カードの下の数字がライフです。',
    en: "The three cards at the bottom are your monsters; the top three are your opponent's. The number under each card is its Life.",
  },
  'story.hint.firstMana': {
    ja: '先攻の最初のターンは攻撃できません。手札を2枚までマナにできます（カード1枚＝1マナ）。選んだら「マナにする」、終わったら「ターン終了」。',
    en: "On the first player's first turn you can't attack. You can turn up to 2 cards into Mana (1 card = 1 Mana). Pick them, tap Make Mana, then End Turn.",
  },
  'story.hint.attack': {
    ja: '攻撃：手札の技カードを選んで「使う」。マナが足りる技だけ使えます（1体につき1ターン1回）。使える技がなければ「攻撃終了」。',
    en: "Attack: pick a skill card in your hand and tap Use. You can only use skills you have enough Mana for (once per monster per turn). If you can't use any, tap End Attack.",
  },
  'story.hint.mana': {
    ja: 'マナ化：使わないカードを選んで「マナにする」。カード1枚＝1マナで、マナは次のターンにも残ります。終わったら「ターン終了」。',
    en: 'Mana: pick cards you won\'t use and tap Make Mana. 1 card = 1 Mana, and Mana carries over to later turns. Tap End Turn when you\'re done.',
  },
  'story.hint.defense': {
    ja: '相手の攻撃！狙われたモンスターの防御・回避カードで、ダメージを減らせます。使わないときは「守備しない」。',
    en: "Enemy attack! Use the targeted monster's Guard or Dodge cards to reduce the damage. Tap Pass if you don't want to.",
  },
  'story.hint.result': {
    ja: '相手のモンスター3体をすべて倒すか、相手が山札からカードを引けなくなると勝ちです。',
    en: "You win by knocking out all three of your opponent's monsters, or when your opponent can't draw a card from their deck.",
  },
} as const satisfies Record<string, MessageEntry>;
