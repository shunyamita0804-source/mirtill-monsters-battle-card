import type { MessageEntry } from '../i18n.ts';

/** どの画面でも使う文字（戻る・閉じる・単位など） */
export const COMMON = {
  'common.back': { ja: '戻る', en: 'Back' },
  'common.close': { ja: '閉じる', en: 'Close' },
  'common.cancel': { ja: 'やめる', en: 'Cancel' },
  'common.ok': { ja: 'OK', en: 'OK' },
  'common.yes': { ja: 'はい', en: 'Yes' },
  'common.no': { ja: 'いいえ', en: 'No' },
  'common.all': { ja: 'すべて', en: 'All' },
  'common.toTitle': { ja: 'タイトルへ', en: 'To Title' },
  'common.none': { ja: '—', en: '—' },
  'common.coins': { ja: '{n}G', en: '{n}G' },
  'common.cardCount': { ja: '{n}枚', en: '{n} {n|card|cards}' },
  'common.owned': { ja: '所持 {n}', en: 'Owned {n}' },
  'common.placeholderTag': { ja: '仮', en: 'TEMP' },
  'common.undeterminedTag': { ja: '未確定', en: 'TBD' },
  'common.unknownName': { ja: '？？？', en: '???' },
  'common.listSeparator': { ja: '・', en: ', ' },
  'common.saveFailed': {
    ja: 'セーブに失敗しました。ブラウザの保存領域を確認してください。',
    en: 'Could not save. Please check your browser storage.',
  },
  'common.titleSeparator': { ja: '｜', en: ' | ' },
} as const satisfies Readonly<Record<string, MessageEntry>>;
