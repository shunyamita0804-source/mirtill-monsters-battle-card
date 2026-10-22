import { DEFAULT_LANGUAGE, isLanguage, type Language } from '../../i18n/i18n.ts';
import type { KeyValueStorage } from '../save/saveRepository.ts';

/**
 * 設定（言語・音量）。セーブデータとは別に保存する（セーブの version やカードの記録には触れない）。
 * 音量は 0〜100（%）。BGM は素材が未導入のため、値を覚えておくだけ（将来用）。
 */
export interface GameSettings {
  readonly language: Language;
  /** 効果音の音量（0〜100） */
  readonly seVolume: number;
  /** BGM の音量（0〜100。BGM 未導入のため将来用） */
  readonly bgmVolume: number;
  /** すべての音を消す */
  readonly muted: boolean;
}

/** 保存先のキー。セーブと同じ名前空間（旧称を含むが、互換性のためセーブのキーと揃える） */
export const SETTINGS_KEY = 'mistria-battle-card/settings';

export const DEFAULT_SETTINGS: GameSettings = {
  language: DEFAULT_LANGUAGE,
  seVolume: 100,
  bgmVolume: 100,
  muted: false,
};

const asVolume = (v: unknown, fallback: number): number =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(100, Math.max(0, Math.round(v))) : fallback;

/** 読み込んだ値を検証して設定にする（壊れた値は既定値） */
export function normalizeSettings(raw: unknown): GameSettings {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return DEFAULT_SETTINGS;
  const r = raw as Record<string, unknown>;
  return {
    language: isLanguage(r.language) ? r.language : DEFAULT_SETTINGS.language,
    seVolume: asVolume(r.seVolume, DEFAULT_SETTINGS.seVolume),
    bgmVolume: asVolume(r.bgmVolume, DEFAULT_SETTINGS.bgmVolume),
    muted: typeof r.muted === 'boolean' ? r.muted : DEFAULT_SETTINGS.muted,
  };
}

/** 実際に鳴らす効果音の大きさ（0〜1） */
export function effectiveSeVolume(settings: GameSettings): number {
  return settings.muted ? 0 : settings.seVolume / 100;
}

/** 設定の読み書き。保存できなくても例外を出さない（その場合は今回の起動の間だけ有効） */
export class SettingsRepository {
  readonly #storage: KeyValueStorage;

  constructor(storage: KeyValueStorage) {
    this.#storage = storage;
  }

  load(): GameSettings {
    try {
      const text = this.#storage.getItem(SETTINGS_KEY);
      return text === null ? DEFAULT_SETTINGS : normalizeSettings(JSON.parse(text));
    } catch {
      return DEFAULT_SETTINGS;
    }
  }

  save(settings: GameSettings): boolean {
    try {
      this.#storage.setItem(SETTINGS_KEY, JSON.stringify(settings));
      return true;
    } catch {
      return false;
    }
  }
}
