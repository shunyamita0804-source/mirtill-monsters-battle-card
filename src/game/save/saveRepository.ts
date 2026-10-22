import { normalizeSave, touch, type SaveData } from './saveData.ts';

/** localStorage と同じ形の保存先（テストではメモリ上の実装を渡す） */
export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/*
 * 保存先のキー。旧称（ミストリア）を含むが、改名後も今までのセーブを読めるよう変えない（2026-10-22 改名時の決定）。
 * localStorage はドメイン（shunyamita0804-source.github.io）ごとなので、Pages のパスが変わっても同じキーを読める。
 * ただしホーム画面に追加したアプリ（PWA）は、iPhone では Safari と別の保存領域になることがある（引き継ぎは保証しない）。
 */
export const SAVE_KEY = 'mistria-battle-card/save';
/** 読めなかったセーブの退避先（上書きで失わないようにする） */
export const BACKUP_KEY = 'mistria-battle-card/save-unreadable-backup';
/** バックアップから復元する直前のセーブの退避先 */
export const BEFORE_RESTORE_KEY = 'mistria-battle-card/save-before-restore';

/** 読めなかった理由：storage＝保存領域が使えない、corrupt＝壊れている、unsupported＝このバージョンでは読めない */
export type UnreadableReason = 'storage' | 'corrupt' | 'unsupported';

export type LoadResult =
  | { readonly status: 'empty' }
  | { readonly status: 'loaded'; readonly save: SaveData }
  | { readonly status: 'unreadable'; readonly reason: UnreadableReason };

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
      return { status: 'unreadable', reason: 'storage' };
    }
    if (text === null) return { status: 'empty' };
    let raw: unknown;
    try {
      raw = JSON.parse(text);
    } catch {
      this.#backup(text);
      return { status: 'unreadable', reason: 'corrupt' };
    }
    const save = normalizeSave(raw);
    if (!save) {
      this.#backup(text);
      return { status: 'unreadable', reason: 'unsupported' };
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

  /** いまのセーブ（文字のまま）を復元前の退避先にコピーする。セーブがなければ true（退避するものがない） */
  stashBeforeRestore(): boolean {
    try {
      const text = this.#storage.getItem(SAVE_KEY);
      if (text !== null) this.#storage.setItem(BEFORE_RESTORE_KEY, text);
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
