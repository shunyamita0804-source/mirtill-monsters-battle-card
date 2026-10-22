import { cardCatalog, getMonster, MONSTERS, skillsOf, SUPPORTS } from '../../data/cards.ts';
import { DECK_RULES } from '../../data/rules.ts';
import { EFFECT_LABEL, STAT_LABEL, type PlayCard } from '../../game/cards/cardTypes.ts';
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
  title: 'デッキ編集',
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

    const toggleMonster = (id: string): void => {
      if (draft.monsters.includes(id)) {
        const removed = draft.skills.filter((s) => cardCatalog.get(s)?.kind === 'skill' && skillsOf(id).some((k) => k.id === s)).length;
        setDraft({ monsters: draft.monsters.filter((m) => m !== id), skills: draft.skills.filter((s) => !skillsOf(id).some((k) => k.id === s)) });
        if (removed > 0) messageModal(element, `${getMonster(id).name}を外したので、その技カード${removed}枚もデッキから外しました。`);
        return;
      }
      if (draft.monsters.length >= DECK_RULES.monsterCount) {
        messageModal(element, `モンスターは${DECK_RULES.monsterCount}体までです。先に1体外してください。`);
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
        messageModal(element, `先にモンスターを${DECK_RULES.monsterCount}体選んでください。`);
        return;
      }
      const built = buildDeckFromCollection(draft.monsters, collection());
      setDraft(built);
      if (built.skills.length < DECK_RULES.skillCount) {
        messageModal(element, `所持している適合技・サポートが足りず、${built.skills.length}枚しか入れられませんでした。\nショップでカードを集めましょう。`);
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
      messageModal(element, 'デッキを保存しました。');
      render();
    };

    const showIssues = (): void => {
      const issues = validateDeck(draft, collection());
      const handle = openModal(element, {
        title: issues.length === 0 ? 'デッキは使用可能です' : 'デッキの問題',
        body:
          issues.length === 0
            ? [h('p', { class: 'modal__text', text: '保存して大会・ダンジョンで使えます。' })]
            : [h('ul', { class: 'rule-list' }, ...issues.slice(0, 12).map((i) => h('li', { text: i.message })))],
        actions: [{ label: '閉じる', primary: true, onTap: () => handle.close() }],
      });
    };

    const leave = (): void => {
      if (!dirty) {
        ctx.back('world');
        return;
      }
      confirmModal(element, '保存せずに戻りますか？', [h('p', { class: 'modal__text', text: '変更は破棄されます。' })], '破棄して戻る', () => ctx.back('world'));
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
        h('span', { text: `モンスター ${draft.monsters.length}/${DECK_RULES.monsterCount}` }),
        h('span', { text: `山札 ${draft.skills.length}/${DECK_RULES.skillCount}` }),
        h('span', { class: 'deck__status-state', text: issues.length === 0 ? '✓ 使用可能' : `✕ 問題${issues.length}件` }),
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
          ),
        ),
      );

      const tabs = h(
        'div',
        { class: 'deck__tabs' },
        ...[null, ...draft.monsters, SUPPORT_TAB].map((id) =>
          button(id === SUPPORT_TAB ? 'サポート' : id ? getMonster(id).name : 'すべて', () => {
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
        tab === SUPPORT_TAB ? supports : [...(tab ? [tab] : draft.monsters).flatMap((mid) => skillsOf(mid)), ...(tab ? [] : supports)];
      const meta = (card: PlayCard): string =>
        card.kind === 'skill'
          ? `${EFFECT_LABEL[card.effect.type]}・マナ${card.cost}・${STAT_LABEL[card.stat.type]}${card.stat.value}`
          : `${card.duration === 'field' ? '全体' : 'サポート'}・マナ${card.cost}`;
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
          h('button', { class: 'deck__row-card', attrs: { type: 'button', 'aria-label': `${skill.name}の詳細` }, on: { click: () => openCardDetail(element, skill, { owned }) } }, createPlayCard(skill, { width: 44, showText: false })),
          h(
            'div',
            { class: 'deck__row-info' },
            h('span', { class: 'deck__row-name', text: skill.name }),
            h('span', { class: 'deck__row-meta', text: meta(skill) }),
            h('span', { class: 'deck__row-owned', text: `所持${owned}` }),
          ),
          minus,
          h('span', { class: 'deck__row-count', text: String(inDeck) }),
          plus,
        );
      });

      const saveBtn = button('保存', save, 'btn btn--primary btn--small');
      saveBtn.disabled = !dirty;
      element.replaceChildren(
        createScreenHeader({ title: 'デッキ編集', back: { label: '戻る', onTap: leave }, right: saveBtn }),
        status,
        h('p', { class: 'deck__caption', text: `モンスター（${DECK_RULES.monsterCount}体選ぶ）` }),
        monsters,
        h('p', { class: 'deck__caption', text: `山札：技カード（適合技のみ）とサポート・同じカード${DECK_RULES.maxCopies}枚まで` }),
        tabs,
        h(
          'div',
          { class: 'deck__skills' },
          ...(skillRows.length > 0
            ? skillRows
            : [h('p', { class: 'deck__empty', text: tab === SUPPORT_TAB ? 'サポートカードを持っていません（パックで手に入ります）' : 'モンスターを選ぶと適合技が表示されます' })]),
        ),
        h('footer', { class: 'deck__footer' }, button('おまかせ', auto, 'btn'), h('span', { class: 'deck__note', text: 'ルールは仮です' })),
      );
      const list = element.querySelector('.deck__skills');
      if (list) list.scrollTop = listScroll;
    };

    render();
    return { element };
  },
};
