import { setLanguage } from '../i18n/i18n.ts';
import { effectiveBgmVolume, effectiveSeVolume, SettingsRepository, type GameSettings } from '../game/settings/settings.ts';
import type { KeyValueStorage } from '../game/save/saveRepository.ts';
import { bgm } from './bgm.ts';
import { sound } from './sound.ts';

/**
 * 設定（言語・音量）の保持。変更するとすぐ保存し、言語と効果音・BGM の音量に反映する。
 * 保存できない環境（プライベートモードなど）でも、今回の起動の間は効く。
 */
export class SettingsStore {
  readonly #repo: SettingsRepository;
  #settings: GameSettings;
  /** 最後に保存できたか */
  lastSaveOk = true;

  constructor(storage: KeyValueStorage) {
    this.#repo = new SettingsRepository(storage);
    this.#settings = this.#repo.load();
    this.#apply();
  }

  get value(): GameSettings {
    return this.#settings;
  }

  update(patch: Partial<GameSettings>): GameSettings {
    this.#settings = { ...this.#settings, ...patch };
    this.lastSaveOk = this.#repo.save(this.#settings);
    this.#apply();
    return this.#settings;
  }

  #apply(): void {
    setLanguage(this.#settings.language);
    sound.setVolume(effectiveSeVolume(this.#settings));
    bgm.setVolume(effectiveBgmVolume(this.#settings));
  }
}
