# GitHub Pages 公開準備

> 名称変更（Mistria）に伴うリポジトリ改名後は URL・base パスが変わります。[rename-migration.md](rename-migration.md) を参照。

> **現在の状態：2026-10-22 にユーザーが公開を承認。** リポジトリを Public にし、Pages の Source を「GitHub Actions」にしたうえで、
> `.github/workflows/deploy-pages.yml`（手動実行）で `main` を公開する。
> 公開URL：https://shunyamita0804-source.github.io/mirtill-monsters-battle-card/

## ⚠ 公開前の注意

リポジトリが **Private でも、GitHub Pages のサイトはプランや設定によってインターネットに一般公開されます。**
（Pages のアクセス制限ができるのは GitHub Enterprise Cloud の一部構成のみ）
公開すると、ビルドに含めた画像・データは誰でも取得できる状態になります。

## 準備済みのもの

| 項目 | 内容 |
| --- | --- |
| base パス | `npm run build:pages` で `/mirtill-monsters-battle-card/` を base にビルド（`vite.config.ts`） |
| 上書き | 環境変数 `VITE_BASE_PATH` で任意の base に変更可能（独自ドメイン等） |
| 素材パス | `assets/` は `import` で自動対応、`public/` は `resolvePublicPath()` を使用 |
| `.nojekyll` | `public/.nojekyll` を dist に出力（Jekyll 処理の無効化） |
| ワークフロー雛形 | `docs/github-pages/deploy-pages.yml.example`（**無効化した状態で保管**、手動実行のみの設定） |
| 検証 | CI（`.github/workflows/ci.yml`）で Pages 用ビルドが成功し base パスが正しいことを確認 |

## 公開する場合の手順（承認後のみ実施）

1. 公開してよい内容か（素材の権利・未発表情報）を確認する
2. `docs/github-pages/deploy-pages.yml.example` を `.github/workflows/deploy-pages.yml` にコピーして push
3. GitHub のリポジトリ → Settings → Pages → Source を「GitHub Actions」に設定
4. Actions タブから「Deploy to GitHub Pages」を手動実行
5. 公開URL：`https://shunyamita0804-source.github.io/mirtill-monsters-battle-card/`

## 公開を止める場合

Settings → Pages で GitHub Pages を無効化（Unpublish）する。
