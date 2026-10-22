# CLAUDE.md — ミストリアモンスターズ バトルカード 開発ガイド

このファイルは Claude Code 向けの引き継ぎ・作業ルールです。作業前に必ず読んでください。

## プロジェクト概要

- シリーズ名：**ミストリアモンスターズ**（Mistria Monsters）
- ゲーム名：**ミストリアモンスターズ バトルカード**
- 旧名称「ミルティル（Mirtill）」から改称（2026-10-22）。GitHub リポジトリ名は未改名（`docs/rename-migration.md`）
- スマートフォン向け（縦持ち）2Dカードゲーム
- 構想：モンスターファームバトルカード（GB版・PS版）のようなゲームをスマホ向けに作る
  - ダンジョン攻略と街は GB版風、バトルは PS版風
  - ゲーム内通貨のガチャを搭載
- 開発の進め方：ユーザーが段階ごとに「指示書」を出し、その範囲だけを実装する

## 絶対に守るルール

1. **段階を勝手に進めない。** 各段階の完了後は作業を止めて報告し、ユーザーの承認を待つ。次の段階への自動移行は禁止。
2. **指示書の範囲外を実装しない。** 指示書で禁止された作業はしない。指示が曖昧なときは実装前に確認する。
3. **既存の「ミスティックモンスターズ」は変更しない。**
   - `shunyamita0804-source/mystic-monsters` のリポジトリ・ブランチ・作業フォルダ・Pagesサイト・素材・設定を変更しない
   - **素材（SE など）の利用は 2026-10-22 にユーザー（両方の所有者）が許可。** 本編は読み取りのみ。使った素材は `docs/audio-credits.md` に記録する
   - ソースコードの流用はしない。後から別の素材・UI に差し替える可能性がある（差し替えやすい形で組み込む）
4. **GitHub Pages：2026-10-22 にユーザーが公開を承認。** `main` の内容を `.github/workflows/deploy-pages.yml`（手動実行）で公開する。
   公開されたものは誰でも見られる。手順は `docs/github-pages.md`。
5. **リポジトリの公開設定：2026-10-22 にユーザーが Public 化を承認**（無料プランでは Private のまま Pages を使えないため）。これ以外の設定変更はしない。
6. **force push しない。** 履歴の書き換えが必要な場合はユーザーに確認する。
7. 作業できなかったことは「未完了」として明確に報告する。

## 現在の状態（2026-10-22 時点）

**新しいセッションは `docs/handoff.md`（引き継ぎメモ）を最初に読むこと。**

- 第1段階（開発環境構築）：完了・承認済み
- 第2段階（スマホ向けゲーム基盤構築）：完了
- 夜間一括指示（2026-10-22）：実装済み・`main` に取り込み済み（報告：`docs/nightbatch-2026-10-22-report.md`）
  - 最小縦断体験：街 → 家でデッキ確認 → ショップでパック → ダンジョン B1〜B3 ボス → 大会受付 → 対戦 → 報酬
- その後の修正（どちらも公開済み）：街からダンジョン入口へ歩いて行ける／バトル画面の新配置・先攻後攻のカード選択・手札を配る演出と効果音
- 公開中：`main`（`60bae3f`）を GitHub Pages で公開
- **次の指示が届くまで新しい作業を始めない**
- **仮データ・仮ルール**：カード・ルール値・価格・提供割合・大会・敵編成・マップはすべて仮（`src/data/`）。正式仕様として扱わない
- 育成ゲーム本編（`mystic-monsters`）の正式仕様は参照していない。素材は 2026-10-22 から許可の範囲で利用（効果音2つ。`docs/audio-credits.md`）

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
  style.css               ベーススタイル（色、#app / .viewport / .stage、safe-area、ズーム抑止）
  config/                 正式名称・論理解像度（390×844 縦）・画面ID一覧
  data/                   【仮データ】カード・ルール値・パック/価格・大会・マップ・ダンジョン・欠片
  core/                   DOM 非依存の基盤（画面の拡大縮小、Router、素材パス）
  game/                   DOM 非依存のゲームロジック
    battle/               バトルのルール（engine.ts）と AI（ai.ts）
    deck/                 デッキ検証・スターター・NPC デッキ
    economy/              ガチャ（提供割合・抽選・購入の二重処理防止）
    progress/             大会・ダンジョン・欠片の進行
    save/                 セーブデータ（版管理・移行・安全な読み込み）と保存先
    world/                歩行マップの当たり判定・経路探索
  ui/                     DOM を扱う層
    app.ts / stage.ts     画面の組み立て・拡大縮小
    gameStore.ts          セーブの読み書きと画面をまたぐ一時情報（バトル依頼など）
    components/           技カード（V4）・モンスターカード・カード詳細・一覧・ダイアログ
    screens/              各画面と registry.ts
    styles/               CSS
public/                   アイコン（icons/）・manifest・.nojekyll
assets/                   素材（技カードテンプレートV4、主人公歩行QA素材 など。assets/README.md）
tests/                    Vitest（ロジック・データ整合性・進行不能チェック）
tools/e2e/                Playwright の通し確認スクリプト（npm 依存外・CI 外）
docs/                     開発ドキュメント
.github/workflows/ci.yml  CI（main と nightbatch/** の push、PR。デプロイなし）
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
- **仮データ**：仮カードは `isPlaceholder: true`・名前「仮」始まり。数値・ルール・価格などの仮の値は `src/data/` に集め、画面にも「仮」と出す。正式データは指示書で許可されるまで作らない
- **セーブ**：変更は `GameStore.update(純粋関数)` で。形式を変えるときは `SAVE_VERSION` を上げて `MIGRATIONS` を足す
- **二重タップ**：購入・景品・特別復元など一度きりの処理は ID で1回だけ処理する（`processedTransactions`・`claimedEntries`・`once()`）
- コメント・ドキュメント・コミットメッセージは日本語

## GitHub

- リポジトリ：https://github.com/shunyamita0804-source/mirtill-monsters-battle-card （2026-10-22 から Public）
- ブランチ：`main`（公開する版）。作業はブランチで行い、確認後に `main` へマージしてから公開する（手順は `docs/handoff.md`）
- 公開URL：https://shunyamita0804-source.github.io/mirtill-monsters-battle-card/ （2026-10-22 公開。更新は Actions の「Deploy to GitHub Pages」を手動実行）
- 最初のコミット `87de809 Initial commit` は GitHub が自動生成したもの（上書きせず残している）

## 報告の形式

段階の完了時は、指示書の「完了報告」項目に沿って報告する。指示書に項目がなければ次をまとめる：
実施内容／確認結果（型チェック・テスト・ビルド・CI）／未完了の作業／既存本編に変更がないことの確認／次の段階に進むための準備状況。
