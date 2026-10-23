import type { RankId } from '../../data/economy.ts';
import { h } from '../dom.ts';
import rankE from '@assets/images/ui/rank/rank_e.webp';
import rankD from '@assets/images/ui/rank/rank_d.webp';
import rankC from '@assets/images/ui/rank/rank_c.webp';
import rankB from '@assets/images/ui/rank/rank_b.webp';
import rankA from '@assets/images/ui/rank/rank_a.webp';
import rankS from '@assets/images/ui/rank/rank_s.webp';

/**
 * ランクの紋章（2026-10-23 デザイン第2弾：E＝鉄・D＝銅・C＝銀・B＝金・A＝金に翼・S＝金に翼と星）。
 * 紋章の真ん中の丸に、ランクの文字をゲーム側で重ねる
 */
const RANK_ART: Readonly<Record<RankId, string>> = { E: rankE, D: rankD, C: rankC, B: rankB, A: rankA, S: rankS };

export function rankBadge(rank: RankId, size: number): HTMLElement {
  const el = h('span', { class: 'rank-badge', attrs: { 'aria-hidden': 'true' } }, h('span', { class: 'rank-badge__letter', text: rank }));
  el.style.backgroundImage = `url("${RANK_ART[rank]}")`;
  el.style.width = `${size}px`;
  el.style.height = `${size}px`;
  el.style.fontSize = `${Math.round(size * 0.36)}px`;
  return el;
}
