import { h } from '../dom.ts';

/**
 * ダメージ・回復の数字（2026-10-23 デザイン第6弾の絵の数字）。
 * ダメージは赤（−と0〜9）、回復は緑（＋と0〜9）。絵が読み込めなくても読めるよう、文字も aria-label に入れる
 */
const DIGIT_URLS = import.meta.glob<string>('/assets/images/ui/battle/digits/*.webp', {
  eager: true,
  query: '?url',
  import: 'default',
});

const digitUrl = (name: string): string | undefined => DIGIT_URLS[`/assets/images/ui/battle/digits/${name}.webp`];

/** diff：減った（マイナス）ならダメージ、増えた（プラス）なら回復。className はまわりの置き方（浮き上がる動きなど） */
export function battleDigits(diff: number, className: string): HTMLElement {
  const heal = diff > 0;
  const text = heal ? `+${diff}` : String(diff);
  const prefix = heal ? 'heal' : 'dmg';
  const glyphs = [heal ? 'plus' : 'minus', ...String(Math.abs(diff)).split('')];
  const el = h('span', { class: `${className} battle-digits ${heal ? 'is-heal' : 'is-damage'}`, attrs: { 'aria-label': text, role: 'img' } });
  for (const g of glyphs) {
    const url = digitUrl(`${prefix}_${g}`);
    if (!url) {
      // 絵がない（読み込めない）ときは今までどおり文字で
      el.textContent = text;
      return el;
    }
    el.append(h('img', { class: 'battle-digits__glyph', attrs: { src: url, alt: '', draggable: 'false' } }));
  }
  return el;
}
