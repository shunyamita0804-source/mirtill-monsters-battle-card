# 引き継ぎメモ（2026-10-22 時点）

新しいセッションで読むのは `CLAUDE.md` とこのファイルだけ。他の資料は必要になったときに1つずつ読む。

## 1. いまの状態

| 項目 | 状態 |
| --- | --- |
| 公開URL | https://shunyamita0804-source.github.io/mirtill-monsters-battle-card/ （`main` の `60bae3f` を公開中） |
| リポジトリ | https://github.com/shunyamita0804-source/mirtill-monsters-battle-card （Public。ユーザー承認済み） |
| 公開する版 | `main`。作業はブランチで行い、確認後に `main` へマージしてから公開する |
| 本編 | `mystic-monsters`（育成ゲーム本編）は**変更禁止**。素材の利用だけ許可済み（読み取りのみ） |
| 次の作業 | **ユーザーの次の指示待ち。** バトルルール監査（`docs/battle-rules-audit.md`）を報告済み。次回候補は「マナの仕組み」。承認まで始めない |

## 2. これまでの作業（時系列）

1. 第1段階：開発環境（Vite + TypeScript + Vitest、CI）
2. 第2段階：スマホ向け基盤（390×844 の拡大縮小・セーフエリア・画面遷移）
3. 夜間一括（2026-10-22）：名称を「ミストリアモンスターズ バトルカード」に変更し、最小縦断体験を実装
   （街 → 家でデッキ → ショップでパック → ダンジョン B1〜B3 ボス → 大会 → 報酬。報告：`docs/nightbatch-2026-10-22-report.md`）
4. GitHub Pages 公開（ユーザー承認。リポジトリを Public 化）
5. 修正：街の中央の道を南へ進んだ突き当たり（x=7〜8, y=25）にダンジョン入口。踏むとダンジョン選択へ
6. バトル画面の変更：
   - PS版の情報配置を縦持ちに組み直した（上＝手番／中＝情報箱とモンスター3体／中段＝説明文と選んだ技カードの拡大／下＝手札と操作）
   - バトル前に伏せたカード2枚から1枚を選んで先攻・後攻を決める
   - 手札は1枚ずつ高速で配る（補充・ドローも同じ）
   - 効果音：カードを引く音・先攻後攻を選ぶ音（ミスティックモンスターズの素材。`docs/audio-credits.md`）
7. 作業時間の短縮：`CLAUDE.md` を短くし、資料は必要なときだけ読むルールにした。セッション開始時の準備を自動化（ゲームの中身は変更なし・公開不要）
8. バトルルール監査（第1便）：PS版準拠に向けた差分表・設計案・改修順を `docs/battle-rules-audit.md` にまとめた（コード変更なし）。参考URLはこの環境から接続できず、未確認の裁定は【要実機確認】
   - 指示書の運用ルール：今後の指示は「ZIP に UTF-8 TXT の指示書1本だけ」

## 3. 大事な約束（詳しくは CLAUDE.md）

- 指示書の範囲だけを実装する。終わったら止めて報告し、承認を待つ
- カード・ルール・価格・提供割合・大会・敵編成・マップはすべて**仮**（`src/data/`）。正式仕様として扱わない
- 本編 `mystic-monsters` は変更しない。素材を使うときは読み取りでクローンし、使った素材を `docs/audio-credits.md` に記録する
- force push しない。報告・コメント・コミットメッセージは日本語
- ユーザーは日本語・非エンジニア。報告は専門用語を避けて短く

## 4. 作業環境の手順

クラウドセッションでは開始時に Node 24 と依存関係が自動で入る（`.claude/hooks/session-start.sh`）。

```bash
npm run check            # 型チェック＋テスト（155件）＋ビルド
npx vite preview --port 4173 --host 127.0.0.1   # 画面の確認（ビルド後。長時間動かすときはバックグラウンドで）
```

- ブラウザ確認：Playwright（`/opt/node-tools/node_modules/playwright`、Chromium は `/opt/pw-browsers`）
  - 通し確認：`PLAYWRIGHT_MODULE=/opt/node-tools/node_modules/playwright E2E_OUT=<保存先> node tools/e2e/flow.cjs http://127.0.0.1:4173/`（約5分）
  - 操作・画面サイズ確認：`tools/e2e/flow2.cjs`（約1分）
  - URL に `?qa=1` で QA 用ボタン（バトルのオート・即勝利、所持金追加など）
- 本編の素材を見るとき：`GIT_LFS_SKIP_SMUDGE=1 git clone --depth 1 https://github.com/shunyamita0804-source/mystic-monsters /home/user/shunyamita0804-source/mystic-monsters`（読み取りのみ。push しない）
- 公開URL（github.io）にはこの作業環境から接続できない。公開後の見た目はユーザーの iPhone で確認してもらう

## 5. 公開（デプロイ）の手順

ユーザーが「公開して」と言ったときだけ行う。

1. 作業ブランチを `main` にマージ（`git merge --no-ff`）→ `npm run check` → `git push origin main`
2. GitHub Actions のワークフロー `deploy-pages.yml` を `main` で手動実行
   （GitHub MCP の `actions_run_trigger`：method `run_workflow`、workflow_id `deploy-pages.yml`、ref `main`）
3. build と deploy のジョブが成功したことを確認して報告（反映まで1〜2分）

## 6. 未完了・気になっている点

- iPhone 実機での確認はユーザー頼み（効果音が鳴るか・音量、手札を配る速さ 1枚0.11秒、操作感）
- 正式素材が無いもの：街・家・ショップ・会場・ダンジョンの背景、モンスター・技カードの絵、NPC・敵・宝箱、BGM
- 正式仕様が無いもの：カードデータ、バトルの正式ルール、価格・提供割合、大会の人数・対戦数、敵編成、隠しモンスター
- リポジトリ名の変更（mirtill → mistria）は未実施（`docs/rename-migration.md`）
- ダンジョンから帰ると家に戻る（街の入口の前には戻らない）
- 対戦の途中でアプリを閉じると、その対戦は最初からやり直し
- 不要になった作業ブランチ（`fix/town-dungeon-gate`・`feature/battle-layout-deal`）は main に取り込み済み。消すかどうかはユーザーに確認してから

## 7. 主なファイル

| 内容 | 場所 |
| --- | --- |
| 作業ルール・構成 | `CLAUDE.md` |
| 設計（画面・ロジック・セーブ） | `docs/architecture.md` |
| バトルルール監査（PS版との差分・改修順） | `docs/battle-rules-audit.md` |
| 夜間作業の報告 | `docs/nightbatch-2026-10-22-report.md` |
| 効果音の出どころ | `docs/audio-credits.md` |
| 公開の手順 | `docs/github-pages.md` |
| 名称変更の計画 | `docs/rename-migration.md` |
| 仮データ（カード・ルール・価格・大会・マップ） | `src/data/` |
| バトル画面 | `src/ui/screens/battleScreen.ts`・`src/ui/styles/battle.css` |
| 効果音の割り当て | `src/ui/sound.ts`（`SE_REGISTRY`） |
