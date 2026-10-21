/**
 * DOM 組み立ての小さなヘルパー。
 * 文字列は textContent で入れるため、カード名などに記号が含まれても HTML として解釈されない。
 */
type EventHandlers = {
  [E in keyof HTMLElementEventMap]?: (event: HTMLElementEventMap[E]) => void;
};

export interface ElementProps {
  readonly class?: string;
  readonly text?: string;
  readonly attrs?: Readonly<Record<string, string>>;
  readonly dataset?: Readonly<Record<string, string>>;
  readonly on?: EventHandlers;
}

export type Child = Node | string | null | undefined | false;

export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: ElementProps = {},
  ...children: readonly Child[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (props.class) el.className = props.class;
  if (props.text !== undefined) el.textContent = props.text;
  for (const [name, value] of Object.entries(props.attrs ?? {})) el.setAttribute(name, value);
  for (const [name, value] of Object.entries(props.dataset ?? {})) el.dataset[name] = value;
  for (const [type, handler] of Object.entries(props.on ?? {})) {
    if (handler) el.addEventListener(type, handler as EventListener);
  }
  for (const child of children) {
    if (child === null || child === undefined || child === false) continue;
    el.append(child);
  }
  return el;
}

/** タップ用ボタン（type="button" 固定） */
export function button(label: string, onTap: () => void, className = 'btn'): HTMLButtonElement {
  return h('button', { class: className, text: label, attrs: { type: 'button' }, on: { click: onTap } });
}
