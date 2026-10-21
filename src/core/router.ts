/** 画面遷移の通知内容 */
export interface RouteChange<TId extends string> {
  readonly from: TId;
  readonly to: TId;
}

export type RouteListener<TId extends string> = (change: RouteChange<TId>) => void;

/**
 * 画面遷移の履歴を管理する（DOMに依存しない）。
 *
 * 画面IDは型パラメータで受け取るため、ダンジョン・ガチャ・大会などの画面を
 * 追加するときは画面ID一覧（src/config/screens.ts）に足すだけでよい。
 */
export class Router<TId extends string> {
  #stack: TId[];
  readonly #listeners = new Set<RouteListener<TId>>();

  constructor(initial: TId) {
    this.#stack = [initial];
  }

  get current(): TId {
    return this.#stack[this.#stack.length - 1] as TId;
  }

  /** 戻り先の履歴があるか */
  get canGoBack(): boolean {
    return this.#stack.length > 1;
  }

  /** 履歴（古い順）。デバッグ・テスト用 */
  get history(): readonly TId[] {
    return [...this.#stack];
  }

  /** 画面を履歴に積んで移動する。現在と同じ画面なら何もしない */
  navigate(to: TId): void {
    if (to === this.current) return;
    const from = this.current;
    this.#stack.push(to);
    this.#emit(from, to);
  }

  /** 一つ前の画面に戻る。戻れなければ false */
  back(): boolean {
    if (!this.canGoBack) return false;
    const from = this.current;
    this.#stack.pop();
    this.#emit(from, this.current);
    return true;
  }

  /** 履歴を消して指定画面から始め直す（タイトル→街など） */
  reset(to: TId): void {
    const from = this.current;
    this.#stack = [to];
    if (from !== to) this.#emit(from, to);
  }

  subscribe(listener: RouteListener<TId>): () => void {
    this.#listeners.add(listener);
    return () => {
      this.#listeners.delete(listener);
    };
  }

  #emit(from: TId, to: TId): void {
    for (const listener of this.#listeners) listener({ from, to });
  }
}
