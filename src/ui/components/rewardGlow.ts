import glowUrl from '@assets/images/ui/reward_glow.webp';
import { h } from '../dom.ts';

/** 景品・宝箱の中身を見せるときの、光の輪＋景品の絵（2026-10-23 デザイン第4弾） */
export function rewardGlow(iconUrl: string): HTMLElement {
  const el = h('div', { class: 'reward-glow', attrs: { 'aria-hidden': 'true' } }, h('img', { class: 'reward-glow__icon', attrs: { src: iconUrl, alt: '', draggable: 'false' } }));
  el.style.backgroundImage = `url("${glowUrl}")`;
  return el;
}
