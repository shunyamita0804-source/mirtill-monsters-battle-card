# 引き継ぎメモ（2026-10-22 時点）

新しいセッションで読むのは `CLAUDE.md` とこのファイルだけ。他の資料は必要になったときに1つずつ読む。

## 1. いまの状態

| 項目 | 状態 |
| --- | --- |
| 公開URL | https://shunyamita0804-source.github.io/mirtill-monsters-battle-card/ （`main` の `142470a` を公開。2026-10-22） |
| リポジトリ | https://github.com/shunyamita0804-source/mirtill-monsters-battle-card （Public。ユーザー承認済み） |
| 公開する版 | `main`。作業はブランチで行い、確認後に `main` へマージしてから公開する |
| 本編 | `mystic-monsters`（育成ゲーム本編）は**変更禁止**。素材の利用だけ許可済み（読み取りのみ） |
| バトルのルール | **PS版『モンスターファーム バトルカード』準拠。変えるのは3点だけ**：山札60枚・ガッツを「マナ」と表記・全体カードとブリーダー（プレイヤー）カードを「サポート」に集約（ユーザー決定。`docs/battle-rules.md`） |
| 次の作業 | **ユーザーの次の指示待ち。** 指示が来るまで新しい作業を始めない |

## 2. これまでの作業（時系列・要点だけ）

1. 開発環境（Vite + TypeScript + Vitest、CI）→ スマホ向け基盤（390×844 の拡大縮小・画面遷移）
2. 夜間一括：名称「ミストリアモンスターズ バトルカード」、最小縦断体験（街 → 家でデッキ → ショップ → ダンジョン B1〜B3 ボス → 大会 → 報酬）
3. GitHub Pages 公開（Public 化はユーザー承認）。街の南の突き当たりにダンジョン入口
4. バトル画面：縦持ちの配置、伏せカード2枚で先攻・後攻、手札を1枚ずつ配る＋効果音
5. バトルルールの監査（`docs/battle-rules-audit.md`）→ PS版準拠へ5段階で改修（すべて `main` に取り込み・公開済み）
   - 1 マナ：自動で増えない・上限なし・カード1枚＝1マナ。攻撃のあとの「マナ化」で手札を何枚でもマナに。支払いは新しくマナにしたカードから捨て札へ
   - 2 ドロー：最初に手札5枚を引くのは先攻だけ。先攻1ターン目は攻撃なしでマナ化だけ（2枚まで）。後攻は最初のドローで5枚。
     ドローは5枚まで、5枚あれば山札の一番上を1枚マナに。引けなければ負け（効果のドローも）。手番の上限なし。同時全滅は攻撃側の勝ち
   - 3 守備：狙われたモンスターの防御・回避カードを何枚でも。守備を終えてからまとめてダメージ。回避＝0。攻撃の印「防御不可・回避不可・回避しても半分」
   - 4 サポート：仮サポート1〜3（すぐ効果・あわせて1ターン1回）、仮全体1〜3（場に1枚・入れ替わり）。パック1・2に収録、デッキ編集に「サポート」タブ
   - 5 デッキ：同じカードは3枚まで。スターターは技1〜6×3枚＋仮サポート6枚＝60枚。セーブ version 2（旧セーブは1回だけ不足カードを補填しデッキを組み直す）
6. 演出（ユーザー提供の PS版プレイ動画を参考。**技アニメーションは使わない**：ユーザー指示）
   - マナ化：カードが情報箱へ飛び、光って効果音。ダメージ：対象モンスターに衝撃の輪＋効果音
   - 守備待ちの対象にダメージ予定、場の全体カードを上の帯に表示、ターン・マナ化の切り替わりで帯の表示
7. 操作（ユーザー指示で何度か作り直した最終形）
   - 下の常設ボタンはなし。**必要なときだけ画面中央に帯を敷き、コマンドを縦に並べる**
   - ボタンはユーザー提供の金枠の画像（`assets/images/ui/button/`）に文字を重ねる。行うボタンは青、やめる／終えるボタンはワインレッド。控えめな見た目（150×51）
   - 確認は「はい／いいえ」を使わず、場面に合った文字（例：マナ化へ進む／攻撃を続ける）
   - カードを選ぶと「使う／やめる」、使えるカードがなければ帯に「攻撃終了」。ふだんの「攻撃終了」は上の帯の右端の小さなボタン（自分の攻撃中だけ）
   - マナ化は手札をタップで選んで「マナにする（N枚）」→「ターン終了」

## 3. 大事な約束（詳しくは CLAUDE.md）

- 指示書の範囲だけを実装する。終わったら止めて報告し、承認を待つ
- 指示の受け取り方：ユーザーは「ZIP に UTF-8 TXT の指示書1本」や、動画・画像・チャットで指示を出す
- カード・価格・提供割合・大会・敵編成・マップはすべて**仮**（`src/data/`）。仮カードは「仮」始まり
- 本編 `mystic-monsters` は変更しない。素材を使うときは読み取りでクローンし、`docs/audio-credits.md` や `assets/README.md` に記録する
- 公開は「公開して」と言われたときだけ。ユーザーから「通し確認してから公開」の指示あり（公開前は `flow.cjs` を通す）
- force push しない。報告・コメント・コミットメッセージは日本語。ユーザーは非エンジニア：報告は専門用語を避けて短く

## 4. 作業環境の手順

クラウドセッションでは開始時に Node 24 と依存関係が自動で入る（`.claude/hooks/session-start.sh`）はずだが、
**2026-10-22 は動かなかった**（Node 22 のまま・`node_modules` なし・`nvm install 24` も失敗。原因は未調査）。`node -v` が 24 でなければ：

```bash
# 作業用フォルダ（スクラッチパッド）に Node 24 を直接入れて使う
V=$(curl -sS https://nodejs.org/dist/index.tab | awk '$1 ~ /^v24\./ {print $1; exit}')
curl -sS -o node.tar.xz https://nodejs.org/dist/$V/node-$V-linux-x64.tar.xz && tar xf node.tar.xz
export PATH=$PWD/node-$V-linux-x64/bin:$PATH && npm install --no-audit --no-fund   # リポジトリで実行
```

```bash
npm run check            # 型チェック＋テスト（176件）＋ビルド
npx vite preview --port 4173 --host 127.0.0.1   # 画面の確認（ビルド後。バックグラウンドで動かす）
```

- ブラウザ確認：Playwright（`/opt/node-tools/node_modules/playwright`、Chromium は `/opt/pw-browsers`）
  - 通し確認：`PLAYWRIGHT_MODULE=/opt/node-tools/node_modules/playwright E2E_OUT=<保存先> node tools/e2e/flow.cjs http://127.0.0.1:4173/`
    **新ルールで対戦が長くなり 15〜30分かかる**（ボスや決勝で負けるとやり直す）。バックグラウンドで、時間の上限を長く（1時間以上）して動かす
  - 操作・画面サイズ確認：`tools/e2e/flow2.cjs`（約1〜2分）
  - 確認中に `npm run check`／`vite build` を動かさない（表示中のファイルが入れ替わる）
  - プレビューを止めるときは `pkill -f "vite previe[w]"`（`"vite preview"` と書くと自分のコマンドまで止まる）
  - URL に `?qa=1` で QA 用ボタン（バトルのオート・即勝利、所持金追加など）
- 本編の素材を見るとき：`GIT_LFS_SKIP_SMUDGE=1 git clone --depth 1 https://github.com/shunyamita0804-source/mystic-monsters /home/user/shunyamita0804-source/mystic-monsters`（読み取りのみ）
- PS版の参考サイト：note は読める。tapatalk・gamefaqs・legendcup は相手サイトの制限で読めない（必要ならユーザーに文章を貼ってもらう）
- 公開URL（github.io）にはこの作業環境から接続できない。公開後の見た目はユーザーの iPhone で確認してもらう

## 5. 公開（デプロイ）の手順

ユーザーが「公開して」と言ったときだけ行う。

1. 通し確認（`flow.cjs`）が通ることを確かめる
2. 作業ブランチを `main` にマージ（`git merge --no-ff`）→ `npm run check` → `git push origin main`
3. GitHub Actions のワークフロー `deploy-pages.yml` を `main` で手動実行
   （GitHub MCP の `actions_run_trigger`：method `run_workflow`、workflow_id `deploy-pages.yml`、ref `main`）
4. build と deploy のジョブが成功したことを確認して報告（反映まで1〜2分）。このメモの公開URLの行を更新

## 6. 未完了・気になっている点

- iPhone 実機での確認はユーザー頼み：効果音（カードを引く・先攻後攻・マナ・ダメージ）が鳴るか・音量、中央の帯のコマンドと右上の「攻撃終了」の押しやすさ、
  マナが飛ぶ演出、旧セーブのデッキが自動で直っているか
- PS版で未確認の裁定（ユーザーが実機で確認する約束）：`docs/battle-rules-audit.md` の5章、`docs/battle-rules.md` の「まだ確かめられていないこと」
- 正式カード待ちで未実装：防御の「0にする・はね返す・効果だけ消す・肩代わり」、全体カードを打ち消すカード、コンボ、派生モンスター（MAIN/SUB）の技、モンスターの特徴（地上・空中）
- 新ルールでは1戦が長め（自動対戦で1〜2分）。テンポ調整はユーザーの判断待ち
- 正式素材が無いもの：背景、モンスター・技カードの絵、NPC・敵・宝箱、BGM。正式仕様が無いもの：カードデータ、価格・提供割合、大会、敵編成、隠しモンスター
- リポジトリ名の変更（mirtill → mistria）は未実施（`docs/rename-migration.md`）
- ダンジョンから帰ると家に戻る（街の入口の前には戻らない）。対戦の途中でアプリを閉じると、その対戦は最初からやり直し
- 不要になった作業ブランチ（`fix/town-dungeon-gate`・`feature/battle-layout-deal`・`claude/cool-gauss-emyae1`）は main に取り込み済み。消すかどうかはユーザーに確認してから

## 7. 主なファイル

| 内容 | 場所 |
| --- | --- |
| 作業ルール・構成 | `CLAUDE.md` |
| 設計（画面・ロジック・セーブ） | `docs/architecture.md` |
| バトルのルール（PS版準拠・ユーザー承認済み） | `docs/battle-rules.md` |
| バトルルール監査（PS版との差分・改修順・実機確認のお願い） | `docs/battle-rules-audit.md` |
| ルール設定値（仮の数値含む） | `src/data/rules.ts` |
| カード（仮モンスター・仮技・仮サポート） | `src/data/cards.ts`・`src/game/cards/cardTypes.ts` |
| バトルのルール本体・相手の思考 | `src/game/battle/engine.ts`・`src/game/battle/ai.ts` |
| デッキの決まり・スターター・自動構築 | `src/game/deck/deck.ts` |
| セーブ（形式 version 2・変換） | `src/game/save/saveData.ts` |
| バトル画面・コマンドボタン | `src/ui/screens/battleScreen.ts`・`src/ui/components/commandButton.ts`・`src/ui/styles/battle.css` |
| 効果音の割り当て・出どころ | `src/ui/sound.ts`（`SE_REGISTRY`）・`docs/audio-credits.md` |
| 素材の置き場と記録 | `assets/README.md` |
| 公開の手順 | `docs/github-pages.md` |
| 名称変更の計画 | `docs/rename-migration.md` |
