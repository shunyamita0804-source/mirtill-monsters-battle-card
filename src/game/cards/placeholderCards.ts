import { createCardCatalog } from './cardCatalog.ts';
import type { CardDefinition } from './cardTypes.ts';

/**
 * 画面確認用の仮カード。正式なカードデータではない。
 * 正式データの作成は指示書で許可されてから行い、このファイルは差し替える。
 */
const PLACEHOLDER_NOTE = '画面確認用の仮カードです。正式なカードデータではありません。';

function monster(no: string, name: string): CardDefinition {
  return {
    id: `tmp-monster-${no}`,
    kind: 'monster',
    name,
    description: PLACEHOLDER_NOTE,
    isPlaceholder: true,
  };
}

function skill(no: string, name: string, description: string = PLACEHOLDER_NOTE): CardDefinition {
  return {
    id: `tmp-skill-${no}`,
    kind: 'skill',
    name,
    description,
    isPlaceholder: true,
  };
}

export const PLACEHOLDER_CARDS: readonly CardDefinition[] = [
  monster('001', '仮モンスターA'),
  monster('002', '仮モンスターB'),
  monster('003', '仮モンスターC'),
  monster('004', '仮モンスターD'),
  monster('005', '仮モンスターE'),
  monster('006', '仮モンスターF'),
  skill('001', '仮技カード1'),
  skill('002', '仮技カード2'),
  skill('003', '仮技カード3'),
  skill('004', '仮技カード4'),
  skill('005', '仮技カード5'),
  skill(
    '006',
    '仮技カード6（長い名前の表示確認用）',
    `${PLACEHOLDER_NOTE}名前や説明文が長いときに表示が欠けないかを確認するためのカードです。説明文が長い場合は詳細画面の中でスクロールして読めます。`,
  ),
];

export const placeholderCatalog = createCardCatalog(PLACEHOLDER_CARDS);
