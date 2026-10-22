/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** 公開先のbaseパスを上書きする場合に指定（例: /sacred-monsters-battle-card/） */
  readonly VITE_BASE_PATH?: string;
}
