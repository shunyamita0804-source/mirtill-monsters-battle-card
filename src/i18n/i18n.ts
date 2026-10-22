import { MESSAGES, type MessageKey } from './messages/index.ts';

/**
 * 日本語・英語の切り替え（DOM に依存しない。ゲームのルール側からも使える）。
 *
 * - 画面の文字は「固定キー → ja/en」の辞書（src/i18n/messages/）から t() で引く
 * - 数値などは文字列の連結ではなく {name} のプレースホルダーで埋める（語順が崩れないように）
 * - 英語の単数・複数は {n|card|cards} のように書く（n が 1 なら左、それ以外は右）
 * - 英語が空・辞書にないキーは日本語に戻す（欠落は missingKeys() で確認できる）
 * - カード名・パック名など data/ の固有名は src/i18n/content.ts（ID ごとの英訳表）で引く
 */
export type Language = 'ja' | 'en';
export const LANGUAGES: readonly Language[] = ['ja', 'en'];
export const DEFAULT_LANGUAGE: Language = 'ja';

export interface MessageEntry {
  readonly ja: string;
  readonly en: string;
}

export type Params = Readonly<Record<string, string | number>>;

let current: Language = DEFAULT_LANGUAGE;
const listeners = new Set<(lang: Language) => void>();
const missing = new Set<string>();

export function isLanguage(value: unknown): value is Language {
  return value === 'ja' || value === 'en';
}

export function getLanguage(): Language {
  return current;
}

/** 言語を変える。変わったときだけ通知する */
export function setLanguage(lang: Language): void {
  if (!isLanguage(lang) || lang === current) return;
  current = lang;
  for (const listener of listeners) listener(lang);
}

export function onLanguageChange(listener: (lang: Language) => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** 日付などの表示に使うロケール */
export function localeOf(lang: Language = current): string {
  return lang === 'en' ? 'en-US' : 'ja-JP';
}

/** テンプレートにパラメーターを埋める */
export function format(template: string, params: Params = {}): string {
  return template.replace(/\{(\w+)(?:\|([^|}]*)\|([^}]*))?\}/g, (whole, name: string, one?: string, other?: string) => {
    const value = params[name];
    if (value === undefined) return whole;
    if (one !== undefined && other !== undefined) return Number(value) === 1 ? one : other;
    return String(value);
  });
}

/** テンプレートに出てくるプレースホルダー名（テスト用。重複は1つにまとめる） */
export function placeholdersOf(template: string): string[] {
  return [...new Set([...template.matchAll(/\{(\w+)(?:\|[^}]*)?\}/g)].map((m) => m[1] as string))].sort();
}

/** 辞書の文字を引く */
export function t(key: MessageKey, params?: Params, lang: Language = current): string {
  const entry: MessageEntry | undefined = MESSAGES[key];
  if (!entry) {
    missing.add(key);
    return key;
  }
  const text = entry[lang];
  if (text === '') missing.add(`${key}@${lang}`);
  return format(text === '' ? entry.ja : text, params);
}

export function hasMessage(key: string): key is MessageKey {
  return Object.hasOwn(MESSAGES, key);
}

/** 組み立てたキー（'rarity.' + r など）で引く。辞書になければ fallback（なければキー） */
export function tKey(key: string, params?: Params, fallback?: string): string {
  if (hasMessage(key)) return t(key, params);
  missing.add(key);
  return fallback ?? key;
}

/** 実行中に見つかった欠落キー（テスト・QA 用） */
export function missingKeys(): readonly string[] {
  return [...missing];
}
