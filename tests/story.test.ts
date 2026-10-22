import { describe, expect, it } from 'vitest';
import { getMap, PRACTICE, TOWN, type MapDefinition, type NpcObject } from '../src/data/maps.ts';
import { INTRO_STATES, SCENES, type IntroState, type Scene, type SceneId, type SceneStep } from '../src/data/storyScenes.ts';
import { createNewSave, normalizeSave, SAVE_VERSION, type SaveData } from '../src/game/save/saveData.ts';
import {
  applySceneEffects,
  guidePlace,
  isNpcPresent,
  sceneAfterPractice,
  sceneOnEnter,
  sceneOnTable,
  sceneOnTalk,
  showsPracticeGoal,
  startPractice,
} from '../src/game/story/intro.ts';
import { findPath, isBlocked, objectsAt } from '../src/game/world/world.ts';
import { sanitizeLocation } from '../src/game/progress/dungeon.ts';

const withIntro = (intro: IntroState): SaveData => ({ ...createNewSave(), story: { intro } });

/** 選択肢で選んだ順に場面をたどり、最後の場面の effects をセーブに当てる（onStart も当てる） */
function play(save: SaveData, start: SceneId, picks: number[] = []): { save: SaveData; ended: SceneId | null; practice: boolean | null } {
  let s = save;
  let id: SceneId | null = start;
  let last: SceneId | null = null;
  let practice: boolean | null = null;
  const queue = [...picks];
  while (id) {
    const scene: Scene = SCENES[id];
    s = applySceneEffects(s, scene.onStart ?? []);
    last = id;
    const choice: SceneStep | undefined = scene.steps.find((st) => st.kind === 'choice');
    if (choice && choice.kind === 'choice') {
      const pick = queue.shift() ?? 0;
      id = choice.options[pick]?.next ?? null;
      continue;
    }
    if (scene.then) {
      id = scene.then;
      continue;
    }
    s = applySceneEffects(s, scene.effects ?? []);
    for (const e of scene.effects ?? []) if (e.kind === 'practice') practice = e.tutorial;
    id = null;
  }
  return { save: s, ended: last, practice };
}

describe('序盤イベント：セーブ', () => {
  it('新しく始めると「まだ会っていない」で、自分の家の中から始まる', () => {
    const save = createNewSave();
    expect(save.story.intro).toBe('notSeen');
    expect(save.location.mapId).toBe('home');
    expect(isBlocked(getMap('home') as MapDefinition, save.location.x, save.location.y, () => true)).toBe(false);
  });

  it('旧セーブ（version 2）は「あとで」と同じ状態になり、導入が突然始まらない', () => {
    const { story: _story, ...old } = createNewSave();
    const loaded = normalizeSave({ ...old, version: 2, location: { mapId: 'town', x: 10, y: 18, dir: 'up' } });
    expect(loaded?.version).toBe(SAVE_VERSION);
    expect(loaded?.story.intro).toBe('deferred');
    if (loaded) expect(sceneOnEnter(loaded, 'town')).toBeNull();
  });

  it('旧セーブの位置が、作り直した街で建物の中になっていたら、街の出現位置に戻す（閉じ込められない）', () => {
    const inside = { ...withIntro('deferred'), location: { mapId: 'town', x: 3, y: 2, dir: 'down' as const } };
    expect(isBlocked(TOWN, 3, 2, () => true)).toBe(true);
    const fixed = sanitizeLocation(inside);
    expect(fixed.location).toMatchObject({ mapId: 'town', x: TOWN.spawn.x, y: TOWN.spawn.y });
    const ok = { ...inside, location: { mapId: 'town', x: TOWN.spawn.x, y: TOWN.spawn.y, dir: 'down' as const } };
    expect(sanitizeLocation(ok)).toBe(ok);
  });

  it('練習試合の最中に閉じたセーブは「練習場に着いた」に戻る。読めない値は「あとで」', () => {
    expect(normalizeSave({ ...withIntro('practiceStarted') })?.story.intro).toBe('atPractice');
    expect(normalizeSave({ ...createNewSave(), story: { intro: 'xxx' } })?.story.intro).toBe('deferred');
    expect(normalizeSave({ ...createNewSave(), story: null })?.story.intro).toBe('deferred');
  });
});

describe('序盤イベント：場面のつながり', () => {
  it('すべての続き・選択肢の行き先が存在する', () => {
    for (const scene of Object.values(SCENES)) {
      if (scene.then) expect(SCENES[scene.then], scene.id).toBeDefined();
      for (const st of scene.steps) {
        if (st.kind === 'choice') for (const o of st.options) if (o.next) expect(SCENES[o.next], `${scene.id}→${o.next}`).toBeDefined();
      }
    }
  });

  it('最初に街へ出たときだけ声かけが始まる', () => {
    expect(sceneOnEnter(withIntro('notSeen'), 'town')).toBe('invite');
    expect(sceneOnEnter(withIntro('notSeen'), 'home')).toBeNull();
    for (const intro of INTRO_STATES.filter((i) => i !== 'notSeen')) expect(sceneOnEnter(withIntro(intro), 'town'), intro).toBeNull();
  });

  it('声かけの途中で閉じても、もう自動では始まらない（話しかければ誘い直す）', () => {
    const s = applySceneEffects(withIntro('notSeen'), SCENES.invite.onStart ?? []);
    expect(s.story.intro).toBe('invited');
    expect(sceneOnEnter(s, 'town')).toBeNull();
    expect(sceneOnTalk(s)).toBe('reinvite');
  });

  it('「練習してみる」→ 練習場へ向かう → 着くと会話 → 対戦（ヒントつき）→ 負けても終わる → 後日また練習できる', () => {
    // まだ／少しだけ のどちらでも同じ誘いにつながる
    for (const first of [0, 1]) {
      const r = play(withIntro('notSeen'), 'invite', [first, 0]);
      expect(r.ended).toBe('accept');
      expect(r.save.story.intro).toBe('onRoute');
    }
    let s = play(withIntro('notSeen'), 'invite', [0, 0]).save;
    expect(showsPracticeGoal(s, 'town')).toBe(true);
    expect(guidePlace(s.story.intro)).toBe('practice');
    expect(sceneOnEnter(s, 'practice')).toBe('arrive');
    const r = play(s, 'arrive', [0]);
    expect(r.ended).toBe('explain');
    expect(r.practice).toBe(true);
    s = startPractice(r.save, true);
    expect(s.story.intro).toBe('practiceStarted');
    const after = sceneAfterPractice(s, { winner: 'opponent', tutorial: true });
    expect(after).toBe('afterLose');
    s = play(s, after).save;
    expect(s.story.intro).toBe('completed');
    expect(showsPracticeGoal(s, 'town')).toBe(false);
    expect(sceneOnTalk(s)).toBe('replay');
    const again = play(s, 'replay', [0]);
    expect(again.practice).toBe(false);
    expect(startPractice(again.save, false).story.intro).toBe('completed');
    expect(sceneAfterPractice(again.save, { winner: 'player', tutorial: false })).toBe('afterReplay');
  });

  it('勝っても負けても最初の練習は終わる', () => {
    for (const winner of ['player', 'opponent', 'draw'] as const) {
      const s = play(withIntro('practiceStarted'), sceneAfterPractice(withIntro('practiceStarted'), { winner, tutorial: true })).save;
      expect(s.story.intro, winner).toBe('completed');
    }
  });

  it('「あとで」を選んでも街を歩け、話しかければ誘い直す。練習テーブルでいつでも練習できる', () => {
    const r = play(withIntro('notSeen'), 'invite', [0, 1]);
    expect(r.save.story.intro).toBe('deferred');
    expect(sceneOnTalk(r.save)).toBe('reinvite');
    expect(sceneOnTable(r.save)).toBe('tableOffer');
    const t = play(r.save, 'tableOffer', [0]);
    expect(t.practice).toBe(false);
    expect(sceneAfterPractice(r.save, { winner: 'player', tutorial: false })).toBe('afterTable');
    expect(play(r.save, 'reinvite', [0]).save.story.intro).toBe('onRoute');
  });

  it('練習場で「今はやめる」を選んでも、話しかければまた対戦できる', () => {
    const r = play(withIntro('onRoute'), 'arrive', [1]);
    expect(r.save.story.intro).toBe('atPractice');
    expect(r.practice).toBeNull();
    expect(sceneOnTalk(r.save)).toBe('practiceAsk');
    expect(sceneOnTable(r.save)).toBe('practiceAsk');
    expect(play(r.save, 'practiceAsk', [0]).practice).toBe(true);
  });

  it('声かけをスキップすると「スキップ」になり、街で話しかければ誘い直す', () => {
    for (const id of ['invite', 'inviteA', 'inviteB', 'invite2'] as const) {
      const s = applySceneEffects(withIntro('invited'), SCENES[id].skipEffects ?? SCENES[id].effects ?? []);
      expect(s.story.intro, id).toBe('skipped');
      expect(sceneOnTalk(s)).toBe('reinvite');
    }
  });
});

describe('序盤イベント：案内役の位置', () => {
  const guides = [...TOWN.objects, ...PRACTICE.objects].filter((o): o is NpcObject => o.type === 'npc');

  it('どの進み具合でも、案内役は街か練習場のどちらか一方だけにいる', () => {
    for (const intro of INTRO_STATES) {
      const present = guides.filter((g) => isNpcPresent(withIntro(intro), g));
      expect(present, intro).toHaveLength(1);
    }
  });

  it.each([TOWN, PRACTICE].map((m) => [m.id, m] as const))('%s：案内役がいても、すべての出入口・調べる物に行ける（道・入口をふさがない）', (_id, map) => {
    const blocked = (x: number, y: number): boolean => isBlocked(map, x, y, () => true);
    for (const obj of map.objects) {
      if (obj.type === 'npc') continue;
      const goals: { x: number; y: number }[] = [];
      const w = 'w' in obj ? obj.w : 1;
      const h = 'h' in obj ? obj.h : 1;
      for (let dy = -1; dy <= h; dy++) for (let dx = -1; dx <= w; dx++) goals.push({ x: obj.x + dx, y: obj.y + dy });
      const ok = goals.some((g) => !blocked(g.x, g.y) && findPath(map, map.spawn, g, blocked) !== null);
      expect(ok, obj.id).toBe(true);
    }
  });

  it('案内役は出入口の上・前に立たない', () => {
    for (const g of guides) {
      const map = g.id === 'guide-town' ? TOWN : PRACTICE;
      for (const [dx, dy] of [[0, 0], [0, 1], [0, -1], [1, 0], [-1, 0]] as const) {
        expect(objectsAt(map, g.x + dx, g.y + dy).some((o) => o.type === 'warp'), g.id).toBe(false);
      }
    }
  });
});
