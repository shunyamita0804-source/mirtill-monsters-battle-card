# 開発環境セットアップ

## 必要なもの

- Node.js 24 以上（`.nvmrc` 参照）
- npm
- Git

## 初回

```bash
git clone https://github.com/shunyamita0804-source/sacred-monsters-battle-card.git
cd sacred-monsters-battle-card
npm ci
```

`package-lock.json` はコミット済みです。依存関係は `npm ci` でロックファイルどおりに入れてください。
依存を追加・更新したときだけ `npm install` を使い、更新された `package-lock.json` をコミットします。

Node.js 24 がない環境では `nvm install 24`（Node 22 付属の npm 10 では依存解決が内部エラーになる）。

## スマホでの確認

`npm run dev` を実行すると `Network: http://192.168.x.x:5173/` のように表示されます。同じ Wi-Fi の iPhone の Safari でその URL を開いてください。
URL の末尾に `?qa=1` を付けると QA 用のボタン（バトルのオート・即勝利、所持金追加、全カード付与、全パック解放）が出ます。

セーブはブラウザの localStorage（キー `mistria-battle-card/save`）に保存されます。最初からやり直すときはベッドの「セーブデータを消す」。

## ブラウザでの通し確認

`tools/e2e/README.md` を参照（Playwright を別途用意して実行）。

## よく使うコマンド

| コマンド | 内容 |
| --- | --- |
| `npm run dev` | 開発サーバー起動（同一Wi-Fiのスマホから表示されたIPでアクセス可） |
| `npm run typecheck` | TypeScript 型チェック |
| `npm test` | Vitest によるテスト |
| `npm run build` | 本番ビルド（base = `/`） |
| `npm run build:pages` | GitHub Pages 用ビルド（base = `/sacred-monsters-battle-card/`） |
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

本プロジェクトは「ミスティックモンスターズ」（`shunyamita0804-source/mystic-monsters`）とは独立しています。
ソースの流用は行いません。素材は 2026-10-22 のユーザー許可により読み取りで利用しています（`docs/audio-credits.md`）。

## クラウドセッション（Claude Code）

`.claude/hooks/session-start.sh` がセッション開始時に Node 24 と依存関係を自動で用意します。
手で `nvm install 24` や `npm ci` をする必要はありません。
