import blankUrl from '@assets/images/ui/button/btn_command_blank.png';
import wineUrl from '@assets/images/ui/button/btn_command_blank_wine.png';
import { h } from '../dom.ts';

/**
 * ボタンの色。
 * - 'action'：青（使う・マナにする・進むなど、何かを行うボタン）
 * - 'cancel'：ワインレッド（やめる・攻撃終了・ターン終了など、やめる／終えるボタン）
 */
export type CommandTone = 'action' | 'cancel';

/**
 * 金の枠のコマンドボタン（ユーザー提供の UI 素材。ワインレッドは青地を塗り替えたもの）。無地に、その場面に合った文字を重ねる。
 */
export function commandButton(label: string, onTap: () => void, tone: CommandTone = 'action'): HTMLButtonElement {
  const el = h(
    'button',
    {
      // 長い文字（「マナにする（2枚）」など）は枠からはみ出さないよう小さめの文字にする
      class: `command-btn command-btn--${tone}${label.length > 6 ? ' is-long' : ''}`,
      attrs: { type: 'button', 'aria-label': label },
      on: { click: onTap },
    },
    h('img', { class: 'command-btn__img', attrs: { src: tone === 'cancel' ? wineUrl : blankUrl, alt: '', draggable: 'false' } }),
    h('span', { class: 'command-btn__label', text: label }),
  );
  return el as HTMLButtonElement;
}

export interface ConfirmChoice {
  /** 進む方のボタンの文字（例：「マナ化へ進む」） */
  readonly ok: string;
  /** やめる方のボタンの文字（例：「攻撃を続ける」） */
  readonly cancel: string;
}

/**
 * 画面中央に出す確認。「はい／いいえ」ではなく、その場面に合った文字のボタンを縦に並べる。
 * 進む方で onOk、やめる方・外側のタップで閉じる。
 */
export function confirmCommand(parent: HTMLElement, message: string, choice: ConfirmChoice, onOk: () => void): void {
  const close = (): void => layer.remove();
  const layer = h(
    'div',
    { class: 'command-confirm', on: { click: (e: Event) => e.target === layer && close() } },
    h(
      'div',
      { class: 'command-confirm__panel', attrs: { role: 'dialog', 'aria-label': message } },
      h('p', { class: 'command-confirm__text', text: message }),
      h(
        'div',
        { class: 'command-confirm__buttons' },
        commandButton(choice.ok, () => {
          close();
          onOk();
        }),
        commandButton(choice.cancel, close, 'cancel'),
      ),
    ),
  );
  parent.append(layer);
}
