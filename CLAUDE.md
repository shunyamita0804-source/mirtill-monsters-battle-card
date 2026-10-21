# CLAUDE.md — ミルティルモンスターズバトルカード 開発ガイド

このファイルは Claude Code 向けの引き継ぎ・作業ルールです。作業前に必ず読んでください。

## プロジェクト概要

- シリーズ名：**ミルティルモンスターズ**
- ゲーム名：**ミルティルモンスターズバトルカード**
- スマートフォン向け（縦持ち）2Dカードゲーム
- 構想：モンスターファームバトルカード（GB版・PS版）のようなゲームをスマホ向けに作る
  - ダンジョン攻略と街は GB版風、バトルは PS版風
  - ゲーム内通貨のガチャを搭載
- 開発の進め方：ユーザーが段階ごとに「指示書」を出し、その範囲だけを実装する

## 絶対に守るルール

1. **段階を勝手に進めない。** 各段階の完了後は作業を止めて報告し、ユーザーの承認を待つ。次の段階への自動移行は禁止。
2. **指示書の範囲外を実装しない。** 指示書で禁止された作業はしない。指示が曖昧なときは実装前に確認する。
3. **既存の「ミスティックモンスターズ」とは完全に独立。**
   - `shunyamita0804-source/mystic-monsters` のリポジトリ・ブランチ・作業フォルダ・Pagesサイト・素材・設定を変更しない
   - 既存リポジトリからのファイルコピー、ソース流用もしない
4. **GitHub Pages を公開しない。** 有効化・デプロイ・公開URL発行は、ユーザーの明示的な承認があるまで禁止。
   Privateリポジトリでも Pages は一般公開されうるため。手順は `docs/github-pages.md`。
5. **リポジトリは Private のまま。** 公開設定を変えない。
6. **force push しない。** 履歴の書き換えが必要な場合はユーザーに確認する。
7. 作業できなかったことは「未完了」として明確に報告する。

## 現在の状態（2026-10-21 時点）

- **第1段階（開発環境構築）：完了・承認済み**
- **第2段階（スマホ向けゲーム基盤構築）：実装済み・ユーザーの承認待ち**
  - 第3段階には進まない。次の指示書が届くまで実装を始めない。
  - `package-lock.json` はコミット済み。CI は `npm ci` でインストールする。
- 詳細は `docs/phase-1-report.md`、`docs/phase-2-report.md`、設計は `docs/architecture.md`。

## 技術構成

| 項目 | 内容 |
| --- | --- |
| 言語 | TypeScript 6（strict、`noUncheckedIndexedAccess`、`exactOptionalPropertyTypes` 有効） |
| ビルド | Vite 7 |
| テスト | Vitest 4（`tests/**/*.test.ts`、environment: node） |
| Node.js | **24 以上**（`.nvmrc`）。Node 22 付属の npm 10 では依存解決が内部エラー（`edgesOut`）になった。作業環境に Node 24 がなければ `nvm install 24` |
| CI | `.github/workflows/ci.yml`：push/PR で インストール→型チェック→テスト→ビルド→Pages用ビルド。**デプロイはしない** |

CI 実績での解決バージョン：Node 24.21.0 / TypeScript 6.0.3 / Vite 7.3.7 / Vitest 4.1.12 / @types/node 22.20.5

## コマンド

```bash
npm ci               # 依存関係のインストール（package-lock.json どおり）
npm install          # 依存を追加・更新するときだけ。更新された package-lock.json をコミット
npm run dev          # 開発サーバー（host: true なので同じWi-Fiのスマホから確認可）
npm run typecheck    # 型チェック
npm test             # テスト
npm run build        # 通常ビルド（base = /）
npm run build:pages  # GitHub Pages 用ビルド（base = /mirtill-monsters-battle-card/）
npm run check        # 型チェック＋テスト＋ビルド
```

作業の区切りごとに `npm run check` を通してからコミットすること。

## ディレクトリ

```
src/
  main.ts                 エントリ（CSS 読み込みと startApp）
  style.css               ベーススタイル（色の定義、#app / .viewport / .stage、safe-area、ズーム抑止）
  config/app.ts           正式名称・バージョン・段階・論理解像度（390×844 縦）
  config/screens.ts       画面ID一覧（title / town / shop / battle）
  core/                   DOM 非依存の基盤
    stageLayout.ts        画面サイズ → ステージの倍率・配置
    router.ts             画面遷移の履歴（navigate / back / reset）
    assetPath.ts          public/ のファイルを base パス付きURLにする resolvePublicPath()
    assetCategories.ts    assets/ のカテゴリ定義と素材ファイル名の命名規則
  game/                   DOM 非依存のゲームロジック
    cards/                カード型・カタログ・仮カード・画像の引き当て
    battle/               バトル状態と reducer（選択・仮のターン切り替え）、仮の初期状態
  ui/                     DOM を扱う層
    app.ts                ステージ＋ルーター＋画面差し替え
    stage.ts              論理解像度のステージを拡大縮小して配置
    dom.ts                h() / button() ヘルパー（文字列は textContent で入れる）
    cardArtSources.ts     assets/images/cards/ の画像を import.meta.glob で一覧化
    components/           カード表示・カード詳細・画面ヘッダー
    screens/              各画面と registry.ts（画面IDとの対応表）
    styles/               部品・画面・バトルの CSS
public/                   ビルドを通さず配信するファイル（favicon.svg, .nojekyll）
assets/                   ゲーム素材（カテゴリ別。詳細は assets/README.md）
tests/                    Vitest のテスト
docs/                     開発ドキュメント（architecture.md に設計）
.github/workflows/ci.yml  CI（デプロイなし）
.github/scripts/run-step.sh  CI失敗時に出力末尾をエラー注記に残すスクリプト
```

## 実装上の約束

- **素材の参照**
  - `assets/` の素材は `import url from '@assets/...'` で読み込む（base パスは Vite が自動対応）
  - `public/` のファイルは必ず `resolvePublicPath()` を通す。`/images/...` のような絶対パス直書きは Pages でリンク切れになる
  - 素材ファイル名は小文字英数字・`-`・`_` のみ、連番は3桁ゼロ埋め（`monster_001.png`）
  - `assets/` にカテゴリを追加したら `src/core/assetCategories.ts` と `assets/README.md` も更新する（テストで整合性チェックあり）
  - 権利未確認の素材は置かない。正式素材の組み込みは指示書で許可されてから
- **import**：拡張子付き（`./config/app.ts`）。`verbatimModuleSyntax` のため型のみの import は `import type`
- **パスエイリアス**：`@/` → `src/`、`@assets/` → `assets/`
- **ロジックと描画を分ける**：ゲームルール（バトル計算など）は DOM に依存しない純粋な TypeScript にして、Vitest でテストする
- **スマホ前提**：縦持ち 390×844 を基準に拡大縮小、タップ操作、safe-area 対応
  - 画面の CSS は論理 px（390 幅基準）で書く。拡大縮小は `.stage` が一括で行う
  - タップ領域は高さ 40px 以上
- **画面の追加**：`config/screens.ts` にID → `ui/screens/` に画面 → `registry.ts` に登録（手順は `docs/architecture.md`）
- **仮データ**：仮カードは `isPlaceholder: true`・ID `tmp-`・名前「仮」始まり。正式カードデータは指示書で許可されるまで作らない
- コメント・ドキュメント・コミットメッセージは日本語

## GitHub

- リポジトリ：https://github.com/shunyamita0804-source/mirtill-monsters-battle-card （Private）
- ブランチ：`main` のみ
- 最初のコミット `87de809 Initial commit` は GitHub が自動生成したもの（上書きせず残している）

## 報告の形式

段階の完了時は、指示書の「完了報告」項目に沿って報告する。指示書に項目がなければ次をまとめる：
実施内容／確認結果（型チェック・テスト・ビルド・CI）／未完了の作業／既存本編に変更がないことの確認／次の段階に進むための準備状況。
