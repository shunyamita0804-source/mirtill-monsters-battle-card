import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';

/**
 * GitHub Pages（プロジェクトサイト）は https://<owner>.github.io/<repo>/ で配信されるため、
 * 本番ビルドの base はリポジトリ名のサブパスにする。
 *
 * - `npm run dev`        : base = '/'
 * - `npm run build`      : base = '/'（ローカル確認・汎用ホスティング向け）
 * - `npm run build:pages`: base = '/mirtill-monsters-battle-card/'（GitHub Pages 向け）
 * - 環境変数 VITE_BASE_PATH を指定した場合はそれを最優先（独自ドメイン等）
 */
/**
 * GitHub 上のリポジトリ名（= Pages の base パス）。
 * 名称変更（Mirtill → Mistria）に伴うリポジトリ改名は未実施（ユーザー承認待ち）。
 * 改名したら CURRENT_REPO_NAME を PLANNED_REPO_NAME に変え、CI の base パス確認も合わせる（docs/rename-migration.md）。
 */
export const CURRENT_REPO_NAME = 'mirtill-monsters-battle-card';
export const PLANNED_REPO_NAME = 'mistria-monsters-battle-card';
export const REPO_NAME = CURRENT_REPO_NAME;
export const PAGES_BASE = `/${REPO_NAME}/`;

export function resolveBase(mode: string, envBase?: string): string {
  if (envBase && envBase.trim() !== '') {
    const trimmed = envBase.trim();
    const withLead = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
    return withLead.endsWith('/') ? withLead : `${withLead}/`;
  }
  return mode === 'pages' ? PAGES_BASE : '/';
}

export default defineConfig(({ mode }) => ({
  base: resolveBase(mode, process.env.VITE_BASE_PATH),
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@assets': fileURLToPath(new URL('./assets', import.meta.url)),
    },
  },
  build: {
    outDir: 'dist',
    assetsDir: 'static',
    sourcemap: true,
    // 画像は小さくてもファイルとして出力し、base 配下のパスで解決させる
    assetsInlineLimit: 0,
  },
  server: {
    host: true, // 同一ネットワークのスマホ実機から確認できるようにする
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
}));
