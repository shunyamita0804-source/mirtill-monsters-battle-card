import windowUrl from '@assets/images/ui/talk/dialogue_window_blank.png';
import nameUrl from '@assets/images/ui/talk/name_label_blank.png';
import choiceUrl from '@assets/images/ui/talk/button_blank.png';
import { SCENES, type Expression, type SceneEffect, type SceneId, type SceneStep, type Speaker } from '../../data/storyScenes.ts';
import { t } from '../../i18n/i18n.ts';
import type { MessageKey } from '../../i18n/messages/index.ts';
import { button, h } from '../dom.ts';

/**
 * 会話（文字送り・選択肢・スキップ）。見た目はミスティックモンスターズの会話 UI の画像
 * （セリフ枠・名前の札・選択肢のボタン。assets/images/ui/talk/）を使う。
 *
 * - 画面のどこをタップしても次へ（文字を出している途中なら、まず全部出す）
 * - 選択肢はボタン（高さ 46px）。スキップは右上
 * - 会話の絵（バストアップ・表情6種）は制作中。届くまでは「仮」の札を出す。届いたら PORTRAITS に足すだけで差し替わる
 */

/** 会話の絵（人物 → 表情 → 画像の URL）。正式な絵が届いたらここに足す */
const PORTRAITS: Readonly<Record<Exclude<Speaker, 'system'>, Partial<Record<Expression, string>>>> = {
  neighbor_guide: {},
};

const SPEAKER_NAME: Readonly<Record<Exclude<Speaker, 'system'>, MessageKey>> = {
  neighbor_guide: 'story.speaker.neighborGuide',
};

/** 1文字を出す間隔（ミリ秒） */
const CHAR_MS = 28;

export interface DialogueOptions {
  /** 場面の始め・終わり・スキップで、進み具合を変えるとき（すぐに保存する） */
  readonly onEffects: (effects: readonly SceneEffect[]) => void;
  /** 会話が閉じたとき。練習試合を始める場面なら practice が入る */
  readonly onClose: (practice: { readonly tutorial: boolean } | null) => void;
}

export interface DialogueHandle {
  close(): void;
}

export function playScene(parent: HTMLElement, start: SceneId, options: DialogueOptions): DialogueHandle {
  let sceneId: SceneId = start;
  let stepIndex = -1;
  let typing: ReturnType<typeof setInterval> | null = null;
  let fullText = '';
  let closed = false;

  const portrait = h('div', { class: 'talk__portrait' });
  const name = h('div', { class: 'talk__name' });
  const text = h('p', { class: 'talk__text', attrs: { 'aria-live': 'polite' } });
  const next = h('span', { class: 'talk__next', text: '▼', attrs: { 'aria-hidden': 'true' } });
  const choices = h('div', { class: 'talk__choices', attrs: { role: 'group' } });
  const win = h('div', { class: 'talk__window' }, name, text, next);
  const skip = button(t('story.ui.skip'), () => doSkip(), 'btn btn--small talk__skip');
  const overlay = h(
    'div',
    { class: 'talk', attrs: { role: 'dialog', 'aria-modal': 'true' }, on: { click: () => advance() } },
    skip,
    portrait,
    choices,
    win,
  );
  overlay.style.setProperty('--talk-window', `url("${windowUrl}")`);
  overlay.style.setProperty('--talk-name', `url("${nameUrl}")`);
  overlay.style.setProperty('--talk-choice', `url("${choiceUrl}")`);
  skip.addEventListener('click', (e) => e.stopPropagation());

  const onKey = (e: KeyboardEvent): void => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      advance();
    }
  };
  window.addEventListener('keydown', onKey);
  parent.append(overlay);

  const stopTyping = (): void => {
    if (typing) clearInterval(typing);
    typing = null;
    text.textContent = fullText;
    overlay.classList.add('is-ready');
  };

  const showSpeaker = (speaker: Speaker, expression: Expression | undefined): void => {
    if (speaker === 'system') {
      name.hidden = true;
      portrait.hidden = true;
      return;
    }
    name.hidden = false;
    name.textContent = t(SPEAKER_NAME[speaker]);
    portrait.hidden = false;
    const url = expression ? PORTRAITS[speaker][expression] : undefined;
    portrait.dataset.expression = expression ?? 'normal';
    if (url) {
      portrait.replaceChildren(h('img', { class: 'talk__portrait-img', attrs: { src: url, alt: '', draggable: 'false' } }));
    } else {
      // 仮：会話の絵が届くまでの札（人物の絵は勝手に作らない）
      portrait.replaceChildren(
        h('span', { class: 'talk__portrait-temp', text: t('story.ui.portraitTemp') }),
        h('span', { class: 'talk__portrait-expr', text: t(`story.expr.${expression ?? 'normal'}` as MessageKey) }),
        h('span', { class: 'talk__portrait-note', text: t('story.ui.portraitNote') }),
      );
    }
  };

  const showLine = (step: Extract<SceneStep, { kind: 'line' }>): void => {
    choices.replaceChildren();
    overlay.classList.remove('is-choice', 'is-ready');
    showSpeaker(step.speaker, step.expression);
    fullText = t(step.text);
    text.textContent = '';
    let n = 0;
    const chars = [...fullText];
    typing = setInterval(() => {
      n += 1;
      text.textContent = chars.slice(0, n).join('');
      if (n >= chars.length) stopTyping();
    }, CHAR_MS);
  };

  const showChoice = (step: Extract<SceneStep, { kind: 'choice' }>): void => {
    overlay.classList.add('is-choice', 'is-ready');
    choices.replaceChildren(
      ...step.options.map((o) => {
        const b = h('button', { class: 'talk__choice', text: t(o.label), attrs: { type: 'button' } });
        b.addEventListener('click', (e) => {
          e.stopPropagation();
          if (closed) return;
          if (o.next) enterScene(o.next);
          else finish(null);
        });
        return b;
      }),
    );
  };

  const runStep = (): void => {
    const scene = SCENES[sceneId];
    const step = scene.steps[stepIndex];
    if (!step) {
      endScene();
      return;
    }
    if (step.kind === 'line') showLine(step);
    else showChoice(step);
  };

  const enterScene = (id: SceneId): void => {
    sceneId = id;
    stepIndex = 0;
    const scene = SCENES[id];
    if (scene.onStart?.length) options.onEffects(scene.onStart);
    runStep();
  };

  /** 場面の最後まで来た：続きの場面へ、なければ終わりの効果を当てて閉じる */
  const endScene = (): void => {
    const scene = SCENES[sceneId];
    if (scene.then) {
      enterScene(scene.then);
      return;
    }
    finish(scene.effects ?? []);
  };

  const finish = (effects: readonly SceneEffect[] | null): void => {
    if (closed) return;
    const list = effects ?? [];
    const intro = list.filter((e) => e.kind === 'intro');
    if (intro.length) options.onEffects(intro);
    const practice = list.find((e): e is Extract<SceneEffect, { kind: 'practice' }> => e.kind === 'practice');
    close();
    options.onClose(practice ? { tutorial: practice.tutorial } : null);
  };

  function advance(): void {
    if (closed) return;
    if (typing) {
      stopTyping();
      return;
    }
    const step = SCENES[sceneId].steps[stepIndex];
    if (step?.kind === 'choice') return; // 選択肢はボタンで選ぶ
    stepIndex += 1;
    runStep();
  }

  function doSkip(): void {
    if (closed) return;
    const scene = SCENES[sceneId];
    finish(scene.skipEffects ?? scene.effects ?? []);
  }

  function close(): void {
    if (closed) return;
    closed = true;
    if (typing) clearInterval(typing);
    window.removeEventListener('keydown', onKey);
    overlay.remove();
  }

  enterScene(start);
  return { close };
}
