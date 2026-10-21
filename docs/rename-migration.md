# 名称変更（Mirtill → Mistria）の移行計画

## 現在の状態（2026-10-22 夜間作業後）

| 項目 | 状態 |
| --- | --- |
| シリーズ名・ゲーム名（画面・HTML title・manifest・README・設定） | **変更済み**：ミストリアモンスターズ／Mistria Monsters、ミストリアモンスターズ バトルカード |
| npm パッケージ名 | **変更済み**：`mistria-monsters-battle-card` |
| アイコン（favicon / apple-touch-icon / PWA） | **作成済み**：同梱の公式アイコンを縮小のみで変換（`public/icons/`） |
| GitHub リポジトリ名 | **未実施**（`mirtill-monsters-battle-card` のまま） |
| GitHub Pages | **未公開**（公開の承認なし） |
| base パス | 現在のリポジトリ名 `/mirtill-monsters-battle-card/` のまま（改名と同時に切り替える） |

リポジトリの改名は GitHub 上の設定変更で、この作業環境からは実行できず、ユーザーの承認もないため実施していません。
コード側は、改名後に1か所を変えるだけで移行できるように準備しています。

## 改名後の想定URL

| 用途 | 現在 | 改名後（想定） |
| --- | --- | --- |
| リポジトリ | https://github.com/shunyamita0804-source/mirtill-monsters-battle-card | https://github.com/shunyamita0804-source/mistria-monsters-battle-card |
| Pages（公開した場合） | https://shunyamita0804-source.github.io/mirtill-monsters-battle-card/ | https://shunyamita0804-source.github.io/mistria-monsters-battle-card/ |
| Pages の base パス | `/mirtill-monsters-battle-card/` | `/mistria-monsters-battle-card/` |

## コード側で準備済みのこと

- `vite.config.ts`：`CURRENT_REPO_NAME`（現在）と `PLANNED_REPO_NAME`（改名後）を定義。`REPO_NAME = CURRENT_REPO_NAME` を切り替えるだけで base パスが変わる
- `public/manifest.webmanifest`：`start_url` と `scope` は `./`、アイコンも相対パス。base パスが変わっても書き換え不要
- `index.html`：アイコン・manifest は `/icons/...` 形式で書き、Vite がビルド時に base パスを付ける（Pages 用ビルドで確認済み）
- 画像などの素材：`assets/` は import、`public/` は `resolvePublicPath()` 経由。リポジトリ名を直書きしていない
- セーブデータのキー（`mistria-battle-card/save`）：パスに依存しないので、同じドメイン（`shunyamita0804-source.github.io`）なら改名後もそのまま読める
- canonical：開発版のため `noindex` で、canonical は設定していない（公開時に検討）

## 改名の手順（ユーザーの承認後）

1. GitHub のリポジトリ → Settings → General → Repository name を `mistria-monsters-battle-card` に変更
2. 手元のクローンの接続先を変更：`git remote set-url origin https://github.com/shunyamita0804-source/mistria-monsters-battle-card.git`
3. コードを切り替え
   - `vite.config.ts`：`export const REPO_NAME = PLANNED_REPO_NAME;`
   - `.github/workflows/ci.yml`：最後の確認を `grep -q '/mistria-monsters-battle-card/static/' dist/index.html` に
   - `tests/viteConfig.test.ts`・`tests/assetPath.test.ts` の期待値を新しいパスに
   - README・CLAUDE.md・docs/setup.md・docs/github-pages.md の URL（過去の完了報告は当時の記録として残す）
4. `npm run check` と `npm run build:pages` を実行し、CI が通ることを確認
5. GitHub Pages の公開は、改名とは別にユーザーの承認を得てから（`docs/github-pages.md`）

## 注意

- GitHub はリポジトリ改名後、旧リポジトリURL（Web・git）を新URLへ転送するが、**GitHub Pages の旧URLは転送されない**（旧URLは 404 になる）。旧URLのリダイレクトは保証できない
- 改名で過去の Issue・PR・コミットは失われない
- Actions のワークフローは改名後もそのまま動く（リポジトリ名を直書きしている箇所は上記3のみ）
