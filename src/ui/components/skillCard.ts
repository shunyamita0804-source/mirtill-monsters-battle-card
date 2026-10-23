import { getMonster } from '../../data/cards.ts';
import { skillCardFace } from '../../game/cards/cardFace.ts';
import {
  supportShortText,
  type PlayCard,
  type SkillCard,
  type SkillCategory,
  type SupportCard,
} from '../../game/cards/cardTypes.ts';
import { cardName } from '../../i18n/content.ts';
import { t } from '../../i18n/i18n.ts';
import { resolveCardArt } from '../cardArtSources.ts';
import { h } from '../dom.ts';
import masterUrl from '@assets/images/ui/skillcard/skillcard_master_v4.png';
import maskUrl from '@assets/images/ui/skillcard/skillcard_tint_mask_v4.png';
import barManaUrl from '@assets/images/ui/skillcard/bar_mana.png';
import barForceUrl from '@assets/images/ui/skillcard/bar_force.png';
import barWisdomUrl from '@assets/images/ui/skillcard/bar_wisdom.png';
import barDefenseUrl from '@assets/images/ui/skillcard/bar_defense.png';
import barEvadeUrl from '@assets/images/ui/skillcard/bar_evade.png';
import barSpecialUrl from '@assets/images/ui/skillcard/bar_special.png';
import badgeManaUrl from '@assets/images/ui/skillcard/badge_mana_blank.png';

/**
 * 技カード UI テンプレート V4（同梱素材 SkillCard_MasterV4）による技カード表示。
 *
 * 重ね順（07_SPECS/master_layout_v4.json の layer_stack_back_to_front）：
 *   1. イラスト（art_rect）  2. 外枠マスクをモンスターのテーマ色で着色  3. 空欄のマスター
 *   4. マナのバーと数字  5. ちから or かしこさ のどちらか一方のバーと数字  6. 技名・説明（ゲーム側の文字）
 * 位置は 972×1618 の座標を割合に直して配置する。テンプレートは「正式承認待ち」の版。
 *
 * 2026-10-23 正式カード（ソラモ）の追加UI（03_UI_ADDON/05_SPECS/ui_layout_addon_v1.json）：
 * - 右側のバーは種別ごとに1種類だけ（ちから＝赤・かしこさ＝緑・防御＝盾・回避＝翼・特殊＝渦）。バーにアイコンが入っているので、アイコンは重ねない
 * - 数字はゲーム側で重ねる。マナ0 は空の数値枠に文字で「0」。数値のない技（特殊・防御・回避）は右側の数値枠を出さない
 * - バーの真ん中に「マナ」「ちから」などの文字をゲーム側で書く（日英が切り替わる）
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
  // バーのアイコンと数値枠の間（文字を書く所）
  manaLabel: rect(165, 1179, 342, 1297),
  statLabel: rect(585, 1179, 762, 1297),
};

const STAT_BAR: Readonly<Record<SkillCategory, string>> = {
  force: barForceUrl,
  wisdom: barWisdomUrl,
  defense: barDefenseUrl,
  evade: barEvadeUrl,
  special: barSpecialUrl,
};

const numberUrls = import.meta.glob<string>('/assets/images/ui/skillcard/number_*.png', {
  eager: true,
  query: '?url',
  import: 'default',
});

/** 数字の絵（1〜10）。範囲の外は undefined（空の数値枠に文字で書く） */
function numberUrl(kind: 'mana' | 'force' | 'wisdom', n: number): string | undefined {
  if (!Number.isInteger(n) || n < 1 || n > 10) return undefined;
  return numberUrls[`/assets/images/ui/skillcard/number_${kind}_${String(n).padStart(3, '0')}.png`];
}

/** マナの数字：1〜10 は数字の絵、0 などは空の数値枠に文字で書く */
function manaNumber(cost: number): HTMLElement {
  const url = numberUrl('mana', cost);
  if (url) return place(h('img', { class: 'skill-card__number', attrs: { src: url, alt: '', draggable: 'false' } }), LAYOUT.manaNumber);
  return place(
    h('div', { class: 'skill-card__badge' }, h('img', { attrs: { src: badgeManaUrl, alt: '', draggable: 'false' } }), h('span', { text: String(cost) })),
    LAYOUT.manaNumber,
  );
}

/** 文字の長さに合わせて小さくする（長い英語でも欠けないように）。base は cqw、fit はその大きさで入る文字数の目安 */
function fitText(el: HTMLElement, text: string, base: number, fit: number, min: number): HTMLElement {
  const len = [...text].reduce((n, ch) => n + (ch.charCodeAt(0) > 0xff ? 1 : 0.55), 0);
  const size = len > fit ? Math.max(min, (base * fit) / len) : base;
  el.style.fontSize = `${size.toFixed(2)}cqw`;
  return el;
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
          h('span', { class: 'skill-card__art-mark', text: t('card.art.skill') }),
          h('span', { class: 'skill-card__art-note', text: t('common.placeholderTag') }),
        ),
    LAYOUT.art,
  );

  const tint = h('div', { class: 'skill-card__tint' });
  tint.style.backgroundColor = monster.themeColor;
  tint.style.setProperty('-webkit-mask-image', `url("${maskUrl}")`);
  tint.style.maskImage = `url("${maskUrl}")`;

  const img = (src: string | undefined, className: string, r: ReturnType<typeof rect>): HTMLElement | null =>
    src ? place(h('img', { class: className, attrs: { src, alt: '', draggable: 'false' } }), r) : null;

  const face = skillCardFace(skill);
  const { category, title: name, description: desc } = face;
  const catText = face.categoryLabel;
  const aria =
    face.value !== null
      ? t('card.aria.skill', { name, cost: face.mana, stat: catText, v: face.value })
      : t('card.aria.skillNoValue', { name, cost: face.mana, stat: catText });

  const card = h(
    'div',
    { class: 'skill-card', dataset: { category }, attrs: { role: 'img', 'aria-label': aria } },
    art,
    tint,
    h('img', { class: 'skill-card__master', attrs: { src: masterUrl, alt: '', draggable: 'false' } }),
    img(barManaUrl, 'skill-card__bar', LAYOUT.mana),
    manaNumber(face.mana),
    img(STAT_BAR[category], 'skill-card__bar', LAYOUT.stat),
    // 数値のある技（ちから・かしこさ）だけ右側の数字を出す。特殊・防御・回避は数値枠ごと出さない
    skill.stat ? img(numberUrl(skill.stat.type, skill.stat.value), 'skill-card__number', LAYOUT.statNumber) : null,
    showText ? place(fitText(h('div', { class: 'skill-card__bar-label', text: face.manaLabel }), face.manaLabel, 5, 3.2, 2.8), LAYOUT.manaLabel) : null,
    showText ? place(fitText(h('div', { class: 'skill-card__bar-label', text: catText }), catText, 5, 3.2, 2.8), LAYOUT.statLabel) : null,
    showText ? place(fitText(h('div', { class: 'skill-card__title', text: name }), name, 7, 11, 4), LAYOUT.title) : null,
    showText ? place(fitText(h('div', { class: 'skill-card__desc', text: desc }), desc, 6, 22, 3.4), LAYOUT.description) : null,
  );
  card.style.width = `${options.width}px`;
  card.style.height = `${(options.width * H) / W}px`;
  return card;
}

/** サポートカードの外枠の色（モンスターに属さないので共通の色） */
const SUPPORT_TINT = '#b08a3e';

/**
 * サポートカード。技カードと同じテンプレートで、外枠は共通色、右下は能力の代わりに区分（サポート／全体）を出す。
 */
export function createSupportCard(card: SupportCard, options: SkillCardOptions): HTMLElement {
  const artUrl = resolveCardArt(card.art);
  const showText = options.showText ?? options.width >= 120;
  const art = place(
    artUrl
      ? h('img', { class: 'skill-card__art', attrs: { src: artUrl, alt: '', draggable: 'false' } })
      : h(
          'div',
          { class: 'skill-card__art skill-card__art--placeholder skill-card__art--support' },
          h('span', { class: 'skill-card__art-mark', text: t(card.duration === 'field' ? 'card.art.field' : 'card.art.support') }),
          h('span', { class: 'skill-card__art-note', text: t('common.placeholderTag') }),
        ),
    LAYOUT.art,
  );
  const tint = h('div', { class: 'skill-card__tint' });
  tint.style.backgroundColor = SUPPORT_TINT;
  tint.style.setProperty('-webkit-mask-image', `url("${maskUrl}")`);
  tint.style.maskImage = `url("${maskUrl}")`;
  const kindLabel = t(card.duration === 'field' ? 'card.supportKind.field' : 'card.kind.support');
  const el = h(
    'div',
    { class: 'skill-card skill-card--support', attrs: { role: 'img', 'aria-label': t('card.aria.support', { name: cardName(card), cost: card.cost }) } },
    art,
    tint,
    h('img', { class: 'skill-card__master', attrs: { src: masterUrl, alt: '', draggable: 'false' } }),
    place(h('img', { class: 'skill-card__bar', attrs: { src: barManaUrl, alt: '', draggable: 'false' } }), LAYOUT.mana),
    manaNumber(card.cost),
    place(h('div', { class: 'skill-card__kind', text: kindLabel }), LAYOUT.stat),
    showText ? place(h('div', { class: 'skill-card__title', text: cardName(card) }), LAYOUT.title) : null,
    showText ? place(h('div', { class: 'skill-card__desc', text: supportShortText(card) }), LAYOUT.description) : null,
  );
  el.style.width = `${options.width}px`;
  el.style.height = `${(options.width * H) / W}px`;
  return el;
}

/** 技・サポートどちらでも描く */
export function createPlayCard(card: PlayCard, options: SkillCardOptions): HTMLElement {
  return card.kind === 'skill' ? createSkillCard(card, options) : createSupportCard(card, options);
}
