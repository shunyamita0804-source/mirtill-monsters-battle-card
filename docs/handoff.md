# 引き継ぎメモ（2026-10-22 時点・歩く操作の作り直しの公開のあと）

新しいセッションで読むのは `CLAUDE.md` とこのファイルだけ。他の資料は必要になったときに1つずつ読む。

## 1. いまの状態

| 項目 | 状態 |
| --- | --- |
| 正式名称 | セイクリッドモンスターズ バトルカード（Sacred Monsters Battle Card・短縮「セイクリッドBC」）。旧称ミルティル・ミストリア |
| 公開URL | https://shunyamita0804-source.github.io/sacred-monsters-battle-card/ （`main` の `bbb8b8a` を公開。2026-10-22。序盤イベント＋指でなぞって歩く操作。公開後に作業環境から確認 OK。**iPhone での確認はまだ**）。旧URL（…/mirtill-monsters-battle-card/）は 404 |
| リポジトリ | https://github.com/shunyamita0804-source/sacred-monsters-battle-card （Public。2026-10-22 ユーザーが改名。旧名 mirtill-monsters-battle-card） |
| 最新版 | `main` の `bbb8b8a`（序盤イベント・歩く操作の作り直し・街デザイン資料パック。テスト 249件） |
| 公開する版 | `main`。作業はブランチで行い、確認後に `main` へマージしてから公開する |
| 本編 | `mystic-monsters`（育成ゲーム本編）は**変更禁止**。素材の利用だけ許可済み（読み取りのみ） |
| バトルのルール | **PS版『モンスターファーム バトルカード』準拠。変えるのは3点だけ**：山札60枚・ガッツを「マナ」と表記・全体カードとブリーダー（プレイヤー）カードを「サポート」に集約（ユーザー決定。`docs/battle-rules.md`） |
| 街デザイン | **資料パック第1版を作成（`main` に取り込み済み）**。`docs/design/seimon-town/`。ChatGPT で部品ごとに描き、Claude が設計図どおりに並べる方式（ユーザー決定）。街は 4800×4800（主人公 108×144）。部屋7つも含む。届いた部品の画像はリポジトリに入れていない（ユーザーの手元とチャットにある） |
| 序盤イベント | **公開済み（ユーザー OK・2026-10-22）**。ユーザーの「序盤導入・チュートリアル設計パック」どおり：家から街へ → となりの家の女性の声かけ → 北西の練習場 → 練習試合（場面ごとのヒント）→ 自由行動。会話 UI はミスモンの画像（ユーザー指示）。台詞・名前・会話の絵はすべて仮。セーブ version 3（旧セーブは導入を始めない） |
| 次の作業 | ユーザーの次の指示待ち。iPhone での確認（序盤イベント・なぞって歩く操作）をお願い中。街デザインはデザイン担当の2回目の残り（住宅E・噴水・地面・小物・部屋）待ち |

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

8. 次便（2026-10-22）：正式名称へ改名・正式アイコン（`public/icons/`。原本は `assets/images/icons/`）・日英切り替え（`docs/i18n.md`）・
   セーブの JSON 書き出し／復元・設定画面（言語・効果音・BGM〔将来用〕・ミュート・遊び方。タイトルとベッドから）・データ点検（`docs/card-data-policy.md`）
9. 街デザイン資料パック（2026-10-22）：ユーザーの ZIP（ChatGPT とのやり取りが行き詰まった街の設計）を受けて作成。
   設計図は `tools/design/seimon_town_pack.py` で作り、自動チェック（全玄関・出口へ歩ける、部屋の家具の前へ歩ける）付き。
   配布用 ZIP には参考画像（旧街・主人公素材）も入れる（リポジトリには画像を入れていない）
10. 序盤イベント（2026-10-22）：ユーザーの ZIP「Seimon_Opening_Tutorial_DesignPack」（台本 V1・設計案）を実装。仮の街を新設計図に近い並びに作り直し
   （練習場・となりの家を追加、出入口・欠片・e2e の座標を更新）。会話 UI＝ミスモンの会話画像（`assets/images/ui/talk/`・`docs/audio-credits.md`）。
   通し確認は `tools/e2e/intro.cjs`（`flow.cjs`・`flow2.cjs` も新しい街に合わせて更新）

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
npm run check            # 型チェック＋テスト（249件）＋ビルド
npx vite preview --port 4173 --host 127.0.0.1   # 画面の確認（ビルド後。バックグラウンドで動かす）
# 公開と同じ base で確かめるとき：npm run build:pages → npx vite preview --mode pages … → http://127.0.0.1:4173/sacred-monsters-battle-card/
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
- 公開URL（github.io）には、2026-10-22 の次便の公開後はこの作業環境から接続できた（curl・Playwright）。それでも最終の見た目はユーザーの iPhone で確認してもらう
- GitHub への push は新しい名前のリポジトリで行う（`origin` = https://github.com/shunyamita0804-source/sacred-monsters-battle-card）。
  権限エラー（「authorized repository set にない」）が出たら、セッションに `sacred-monsters-battle-card` を追加してから push する
- `main` への push は、作業環境の安全確認で止められることがある。そのときはユーザーに「main に入れてよいか」を確認してから行う

## 5. 公開（デプロイ）の手順

ユーザーが「公開して」と言ったときだけ行う。

1. 通し確認（`flow.cjs`）が通ることを確かめる
2. 作業ブランチを `main` にマージ（`git merge --no-ff`）→ `npm run check` → `git push origin main`
3. GitHub Actions のワークフロー `deploy-pages.yml` を `main` で手動実行
   （GitHub MCP の `actions_run_trigger`：method `run_workflow`、workflow_id `deploy-pages.yml`、ref `main`）
4. build と deploy のジョブが成功したことを確認して報告（反映まで1〜2分）。このメモの公開URLの行を更新

## 6. 未完了・気になっている点

- 新URLは 2026-10-22 にユーザーが iPhone で開いて「すべてOK」。旧URLは 404（転送なし）
- iPhone のホーム画面版（PWA）は、URL が変わるとセーブが見えない可能性あり → 設定の「セーブをバックアップ」で引き継ぐ（書き出し・復元の iPhone での操作は個別には未確認）
- 正式アイコンの角の外側は白（原本のまま。透過加工は承認なしではしない）
- 英語はすべて仮訳（カード・パック・大会・マップ・能力名 POW/INT）。正式な英語名は未決。小さいモンスターカードでは英語名が「Temp Mo…」と省略される
- 次便の指示書で「次次便に保留」とされた事項・デザイン担当向けの街・主人公制作は、まだ受け取っていない（ユーザーから届いたら対応）
- 商標の確認は未実施（名称変更＝商標の安全の保証ではない）
- 演出の簡略化（動きを減らす設定）は未実装（必要なら項目を追加する）
- PS版で未確認の裁定（ユーザーが実機で確認する約束）：`docs/battle-rules-audit.md` の5章、`docs/battle-rules.md` の「まだ確かめられていないこと」
- 正式カード待ちで未実装：防御の「0にする・はね返す・効果だけ消す・肩代わり」、全体カードを打ち消すカード、コンボ、派生モンスター（MAIN/SUB）の技、モンスターの特徴（地上・空中）
- 新ルールでは1戦が長め（自動対戦で1〜2分）。テンポ調整はユーザーの判断待ち
- 正式素材が無いもの：背景、モンスター・技カードの絵、NPC・敵・宝箱、BGM。正式仕様が無いもの：カードデータ、価格・提供割合、大会、敵編成、隠しモンスター
- ダンジョンから帰ると家に戻る（街の入口の前には戻らない）。対戦の途中でアプリを閉じると、その対戦は最初からやり直し
- 序盤イベントで未完了・仮のもの：となりの家の女性の正式な名前（名前の札は仮で「隣家の女性」）、会話の絵（表情6種）と街の歩行16コマ（届くまで「仮」の札と印）、
  正式な台詞（台本 V1 は仮）、練習相手のデッキ（スターターと同じ3体・仮）。案内役は練習場まで一緒に歩かず、先に練習場で待つ（設計パックで認められた「目的地の表示」方式）
- 新しい街・部屋はまだゲームに入れていない（今の街は仮のマス目の街のまま）。部品の絵が届いて承認されてから、別の作業として組み込む
- 不要になった作業ブランチ（`fix/town-dungeon-gate`・`feature/battle-layout-deal`・`claude/cool-gauss-emyae1`・`feature/sacred-rename-i18n`）は main に取り込み済み。消すかどうかはユーザーに確認してから

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
| 日英の辞書・英訳表 | `src/i18n/`（`docs/i18n.md`） |
| 設定画面・バックアップ | `src/ui/screens/optionsScreen.ts`・`src/game/save/backup.ts`・`src/game/settings/settings.ts` |
| 名称変更の記録 | `docs/rename-migration.md` |
| 街・部屋のデザイン資料（設計図・ChatGPT 依頼文・QA） | `docs/design/seimon-town/`（入口は `00_最初に読む_UTF8.txt`）・`tools/design/seimon_town_pack.py` |
| カードデータ・ID の決まり・点検 | `docs/card-data-policy.md`・`src/game/cards/dataChecks.ts` |
