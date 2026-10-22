import type { MessageKey } from '../i18n/messages/index.ts';

/**
 * 【仮】序盤イベントの場面（会話の順番・選択肢・場面の終わりにすること）。
 * 台詞の文は src/i18n/messages/story.ts（台本 V1・仮）。ここは順番とつながりだけ。
 *
 * 進み具合（IntroState）の意味
 * - notSeen：まだ会っていない（新しく始めたとき）。家から街に出ると「声かけ」が始まる
 * - invited：声かけの途中（アプリを閉じた等）。もう自動では始めず、話しかければ誘い直す
 * - deferred：「あとで」を選んだ。旧セーブもこれ（導入を突然始めない）
 * - skipped：声かけをスキップした
 * - onRoute：練習場へ向かう途中（街に目的地を出す。案内役は練習場で待つ）
 * - atPractice：練習場に着いた
 * - practiceStarted：最初の練習試合の最中（アプリを閉じたら atPractice に戻す）
 * - completed：最初の練習試合を終えた（勝ち負けは問わない）
 */
export type IntroState =
  | 'notSeen'
  | 'invited'
  | 'deferred'
  | 'skipped'
  | 'onRoute'
  | 'atPractice'
  | 'practiceStarted'
  | 'completed';

export const INTRO_STATES: readonly IntroState[] = [
  'notSeen',
  'invited',
  'deferred',
  'skipped',
  'onRoute',
  'atPractice',
  'practiceStarted',
  'completed',
];

/** 会話の表情（表情の絵の参照名。絵が届くまでは仮の表示） */
export type Expression = 'normal' | 'smile' | 'explain' | 'surprised' | 'troubled' | 'happy';

/** 話している人。system は地の文（名前の札なし） */
export type Speaker = 'neighbor_guide' | 'system';

export type SceneId =
  | 'invite'
  | 'inviteA'
  | 'inviteB'
  | 'invite2'
  | 'reinvite'
  | 'accept'
  | 'defer'
  | 'arrive'
  | 'practiceAsk'
  | 'explain'
  | 'afterWin'
  | 'afterLose'
  | 'replay'
  | 'practiceGo'
  | 'afterReplay'
  | 'tableOffer'
  | 'afterTable';

/** 場面の終わり（またはスキップ）にすること */
export type SceneEffect =
  | { readonly kind: 'intro'; readonly value: IntroState }
  /** 練習試合を始める。tutorial＝最初の練習（バトル画面にヒントを出す） */
  | { readonly kind: 'practice'; readonly tutorial: boolean };

export type SceneStep =
  | { readonly kind: 'line'; readonly text: MessageKey; readonly speaker: Speaker; readonly expression?: Expression }
  | {
      readonly kind: 'choice';
      readonly options: readonly { readonly label: MessageKey; readonly next: SceneId | null }[];
    };

export interface Scene {
  readonly id: SceneId;
  /** 場面の始めにすること（途中でアプリを閉じても進み具合が分かるように） */
  readonly onStart?: readonly SceneEffect[];
  readonly steps: readonly SceneStep[];
  /** 選択肢がない場面の続き */
  readonly then?: SceneId;
  /** 最後まで見たときにすること */
  readonly effects?: readonly SceneEffect[];
  /** スキップしたときにすること（指定がなければ effects と同じ） */
  readonly skipEffects?: readonly SceneEffect[];
}

const guide = (text: MessageKey, expression: Expression): SceneStep => ({ kind: 'line', text, speaker: 'neighbor_guide', expression });
const system = (text: MessageKey): SceneStep => ({ kind: 'line', text, speaker: 'system' });
const intro = (value: IntroState): SceneEffect => ({ kind: 'intro', value });
const SKIP_INVITE = [intro('skipped')];

export const SCENES: Readonly<Record<SceneId, Scene>> = {
  // E01 家から街に出た直後（1回だけ）
  invite: {
    id: 'invite',
    onStart: [intro('invited')],
    steps: [
      guide('story.T001', 'smile'),
      guide('story.T002', 'normal'),
      { kind: 'choice', options: [{ label: 'story.T003.a', next: 'inviteA' }, { label: 'story.T003.b', next: 'inviteB' }] },
    ],
    skipEffects: SKIP_INVITE,
  },
  inviteA: { id: 'inviteA', steps: [guide('story.T004A', 'smile')], then: 'invite2', skipEffects: SKIP_INVITE },
  inviteB: { id: 'inviteB', steps: [guide('story.T004B', 'smile')], then: 'invite2', skipEffects: SKIP_INVITE },
  // E02 世界と遊びへの誘い
  invite2: {
    id: 'invite2',
    steps: [
      guide('story.T005', 'explain'),
      guide('story.T006', 'normal'),
      guide('story.T007', 'smile'),
      { kind: 'choice', options: [{ label: 'story.T008.a', next: 'accept' }, { label: 'story.T008.b', next: 'defer' }] },
    ],
    skipEffects: SKIP_INVITE,
  },
  // 「あとで」・スキップのあと、街で話しかけたとき（誘い直し）
  reinvite: {
    id: 'reinvite',
    steps: [
      guide('story.T007', 'smile'),
      { kind: 'choice', options: [{ label: 'story.T008.a', next: 'accept' }, { label: 'story.T008.b', next: 'defer' }] },
    ],
    skipEffects: [],
  },
  // E03 承諾 → E04 練習場への案内（ここから自分で歩く）
  accept: {
    id: 'accept',
    steps: [guide('story.T009A', 'happy'), guide('story.T010', 'explain'), guide('story.T011', 'normal')],
    effects: [intro('onRoute')],
  },
  defer: { id: 'defer', steps: [guide('story.T009B', 'normal')], effects: [intro('deferred')] },
  // E05 練習場に着いた
  arrive: {
    id: 'arrive',
    onStart: [intro('atPractice')],
    steps: [
      guide('story.T012', 'smile'),
      guide('story.T013', 'explain'),
      { kind: 'choice', options: [{ label: 'story.T014.a', next: 'explain' }, { label: 'story.T014.b', next: null }] },
    ],
    skipEffects: [],
  },
  // 「今はやめる」のあと、練習場で話しかけたとき
  practiceAsk: {
    id: 'practiceAsk',
    steps: [
      guide('story.T013', 'explain'),
      { kind: 'choice', options: [{ label: 'story.T014.a', next: 'explain' }, { label: 'story.T014.b', next: null }] },
    ],
    skipEffects: [],
  },
  // E06 対戦の前の短い説明 → 最初の練習試合（ヒントつき）
  explain: {
    id: 'explain',
    steps: [guide('story.T015', 'explain'), guide('story.T016', 'explain'), guide('story.T017', 'normal')],
    effects: [{ kind: 'practice', tutorial: true }],
  },
  // E07 最初の練習試合のあと（勝ち負けは問わず終わる）
  afterWin: {
    id: 'afterWin',
    steps: [guide('story.T018W', 'happy'), guide('story.T019', 'explain'), guide('story.T020', 'smile'), guide('story.T021', 'normal')],
    effects: [intro('completed')],
  },
  afterLose: {
    id: 'afterLose',
    steps: [guide('story.T018L', 'smile'), guide('story.T019', 'explain'), guide('story.T020', 'smile'), guide('story.T021', 'normal')],
    effects: [intro('completed')],
  },
  // 後日の再開（練習場で話しかけたとき）
  replay: {
    id: 'replay',
    steps: [
      guide('story.T022', 'normal'),
      { kind: 'choice', options: [{ label: 'story.T023.a', next: 'practiceGo' }, { label: 'story.T023.b', next: null }] },
    ],
    skipEffects: [],
  },
  practiceGo: { id: 'practiceGo', steps: [], effects: [{ kind: 'practice', tutorial: false }] },
  afterReplay: { id: 'afterReplay', steps: [guide('story.T021', 'normal')] },
  // 案内役がいないときの練習テーブル
  tableOffer: {
    id: 'tableOffer',
    steps: [
      system('story.sys.tableOffer'),
      { kind: 'choice', options: [{ label: 'story.sys.tableYes', next: 'practiceGo' }, { label: 'story.sys.tableNo', next: null }] },
    ],
    skipEffects: [],
  },
  afterTable: { id: 'afterTable', steps: [system('story.sys.practiceDone')] },
};
