# 引き継ぎメモ（2026-10-22 時点・セッション引き継ぎ用）

新しいセッションで読むのは `CLAUDE.md` とこのファイルだけ。他の資料は必要になったときに1つずつ読む。

## 1. いまの状態

| 項目 | 状態 |
| --- | --- |
| 正式名称 | セイクリッドモンスターズ バトルカード（Sacred Monsters Battle Card・短縮「セイクリッドBC」）。旧称ミルティル・ミストリア |
| 公開URL | https://shunyamita0804-source.github.io/sacred-monsters-battle-card/ （`main` の `deed858` を公開。2026-10-22。公開後に新しい音のファイルが 200 になることを確認）。旧URL（…/mirtill-monsters-battle-card/）は 404 |
| リポジトリ | https://github.com/shunyamita0804-source/sacred-monsters-battle-card （Public。2026-10-22 ユーザーが改名。旧名 mirtill-monsters-battle-card） |
| 最新版 | `main`（`5ccf667` の内容＋引き継ぎメモ）。テスト 281件。正式な街・部屋・人物・効果音の統合＋試遊を受けた品質改善まで |
| 公開する版 | `main`。作業はブランチで行い、確認後に `main` へマージしてから公開する |
| 本編 | `mystic-monsters`（育成ゲーム本編）は**変更禁止**。素材の利用だけ許可済み（読み取りのみ） |
| バトルのルール | **PS版『モンスターファーム バトルカード』準拠。変えるのは3点だけ**：山札60枚・ガッツを「マナ」と表記・全体カードとブリーダー（プレイヤー）カードを「サポート」に集約（ユーザー決定。`docs/battle-rules.md`） |
| 街・部屋 | **正式な絵でゲームに統合済み**。部品（建物11・噴水・地面3・小物4・部屋の箱7・家具7＋草むら・小花・植え込み）を `tools/design/seimon_world_build.py` が設計図どおりに並べ、`assets/images/maps/` と `src/data/worldArt.generated.ts`（歩ける所・扉・家具の位置）を作る。**部品の原本はリポジトリに入れていない**（作り直すときはユーザーに再送してもらう。8章） |
| 序盤イベント | 公開済み。案内役（となりの家の女性）の会話の絵6表情・歩行の絵は正式。名前は仮の「隣家の女性」のまま |
| 直近の公開 | `deed858`：手札を指でなぞる・上へはじく操作と、マナ化専用の音（09 `manaConvert`。1枚着くたびに1回。山札からのマナは従来のベル `manaGain`）。ユーザーが確認して OK |
| 次の作業 | **デザイン納品待ち**（届いたら8章の手順で組み込む）。①いまのデザイン担当＝NPC（店員・研究員・受付・先生・住人5人）の歩く姿と会話の絵（`docs/design/quality-pass-20261022/` の 01・02）。②生成AI担当＝主人公の横向き・背中の歩きの描き直し、案内役の会話の絵（髪を収める）、岩・広場の輪・飾り石・縁石・植え込みの描き直し、縦長の部屋7、UI、ダンジョン、斜め歩き（`docs/design/genai-request-20261022/`） |

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
   - 手札は指でなぞれる（2026-10-22・公開済み）：なぞると指の下のカードを中段に大きく出す。マナ化ではなぞったカードを
     まとめて候補に入れる（候補から始めると外す）。上へ持ち上げて離すと使う（マナ化では候補ごとマナに）。持ち上げて戻すと取り消し。タップは従来どおり

8. 次便（2026-10-22）：正式名称へ改名・正式アイコン（`public/icons/`。原本は `assets/images/icons/`）・日英切り替え（`docs/i18n.md`）・
   セーブの JSON 書き出し／復元・設定画面（言語・効果音・BGM〔将来用〕・ミュート・遊び方。タイトルとベッドから）・データ点検（`docs/card-data-policy.md`）
9. 街デザイン資料パック（2026-10-22）：ユーザーの ZIP（ChatGPT とのやり取りが行き詰まった街の設計）を受けて作成。
   設計図は `tools/design/seimon_town_pack.py` で作り、自動チェック（全玄関・出口へ歩ける、部屋の家具の前へ歩ける）付き。
   配布用 ZIP には参考画像（旧街・主人公素材）も入れる（リポジトリには画像を入れていない）
10. 序盤イベント（2026-10-22・公開済み）：ユーザーの ZIP「Seimon_Opening_Tutorial_DesignPack」（台本 V1・設計案）を実装。仮の街を新設計図に近い並びに作り直し
   （練習場・となりの家を追加、出入口・欠片・e2e の座標を更新）。会話 UI＝ミスモンの会話画像（`assets/images/ui/talk/`・`docs/audio-credits.md`）。
   通し確認は `tools/e2e/intro.cjs`（`flow.cjs`・`flow2.cjs` も新しい街に合わせて更新）
11. 歩く操作の作り直し（2026-10-22・公開済み）：画面のどこでも指でなぞると歩く（指を置いた所に半透明のスティック。4方向）。
   方向キーと下の帯をなくし、街を画面いっぱいに。「しらべる」は右下の半透明の丸（金のふち・虫めがね）。すべらせないタップは従来どおり
12. 正式素材の統合（2026-10-22・QA なしで公開：ユーザー指示）：街・7種類の部屋（家・となりの家・民家A〜E 共通・ショップ・研究所・大会会場・練習場）を正式な絵に。
   マスは設計図の 32px（街 150×150）、表示は設計図の 0.5625 倍。斜めも歩ける（8方向・角はすり抜けない。斜めの絵は無いので左右の絵）。
   主人公・案内役は正式な歩行の絵（216×288、約7コマ/秒、止まると待機の絵）。家具・人は足元の高さで前後を決める。
   効果音：回避成功・通常命中・強攻撃命中（仮：必要マナ3以上の技）・マナ消費をルールの結果で1回ずつ（`engine.ts` の `fx`）。旧 damageHit は廃止。
   マナ化はカードを裏返してから飛ばす演出に。セーブ version 4（街・部屋にいた旧セーブは主人公の家の前へ）。設定画面に素材のクレジット
13. 品質改善（2026-10-22・試遊動画を受けて。公開済み）：iPhone で左右に余白が出ないよう、ステージの論理幅を最大480まで伸ばす（`stageLayout.ts`）。
   場所を移るときの暗転と、絵を読み込み終えてから見せる処理・他の部屋の先読み。部屋は画面の高さに合わせて最大1.35倍に拡大し、まわりを暗い木の色に。
   人物の足元の影。草地の色むら・縁石・道のふちの陰・細かい石畳・空いた草地に木や花を自動で配置（`seimon_world_build.py`）。
   上の帯（場所の名前の札・金貨）・建物の看板・家具の名前の札・出口の印・調べられる物のとなりで「しらべる」が光る
14. 試遊の指摘（2026-10-22・公開済み）：男の子の背中で帽子の金の飾りがちらつく → 背中3枚から飾りを消した。横向きの足が動かない（4コマとも同じ形）→ 歩くときに体が少し弾むようにした（本当の直しは描き直し：依頼文 09）。
   会話の絵の髪が左右で切れている → 画面で両端をやわらかく消した（描き直し：依頼文 09）。街の看板が上の帯に隠れないように
15. 試遊の指摘2（2026-10-22・公開済み）：歩く・止まるで別の画像に切り替えていたため、iPhone で読み込み直しの間だけ主人公が消えていた →
   歩き4コマ＋立ち止まりを1枚にまとめたシート `player_{male,female}_sheet.png`（`tools/art/walk_passing.py` が作る）にし、画像は替えず位置だけ動かす。
   横向きの足が動かない → 届いた4コマ（全部足を開いた形）から、2・4コマ目を「足がそろう形」に作り替えた（足だけ真ん中へ寄せる。描き直しが届くまでの応急処置）
16. デザイン納品・優先A 環境8点（2026-10-22・公開済み）：草むら・小花・植え込みだけ使用（街に散らす・植え込みを入れ替え）。岩・広場の輪・会場前の飾り石・縁石は
   画風が合わないので不使用（理由と描き直しの一文は `docs/design/quality-pass-20261022/10_…`）。部品の原本はリポジトリに入れていない


## 3. 大事な約束（詳しくは CLAUDE.md）

- 指示書の範囲だけを実装する。終わったら止めて報告し、承認を待つ
- 指示の受け取り方：ユーザーは「ZIP に UTF-8 TXT の指示書1本」や、動画・画像・チャットで指示を出す
- カード・価格・提供割合・大会・敵編成・マップはすべて**仮**（`src/data/`）。仮カードは「仮」始まり
- 本編 `mystic-monsters` は変更しない。素材を使うときは読み取りでクローンし、`docs/audio-credits.md` や `assets/README.md` に記録する
- 公開は「公開して」と言われたときだけ。作業はブランチ → 報告 →「公開して」で main にマージして公開、の流れ（2026-10-22 はこれを何度も繰り返した）
- 通し確認の道具（`tools/e2e/*.cjs`）はいまの街では動かない（6章）。2026-10-22 以降、ユーザーは QA なしでの公開を了承している。公開前は `npm run check` と、画面を数枚撮って確かめる
- force push しない。報告・コメント・コミットメッセージは日本語。ユーザーは非エンジニア：報告は専門用語を避けて短く

## 4. 作業環境の手順

クラウドセッションでは開始時に Node 24 と依存関係が自動で入る（`.claude/hooks/session-start.sh`）はずだが、
**2026-10-22 は2つのセッションとも動かなかった**（Node 22 のまま・`node_modules` なし。原因は未調査）。`node -v` が 24 でなければ：

```bash
# 作業用フォルダ（スクラッチパッド）に Node 24 を直接入れて使う
V=$(curl -sS https://nodejs.org/dist/index.tab | awk '$1 ~ /^v24\./ {print $1; exit}')
curl -sS -o node.tar.xz https://nodejs.org/dist/$V/node-$V-linux-x64.tar.xz && tar xf node.tar.xz
export PATH=$PWD/node-$V-linux-x64/bin:$PATH && npm install --no-audit --no-fund   # リポジトリで実行
```

```bash
npm run check            # 型チェック＋テスト（280件）＋ビルド
npx vite preview --port 4173 --host 127.0.0.1   # 画面の確認（ビルド後。バックグラウンドで動かす）
# 公開と同じ base で確かめるとき：npm run build:pages → npx vite preview --mode pages … → http://127.0.0.1:4173/sacred-monsters-battle-card/
```

- 街・部屋の絵を作り直すとき（8章）：Python の `scipy` が要る（`pip install scipy`）。1回 約3〜4分。`python3 tools/design/seimon_world_build.py 部品のフォルダ 確認画像の出力先`
- 主人公のシート（`player_{male,female}_sheet.png`）を作り直すとき：`python3 tools/art/walk_passing.py 歩行シート 待機の絵の接頭辞 出力`
- GitHub の MCP（公開のワークフロー実行に使う）は、セッションの途中でつながらなくなることがある。`ToolSearch` で `mcp__github__actions_run_trigger` を読み込み直すと使える
- ブラウザ確認：Playwright（`/opt/node-tools/node_modules/playwright`、Chromium は `/opt/pw-browsers`）
  - `tools/e2e/flow.cjs`・`intro.cjs`・`flow2.cjs` は古い仮の街（1マス40px）向けで、**いまは動かない**。画面確認は短い Playwright のスクリプトを都度書く
    （iPhone のセーフエリア内と同じ 393×759・deviceScaleFactor 3 で撮ると、ユーザーの見え方に近い。セーブは localStorage の `mistria-battle-card/save` を
    `addInitScript` で入れると好きな場所から始められる）
  - 確認中に `npm run check`／`vite build` を動かさない（表示中のファイルが入れ替わる）
  - プレビューを止めるときは `pkill -f "vite previe[w]"`（`"vite preview"` と書くと自分のコマンドまで止まる）。
    **同じコマンドの中で pkill とプレビューの起動を書かない**（起動の文字に一致して自分ごと止まる）。起動はバックグラウンド実行で、時間の上限を長く（2時間）する
  - URL に `?qa=1` で QA 用ボタン（バトルのオート・即勝利、所持金追加など）
- 本編の素材を見るとき：`GIT_LFS_SKIP_SMUDGE=1 git clone --depth 1 https://github.com/shunyamita0804-source/mystic-monsters /home/user/shunyamita0804-source/mystic-monsters`（読み取りのみ）
- PS版の参考サイト：note は読める。tapatalk・gamefaqs・legendcup は相手サイトの制限で読めない（必要ならユーザーに文章を貼ってもらう）
- 公開URL（github.io）には、2026-10-22 の次便の公開後はこの作業環境から接続できた（curl・Playwright）。それでも最終の見た目はユーザーの iPhone で確認してもらう
- GitHub への push は新しい名前のリポジトリで行う（`origin` = https://github.com/shunyamita0804-source/sacred-monsters-battle-card）。
  権限エラー（「authorized repository set にない」）が出たら、セッションに `sacred-monsters-battle-card` を追加してから push する
- `main` への push は、作業環境の安全確認で止められることがある。そのときはユーザーに「main に入れてよいか」を確認してから行う

## 5. 公開（デプロイ）の手順

ユーザーが「公開して」と言ったときだけ行う。

1. （通し確認の道具はいま動かないので省略。ユーザー了承済み）
2. 作業ブランチを `main` にマージ（`git merge --no-ff`）→ `npm run check` → `git push origin main`
3. GitHub Actions のワークフロー `deploy-pages.yml` を `main` で手動実行
   （GitHub MCP の `actions_run_trigger`：method `run_workflow`、workflow_id `deploy-pages.yml`、ref `main`）
4. build と deploy のジョブが成功したことを確認して報告（反映まで1〜2分）。新しいファイル（例：`dist/static/town_r1c1-*.webp`）が
   公開URLで 200 になるかを curl で見ると確実。このメモの公開URLの行を更新
5. ホーム画面に置いたアプリは「一度閉じて開き直す」と新しい版になる、とユーザーに伝える

## 6. 未完了・気になっている点

- 新URLは 2026-10-22 にユーザーが iPhone で開いて「すべてOK」。旧URLは 404（転送なし）
- iPhone のホーム画面版（PWA）は、URL が変わるとセーブが見えない可能性あり → 設定の「セーブをバックアップ」で引き継ぐ（書き出し・復元の iPhone での操作は個別には未確認）
- 正式アイコンの角の外側は白（原本のまま。透過加工は承認なしではしない）
- 英語はすべて仮訳（カード・パック・大会・マップ・能力名 POW/INT）。正式な英語名は未決。小さいモンスターカードでは英語名が「Temp Mo…」と省略される
- 次便の指示書で「次次便に保留」とされた事項は、まだ受け取っていない（ユーザーから届いたら対応）
- **未完了（2026-10-22 統合便）**：QA（通しの確認・iPhone 実機）はユーザー指示で行っていない。作業環境で各画面が出ることだけ確認。
  通し確認の道具 `tools/e2e/flow.cjs`・`intro.cjs`・`flow2.cjs` は古い仮の街（1マス40px）の座標のままで、**いまの街では動かない**（直していない）
- 統合便で仮・未完了のもの：強攻撃の基準（必要マナ3以上）は仮。効果音は受け取った MP3 をそのまま使い、素材サイトの原本とは未照合。
  民家A〜Eは無人（住人の絵が無い）。ショップの店員・研究所の研究員・大会の受付・練習場の先生の絵は無い（カウンターなどを調べると従来どおり画面が開く）。
  案内役は家の中には出さない（いまは街か練習場にいる。同じ人が2か所に出ないように）。ダンジョンは仮マップのまま（人物は小さめに表示）
- 歩く速さ（約185 論理px/秒）・コマ送り（7コマ/秒）・スティックの反応・街の表示の大きさは、ユーザーの iPhone 確認しだいで調整
- 商標の確認は未実施（名称変更＝商標の安全の保証ではない）
- 演出の簡略化（動きを減らす設定）は未実装（必要なら項目を追加する）
- PS版で未確認の裁定（ユーザーが実機で確認する約束）：`docs/battle-rules-audit.md` の5章、`docs/battle-rules.md` の「まだ確かめられていないこと」
- 正式カード待ちで未実装：防御の「0にする・はね返す・効果だけ消す・肩代わり」、全体カードを打ち消すカード、コンボ、派生モンスター（MAIN/SUB）の技、モンスターの特徴（地上・空中）
- 新ルールでは1戦が長め（自動対戦で1〜2分）。テンポ調整はユーザーの判断待ち
- 序盤イベントで仮のもの：となりの家の女性の正式な名前（「隣家の女性」）、正式な台詞（台本 V1 は仮）、練習相手のデッキ（スターターと同じ3体）
- 応急処置（描き直しが届いたら外す）：主人公の横向き2・4コマ目は足を寄せて作ったコマ（`tools/art/walk_passing.py`）、男の子の背中の帽子の飾りを消した、
  会話の絵の左右の端をぼかしている（`dialogue.css` の `mask-image`）
- 正式素材が無いもの：モンスター・技カードの絵、NPC（作成中）・ダンジョン・敵・宝箱（依頼済み）、BGM、戦闘の背景。正式仕様が無いもの：カードデータ、価格・提供割合、大会、敵編成、隠しモンスター
- ダンジョンから帰ると家に戻る（街の入口の前には戻らない）。対戦の途中でアプリを閉じると、その対戦は最初からやり直し
- 不要になった作業ブランチ（main に取り込み済み）：`fix/town-dungeon-gate`・`feature/battle-layout-deal`・`claude/cool-gauss-emyae1`・`feature/sacred-rename-i18n`・
  `feature/official-town-integration`・`feature/quality-pass`・`fix/walk-portrait`・`fix/walk-flicker`・`feature/env-assets-a`。消すかどうかはユーザーに確認してから
  （`nightbatch/2026-10-22`・`claude/sacred-monsters-battle-card-btgeie` は中身未確認）

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
| セーブ（形式 version 4・変換） | `src/game/save/saveData.ts` |
| バトル画面・コマンドボタン | `src/ui/screens/battleScreen.ts`・`src/ui/components/commandButton.ts`・`src/ui/styles/battle.css` |
| 効果音の割り当て・出どころ | `src/ui/sound.ts`（`SE_REGISTRY`）・`docs/audio-credits.md` |
| 素材の置き場と記録 | `assets/README.md` |
| 公開の手順 | `docs/github-pages.md` |
| 日英の辞書・英訳表 | `src/i18n/`（`docs/i18n.md`） |
| 設定画面・バックアップ | `src/ui/screens/optionsScreen.ts`・`src/game/save/backup.ts`・`src/game/settings/settings.ts` |
| 名称変更の記録 | `docs/rename-migration.md` |
| 序盤イベント（進み具合・場面・台詞・会話UI・練習試合のヒント） | `src/game/story/`・`src/data/storyScenes.ts`・`src/i18n/messages/story.ts`・`src/ui/components/dialogue.ts`・`src/ui/styles/dialogue.css` |
| 歩行画面（なぞって歩く・しらべる・案内役の表示） | `src/ui/screens/worldScreen.ts`・`src/ui/styles/world.css`・地図 `src/data/maps.ts`（街・部屋の座標は `worldArt.generated.ts`。作るのは `tools/design/seimon_world_build.py 部品のフォルダ`） |
| 街・部屋のデザイン資料（設計図・ChatGPT 依頼文・QA） | `docs/design/seimon-town/`（入口は `00_最初に読む_UTF8.txt`）・`tools/design/seimon_town_pack.py` |
| デザイン依頼（いまの担当：NPC） | `docs/design/quality-pass-20261022/`（01・02。受け取り結果は 10） |
| デザイン依頼（生成AI担当：それ以外） | `docs/design/genai-request-20261022/`（日本語・英語の依頼文） |
| 画面の大きさ（ステージ・最大幅480） | `src/core/stageLayout.ts`・`src/ui/stage.ts` |
| カードデータ・ID の決まり・点検 | `docs/card-data-policy.md`・`src/game/cards/dataChecks.ts` |

## 8. デザインが届いたときの組み込み方

- 受け取ったら、まず街や画面に実際に置いて、いまの絵と見比べてから使うか決める（2026-10-22 の環境8点は、平たい図形のような絵が多く半分不採用だった）。
  見比べの画像をユーザーに送り、使わないものは理由を `docs/design/…/10_受け取り結果` のように記録する
- **部品の原本**：街の作り直し（`seimon_world_build.py`）には部品が全部そろったフォルダが要る。リポジトリには入れていないので、ユーザーに再送を頼む。
  ファイル名は `docs/design/seimon-town/05_補助資料/02_納品ファイル名一覧` のとおり（建物10棟はチャットの画像で届いたので、名前を付け直す：
  紫＝town_guide_home、オレンジのしましま屋根＝town_shop、郵便受けの赤茶屋根＝town_player_home、緑＝town_house_c、赤い横長＝town_training、
  茶＝town_house_a、青緑＝town_lab、青いドーム＝town_arena、赤＝town_house_d、青＝town_house_b）。草むら・小花・植え込みは decal_grass・decal_flowers・props_bush_v2
- NPC の歩く姿（1024×1536・4×4）：1コマ 256×384 を縦横比のまま 0.75 倍（192×288）にして 216×288 のコマの真ん中へ。足元 (108,270) をそろえる。
  `maps.ts` の `NpcObject.npcId` に人物を足し、ショップのカウンターの奥・研究所の机の奥・大会の受付・練習場の先生の位置（`rooms_layout.json` の *_SPOT）に置く。
  住人は民家の RESIDENT_SPOT。会話の絵は `dialogue.ts` の `PORTRAITS` に足す。話す内容（台詞）は決まっていないので、ユーザーに確認する
- 主人公の横向き・背中の描き直し：`player_{male,female}_walk.png` の該当の行を差し替え、`walk_passing.py` の「足を寄せたコマを作る」処理を外してシートを作り直す
- 案内役の会話の絵の描き直し：`assets/images/characters/neighbor_guide_talk_*.webp` を作り直し（半分に縮小して WebP）、`dialogue.css` の端をぼかす `mask-image` を外す
- 縦長の部屋：`seimon_world_build.py` の `SHELL`（床の範囲・出入口）を測り直し、`ROOM_FILL`・`ROOM_ZOOM_MAX`（`worldScreen.ts`）を見直す
- 岩・広場の輪・飾り石・縁石：`seimon_world_build.py` の `USE_PLAZA_DECOR` などで、見比べてから入れる

