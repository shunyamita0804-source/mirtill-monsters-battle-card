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
- **第2段階：ユーザーの指示書待ち。** 指示書が届くまで実装を始めない。
- 第2段階の最初の作業：`npm install` で生成される `package-lock.json` をコミットして依存バージョンを固定する（第1段階では未コミット）。
- 第1段階の詳細は `docs/phase-1-report.md`。

## 技術構成

| 項目 | 内容 |
| --- | --- |
| 言語 | TypeScript 6（strict、`noUncheckedIndexedAccess`、`exactOptionalPropertyTypes` 有効） |
| ビルド | Vite 7 |
| テスト | Vitest 4（`tests/**/*.test.ts`、environment: node） |
| Node.js | **24 以上**（`.nvmrc`）。Node 22 付属の npm 10 では依存解決が内部エラー（`edgesOut`）になった |
| CI | `.github/workflows/ci.yml`：push/PR で インストール→型チェック→テスト→ビルド→Pages用ビルド。**デプロイはしない** |

CI 実績での解決バージョン：Node 24.21.0 / TypeScript 6.0.3 / Vite 7.3.7 / Vitest 4.1.12 / @types/node 22.20.5

## コマンド

```bash
npm install          # 依存関係のインストール
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
  main.ts                 エントリ（現在は第1段階のプレースホルダー画面のみ）
  style.css               スマホ向けベーススタイル（safe-area、ズーム抑止など）
  config/app.ts           正式名称・バージョン・段階・論理解像度（390×844 縦）
  core/assetPath.ts       public/ のファイルを base パス付きURLにする resolvePublicPath()
  core/assetCategories.ts assets/ のカテゴリ定義と素材ファイル名の命名規則
public/                   ビルドを通さず配信するファイル（favicon.svg, .nojekyll）
assets/                   ゲーム素材（カテゴリ別。詳細は assets/README.md）
tests/                    Vitest のテスト
docs/                     開発ドキュメント
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
- コメント・ドキュメント・コミットメッセージは日本語

## GitHub

- リポジトリ：https://github.com/shunyamita0804-source/mirtill-monsters-battle-card （Private）
- ブランチ：`main` のみ
- 最初のコミット `87de809 Initial commit` は GitHub が自動生成したもの（上書きせず残している）

## 報告の形式

段階の完了時は、指示書の「完了報告」項目に沿って報告する。指示書に項目がなければ次をまとめる：
実施内容／確認結果（型チェック・テスト・ビルド・CI）／未完了の作業／既存本編に変更がないことの確認／次の段階に進むための準備状況。
