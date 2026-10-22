import blankUrl from '@assets/images/ui/button/btn_command_blank.png';
import yesUrl from '@assets/images/ui/button/btn_yes.png';
import noUrl from '@assets/images/ui/button/btn_no.png';
import { h } from '../dom.ts';

/**
 * 金の枠・青地のコマンドボタン（ユーザー提供の UI 素材）。
 * - 'command'：無地のボタンに文字を重ねる（使う・攻撃終了など）
 * - 'yes' / 'no'：素材の「はい」「いいえ」をそのまま使う
 */
export type CommandVariant = 'command' | 'yes' | 'no';

const IMAGE: Readonly<Record<CommandVariant, string>> = { command: blankUrl, yes: yesUrl, no: noUrl };

export function commandButton(label: string, onTap: () => void, variant: CommandVariant = 'command'): HTMLButtonElement {
  const el = h(
    'button',
    {
      // 長い文字（「マナにする（2枚）」など）は枠からはみ出さないよう小さめの文字にする
      class: `command-btn command-btn--${variant}${label.length > 6 ? ' is-long' : ''}`,
      attrs: { type: 'button', 'aria-label': label },
      on: { click: onTap },
    },
    h('img', { class: 'command-btn__img', attrs: { src: IMAGE[variant], alt: '', draggable: 'false' } }),
    variant === 'command' ? h('span', { class: 'command-btn__label', text: label }) : null,
  );
  return el as HTMLButtonElement;
}

/**
 * 画面中央に出す確認（文と「はい」「いいえ」）。
 * はいで onYes、いいえ・外側のタップで閉じる。
 */
export function confirmCommand(parent: HTMLElement, message: string, onYes: () => void): void {
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
        commandButton('はい', () => {
          close();
          onYes();
        }, 'yes'),
        commandButton('いいえ', close, 'no'),
      ),
    ),
  );
  parent.append(layer);
}
