import { getMonster } from '../../data/cards.ts';
import type { SkillCard } from '../../game/cards/cardTypes.ts';
import { resolveCardArt } from '../cardArtSources.ts';
import { h } from '../dom.ts';
import masterUrl from '@assets/images/ui/skillcard/skillcard_master_v4.png';
import maskUrl from '@assets/images/ui/skillcard/skillcard_tint_mask_v4.png';
import barManaUrl from '@assets/images/ui/skillcard/bar_mana.png';
import barForceUrl from '@assets/images/ui/skillcard/bar_force.png';
import barWisdomUrl from '@assets/images/ui/skillcard/bar_wisdom.png';

/**
 * 技カード UI テンプレート V4（同梱素材 SkillCard_MasterV4）による技カード表示。
 *
 * 重ね順（07_SPECS/master_layout_v4.json の layer_stack_back_to_front）：
 *   1. イラスト（art_rect）  2. 外枠マスクをモンスターのテーマ色で着色  3. 空欄のマスター
 *   4. マナのバーと数字  5. ちから or かしこさ のどちらか一方のバーと数字  6. 技名・説明（ゲーム側の文字）
 * 位置は 972×1618 の座標を割合に直して配置する。テンプレートは「正式承認待ち」の版。
 */
const W = 972;
const H = 1618;
const rect = (x1: number, y1: number, x2: number, y2: number) => ({
  left: `${(x1 / W) * 100}%`,
  top: `${(y1 / H) * 100}%`,
  width: `${((x2 - x1) / W) * 100}%`,
  height: `${((y2 - y1) / H) * 100}%`,
});
const LAYOUT = {
  art: rect(72, 199, 899, 1136),
  title: rect(93, 78, 878, 165),
  mana: rect(80, 1179, 470, 1297),
  stat: rect(500, 1179, 890, 1297),
  description: rect(92, 1350, 880, 1517),
  manaNumber: rect(347, 1183, 347 + 112, 1183 + 112),
  statNumber: rect(767, 1183, 767 + 112, 1183 + 112),
};

const numberUrls = import.meta.glob<string>('/assets/images/ui/skillcard/number_*.png', {
  eager: true,
  query: '?url',
  import: 'default',
});

function numberUrl(kind: 'mana' | 'force' | 'wisdom', n: number): string | undefined {
  const v = Math.max(1, Math.min(10, Math.round(n)));
  return numberUrls[`/assets/images/ui/skillcard/number_${kind}_${String(v).padStart(3, '0')}.png`];
}

function place(el: HTMLElement, r: ReturnType<typeof rect>): HTMLElement {
  Object.assign(el.style, r);
  return el;
}

export interface SkillCardOptions {
  /** カードの幅（論理px）。高さは比率から決まる */
  readonly width: number;
  /** 文字（技名・説明）を描くか。小さい表示では省く */
  readonly showText?: boolean;
}

export function createSkillCard(skill: SkillCard, options: SkillCardOptions): HTMLElement {
  const monster = getMonster(skill.monsterId);
  const artUrl = resolveCardArt(skill.art);
  const showText = options.showText ?? options.width >= 120;

  const art = place(
    artUrl
      ? h('img', { class: 'skill-card__art', attrs: { src: artUrl, alt: '', draggable: 'false' } })
      : h(
          'div',
          { class: 'skill-card__art skill-card__art--placeholder' },
          h('span', { class: 'skill-card__art-mark', text: '技' }),
          h('span', { class: 'skill-card__art-note', text: '仮' }),
        ),
    LAYOUT.art,
  );

  const tint = h('div', { class: 'skill-card__tint' });
  tint.style.backgroundColor = monster.themeColor;
  tint.style.setProperty('-webkit-mask-image', `url("${maskUrl}")`);
  tint.style.maskImage = `url("${maskUrl}")`;

  const img = (src: string | undefined, className: string, r: ReturnType<typeof rect>): HTMLElement | null =>
    src ? place(h('img', { class: className, attrs: { src, alt: '', draggable: 'false' } }), r) : null;

  const statBar = skill.stat.type === 'force' ? barForceUrl : barWisdomUrl;

  const card = h(
    'div',
    {
      class: 'skill-card',
      attrs: { role: 'img', 'aria-label': `技カード ${skill.name} マナ${skill.cost} ${skill.stat.type === 'force' ? 'ちから' : 'かしこさ'}${skill.stat.value}` },
    },
    art,
    tint,
    h('img', { class: 'skill-card__master', attrs: { src: masterUrl, alt: '', draggable: 'false' } }),
    img(barManaUrl, 'skill-card__bar', LAYOUT.mana),
    img(numberUrl('mana', skill.cost), 'skill-card__number', LAYOUT.manaNumber),
    img(statBar, 'skill-card__bar', LAYOUT.stat),
    img(numberUrl(skill.stat.type, skill.stat.value), 'skill-card__number', LAYOUT.statNumber),
    showText ? place(h('div', { class: 'skill-card__title', text: skill.name }), LAYOUT.title) : null,
    showText ? place(h('div', { class: 'skill-card__desc', text: skillShortText(skill) }), LAYOUT.description) : null,
  );
  card.style.width = `${options.width}px`;
  card.style.height = `${(options.width * H) / W}px`;
  return card;
}

/** カード面に書く短い説明 */
export function skillShortText(skill: SkillCard): string {
  const v = skill.stat.value;
  switch (skill.effect.type) {
    case 'attack':
      return skill.effect.unblockable && skill.effect.undodgeable ? `${v}ダメージ（守備されない）` : `相手1体に${v}ダメージ`;
    case 'defense':
      return `防御：ダメージ-${v}`;
    case 'evade':
      return '回避：ダメージ0';
    case 'heal':
      return `味方1体のライフ+${v}`;
    case 'mana':
      return `山札${v}枚をマナに`;
    case 'draw':
      return `カードを${v}枚引く`;
  }
}
