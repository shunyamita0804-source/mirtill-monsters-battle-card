# 開発環境セットアップ

## 必要なもの

- Node.js 24 以上（`.nvmrc` 参照）
- npm
- Git

## 初回

```bash
git clone https://github.com/shunyamita0804-source/mirtill-monsters-battle-card.git
cd mirtill-monsters-battle-card
npm ci
```

`package-lock.json` はコミット済みです。依存関係は `npm ci` でロックファイルどおりに入れてください。
依存を追加・更新したときだけ `npm install` を使い、更新された `package-lock.json` をコミットします。

## よく使うコマンド

| コマンド | 内容 |
| --- | --- |
| `npm run dev` | 開発サーバー起動（同一Wi-Fiのスマホから表示されたIPでアクセス可） |
| `npm run typecheck` | TypeScript 型チェック |
| `npm test` | Vitest によるテスト |
| `npm run build` | 本番ビルド（base = `/`） |
| `npm run build:pages` | GitHub Pages 用ビルド（base = `/mirtill-monsters-battle-card/`） |
| `npm run preview` | ビルド結果の確認 |
| `npm run check` | 型チェック＋テスト＋ビルドをまとめて実行 |

## ディレクトリ

```
src/      ゲームのソースコード（TypeScript）→ docs/architecture.md
public/   ビルドを通さずそのまま配信するファイル
assets/   ゲーム素材（画像・音声・フォント・データ）→ assets/README.md
tests/    Vitest のテスト
docs/     開発ドキュメント
```

## 独立性について

本プロジェクトは「ミスティックモンスターズ」（`shunyamita0804-source/mystic-monsters`）とは完全に独立しています。
既存リポジトリのファイルのコピー・ソースの流用は行いません。
