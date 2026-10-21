import { normalizeSave, touch, type SaveData } from './saveData.ts';

/** localStorage と同じ形の保存先（テストではメモリ上の実装を渡す） */
export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export const SAVE_KEY = 'mistria-battle-card/save';
/** 読めなかったセーブの退避先（上書きで失わないようにする） */
export const BACKUP_KEY = 'mistria-battle-card/save-unreadable-backup';

export type LoadResult =
  | { readonly status: 'empty' }
  | { readonly status: 'loaded'; readonly save: SaveData }
  | { readonly status: 'unreadable'; readonly reason: string };

/**
 * セーブの読み書き。
 * - 壊れた・新しすぎるセーブは BACKUP_KEY に退避してから「読めなかった」と返す（勝手に消さない）
 * - 書き込みに失敗（容量不足・プライベートモード等）しても例外を外に出さず false を返す
 */
export class SaveRepository {
  readonly #storage: KeyValueStorage;

  constructor(storage: KeyValueStorage) {
    this.#storage = storage;
  }

  load(): LoadResult {
    let text: string | null;
    try {
      text = this.#storage.getItem(SAVE_KEY);
    } catch {
      return { status: 'unreadable', reason: 'ストレージを読み込めません' };
    }
    if (text === null) return { status: 'empty' };
    let raw: unknown;
    try {
      raw = JSON.parse(text);
    } catch {
      this.#backup(text);
      return { status: 'unreadable', reason: 'セーブデータが壊れています' };
    }
    const save = normalizeSave(raw);
    if (!save) {
      this.#backup(text);
      return { status: 'unreadable', reason: 'このバージョンでは読めないセーブデータです' };
    }
    return { status: 'loaded', save };
  }

  save(data: SaveData, now: Date = new Date()): boolean {
    try {
      this.#storage.setItem(SAVE_KEY, JSON.stringify(touch(data, now)));
      return true;
    } catch {
      return false;
    }
  }

  clear(): void {
    try {
      this.#storage.removeItem(SAVE_KEY);
    } catch {
      // 消せなくても続行する
    }
  }

  #backup(text: string): void {
    try {
      this.#storage.setItem(BACKUP_KEY, text);
    } catch {
      // 退避できなくても読み込み処理は続ける
    }
  }
}

/** テスト・ストレージ不可時用のメモリ上の保存先 */
export class MemoryStorage implements KeyValueStorage {
  readonly #map = new Map<string, string>();
  getItem(key: string): string | null {
    return this.#map.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.#map.set(key, value);
  }
  removeItem(key: string): void {
    this.#map.delete(key);
  }
}
