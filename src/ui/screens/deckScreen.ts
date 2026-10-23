import { cardCatalog, getMonster, MONSTERS, skillsOf, SUPPORTS } from '../../data/cards.ts';
import { DECK_RULES } from '../../data/rules.ts';
import { categoryLabel, effectLabel, skillCategory, type PlayCard } from '../../game/cards/cardTypes.ts';
import { cardName } from '../../i18n/content.ts';
import { t } from '../../i18n/i18n.ts';
import { buildDeckFromCollection, countCards, validateDeck, type Deck } from '../../game/deck/deck.ts';
import { openCardDetail } from '../components/cardDetail.ts';
import { confirmModal, messageModal, openModal } from '../components/modal.ts';
import { createMonsterCard } from '../components/monsterCard.ts';
import { createScreenHeader } from '../components/screenHeader.ts';
import { createPlayCard } from '../components/skillCard.ts';
import { button, h } from '../dom.ts';
import type { ScreenDefinition } from './types.ts';

/** タブ「サポート」の印（モンスターIDと重ならない値） */
const SUPPORT_TAB = '__support';

/**
 * デッキ編集（家の机）。モンスター3体＋山札60枚（適合技とサポート。仮ルール：同じカード4枚まで）。
 * 不正な構成は保存できない。所持枚数を超えては入れられない。
 */
export const deckScreen: ScreenDefinition = {
  id: 'deck',
  titleKey: 'deck.title',
  create(ctx) {
    const store = ctx.store;
    const element = h('main', { class: 'screen deck' });
    let draft: Deck = { monsters: [...store.save.deck.monsters], skills: [...store.save.deck.skills] };
    let dirty = false;
    let tab: string | null = null;
    let listScroll = 0;

    const collection = (): Readonly<Record<string, number>> => store.save.collection;

    const setDraft = (next: Deck): void => {
      draft = next;
      dirty = true;
      render();
    };

    /**
     * モンスターをタップ：入れる／外す。同じモンスターを何体も入れられる決まり（DECK_RULES.allowDuplicateMonsters）のときは、
     * 持っている数までタップするたびに1体ずつ足し、それ以上は外す（全部）
     */
    const toggleMonster = (id: string): void => {
      const inDraft = draft.monsters.filter((m) => m === id).length;
      const canAddCopy =
        DECK_RULES.allowDuplicateMonsters && inDraft > 0 && inDraft < (collection()[id] ?? 0) && draft.monsters.length < DECK_RULES.monsterCount;
      if (inDraft > 0 && !canAddCopy) {
        const removed = draft.skills.filter((s) => cardCatalog.get(s)?.kind === 'skill' && skillsOf(id).some((k) => k.id === s)).length;
        setDraft({ monsters: draft.monsters.filter((m) => m !== id), skills: draft.skills.filter((s) => !skillsOf(id).some((k) => k.id === s)) });
        if (removed > 0) messageModal(element, t('deck.removedSkills', { name: cardName(getMonster(id)), n: removed }));
        return;
      }
      if (draft.monsters.length >= DECK_RULES.monsterCount) {
        messageModal(element, t('deck.monsterLimit', { n: DECK_RULES.monsterCount }));
        return;
      }
      setDraft({ ...draft, monsters: [...draft.monsters, id] });
    };

    const changeSkill = (id: string, delta: 1 | -1): void => {
      if (delta === 1) {
        setDraft({ ...draft, skills: [...draft.skills, id] });
      } else {
        const i = draft.skills.lastIndexOf(id);
        if (i < 0) return;
        const skills = [...draft.skills];
        skills.splice(i, 1);
        setDraft({ ...draft, skills });
      }
    };

    const auto = (): void => {
      if (draft.monsters.length !== DECK_RULES.monsterCount) {
        messageModal(element, t('deck.chooseMonstersFirst', { n: DECK_RULES.monsterCount }));
        return;
      }
      const built = buildDeckFromCollection(draft.monsters, collection());
      setDraft(built);
      if (built.skills.length < DECK_RULES.skillCount) {
        messageModal(element, t('deck.autoShort', { n: built.skills.length }));
      }
    };

    const save = (): void => {
      const issues = validateDeck(draft, collection());
      if (issues.length > 0) {
        showIssues();
        return;
      }
      store.update((s) => ({ ...s, deck: draft }));
      dirty = false;
      messageModal(element, t('deck.saved'));
      render();
    };

    const showIssues = (): void => {
      const issues = validateDeck(draft, collection());
      const handle = openModal(element, {
        title: t(issues.length === 0 ? 'deck.valid' : 'deck.problems'),
        body:
          issues.length === 0
            ? [h('p', { class: 'modal__text', text: t('deck.validText') })]
            : [h('ul', { class: 'rule-list' }, ...issues.slice(0, 12).map((i) => h('li', { text: i.message })))],
        actions: [{ label: t('common.close'), primary: true, onTap: () => handle.close() }],
      });
    };

    const leave = (): void => {
      if (!dirty) {
        ctx.back('world');
        return;
      }
      confirmModal(element, t('deck.leaveConfirm'), [h('p', { class: 'modal__text', text: t('deck.leaveConfirmText') })], () => ctx.back('world'));
    };

    const render = (): void => {
      listScroll = element.querySelector('.deck__skills')?.scrollTop ?? listScroll;
      const issues = validateDeck(draft, collection());
      const counts = countCards(draft.skills);
      const coll = collection();
      const ownedMonsters = MONSTERS.filter((m) => (coll[m.id] ?? 0) > 0);

      const status = h(
        'button',
        { class: `deck__status${issues.length === 0 ? ' is-ok' : ' is-ng'}`, attrs: { type: 'button' }, on: { click: showIssues } },
        h('span', { text: t('deck.statusMonsters', { n: draft.monsters.length, max: DECK_RULES.monsterCount }) }),
        h('span', { text: t('deck.statusDeck', { n: draft.skills.length, max: DECK_RULES.skillCount }) }),
        h('span', { class: 'deck__status-state', text: issues.length === 0 ? t('deck.statusOk') : t('deck.statusNg', { n: issues.length }) }),
      );

      const monsters = h(
        'div',
        { class: 'deck__monsters' },
        ...ownedMonsters.map((m) =>
          h(
            'button',
            {
              class: `deck__monster${draft.monsters.includes(m.id) ? ' is-selected' : ''}`,
              attrs: { type: 'button', 'aria-pressed': String(draft.monsters.includes(m.id)) },
              dataset: { id: m.id },
              on: { click: () => toggleMonster(m.id) },
            },
            createMonsterCard(m, { width: 68, showName: true }),
            draft.monsters.filter((x) => x === m.id).length > 1
              ? h('span', { class: 'deck__monster-count', text: `×${draft.monsters.filter((x) => x === m.id).length}` })
              : null,
          ),
        ),
      );

      const tabs = h(
        'div',
        { class: 'deck__tabs' },
        ...[null, ...new Set(draft.monsters), SUPPORT_TAB].map((id) =>
          button(id === SUPPORT_TAB ? t('card.kind.support') : id ? cardName(getMonster(id)) : t('common.all'), () => {
            tab = id;
            listScroll = 0;
            render();
          }, `deck__tab${tab === id ? ' is-active' : ''}`),
        ),
      );
      if (tab && tab !== SUPPORT_TAB && !draft.monsters.includes(tab)) tab = null;

      // サポートはモンスターに関係なく入れられる。持っているものだけ並べる
      const supports: PlayCard[] = SUPPORTS.filter((c) => (coll[c.id] ?? 0) > 0 || (counts[c.id] ?? 0) > 0);
      const listed: PlayCard[] =
        tab === SUPPORT_TAB ? supports : [...(tab ? [tab] : [...new Set(draft.monsters)]).flatMap((mid) => skillsOf(mid)), ...(tab ? [] : supports)];
      const meta = (card: PlayCard): string =>
        card.kind === 'skill'
          ? card.stat
            ? t('deck.metaSkill', { effect: effectLabel(card.effect.type), cost: card.cost, stat: categoryLabel(skillCategory(card)), v: card.stat.value })
            : t('deck.metaSkillNoValue', { category: categoryLabel(skillCategory(card)), cost: card.cost })
          : t('deck.metaSupport', { kind: t(card.duration === 'field' ? 'card.supportKind.field' : 'card.kind.support'), cost: card.cost });
      const skillRows = listed.map((skill) => {
        const owned = coll[skill.id] ?? 0;
        const inDeck = counts[skill.id] ?? 0;
        const plus = button('＋', () => changeSkill(skill.id, 1), 'deck__step');
        plus.disabled = inDeck >= owned || inDeck >= DECK_RULES.maxCopies || draft.skills.length >= DECK_RULES.skillCount;
        const minus = button('－', () => changeSkill(skill.id, -1), 'deck__step');
        minus.disabled = inDeck === 0;
        return h(
          'div',
          { class: `deck__row${owned === 0 ? ' is-unowned' : ''}`, dataset: { id: skill.id } },
          h('button', { class: 'deck__row-card', attrs: { type: 'button', 'aria-label': t('deck.detail', { name: cardName(skill) }) }, on: { click: () => openCardDetail(element, skill, { owned }) } }, createPlayCard(skill, { width: 44, showText: false })),
          h(
            'div',
            { class: 'deck__row-info' },
            h('span', { class: 'deck__row-name', text: cardName(skill) }),
            h('span', { class: 'deck__row-meta', text: meta(skill) }),
            h('span', { class: 'deck__row-owned', text: t('deck.owned', { n: owned }) }),
          ),
          minus,
          h('span', { class: 'deck__row-count', text: String(inDeck) }),
          plus,
        );
      });

      const saveBtn = button(t('deck.save'), save, 'btn btn--primary btn--small');
      saveBtn.disabled = !dirty;
      element.replaceChildren(
        createScreenHeader({ title: t('deck.title'), back: { label: t('common.back'), onTap: leave }, right: saveBtn }),
        status,
        h('p', { class: 'deck__caption', text: t('deck.captionMonsters', { n: DECK_RULES.monsterCount }) }),
        monsters,
        h('p', { class: 'deck__caption', text: t('deck.captionDeck', { n: DECK_RULES.maxCopies }) }),
        tabs,
        h(
          'div',
          { class: 'deck__skills' },
          ...(skillRows.length > 0
            ? skillRows
            : [h('p', { class: 'deck__empty', text: t(tab === SUPPORT_TAB ? 'deck.noSupports' : 'deck.chooseMonsters') })]),
        ),
        h('footer', { class: 'deck__footer' }, button(t('deck.auto'), auto, 'btn'), h('span', { class: 'deck__note', text: t('deck.rulesNote') })),
      );
      const list = element.querySelector('.deck__skills');
      if (list) list.scrollTop = listScroll;
    };

    render();
    return { element };
  },
};
