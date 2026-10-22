# 設計（2026-10-22 夜間作業後）

## 技術構成

| 項目 | 内容 |
| --- | --- |
| 言語 | TypeScript 6（strict、`noUncheckedIndexedAccess`、`exactOptionalPropertyTypes`、`verbatimModuleSyntax`） |
| ビルド | Vite 7 |
| テスト | Vitest 4（`tests/**/*.test.ts`、environment: node） |
| Node.js | **24 以上**（`.nvmrc`）。Node 22 付属の npm 10 では依存解決が内部エラー（`edgesOut`）になる |
| CI | `.github/workflows/ci.yml`：push/PR で インストール→型チェック→テスト→ビルド→Pages用ビルド。デプロイはしない |

CI 実績での解決バージョン：Node 24.21.0 / TypeScript 6.0.3 / Vite 7.3.7 / Vitest 4.1.12 / @types/node 22.20.5

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
    sound.ts              効果音（SE_REGISTRY）
    components/           技カード（V4）・モンスターカード・カード詳細・一覧・ダイアログ
    screens/              各画面と registry.ts
    styles/               CSS
public/                   アイコン（icons/）・manifest・.nojekyll
assets/                   素材（技カードテンプレートV4、主人公歩行QA素材、効果音 など。assets/README.md）
tests/                    Vitest（ロジック・データ整合性・進行不能チェック）
tools/e2e/                Playwright の通し確認スクリプト（npm 依存外・CI 外）
docs/                     開発ドキュメント
.claude/                  クラウドセッション開始時の自動準備（Node 24 と依存関係）
```

## 層の分け方

| 層 | 場所 | 内容 | DOM |
| --- | --- | --- | --- |
| 設定 | `src/config/` | 正式名称・論理解像度・画面ID一覧 | 使わない |
| 仮データ | `src/data/` | カード・ルール値・パック/価格/提供割合・大会・マップ・ダンジョン/敵編成・欠片の場所。**すべて仮**で、正式データが届いたらここを差し替える | 使わない |
| 基盤ロジック | `src/core/` | 画面の拡大縮小計算、画面遷移（Router）、素材パス | 使わない |
| ゲームロジック | `src/game/` | バトル（ルール・AI）、デッキ検証、ガチャ、大会・ダンジョン・欠片の進行、セーブ、歩行の当たり判定・経路探索 | 使わない |
| UI | `src/ui/` | 画面・部品・CSS・セーブの読み書き（`GameStore`） | 使う |

`src/core/`・`src/game/`・`src/data/` は DOM に依存しない純粋な TypeScript で、`tests/` の Vitest でテストしている。
UI はセーブを直接書き換えず、`GameStore.update(純粋関数)` で変更する（変更のたびに保存）。

## 画面と遷移

| 画面ID | 内容 | 入口 |
| --- | --- | --- |
| `title` | タイトル（つづきから／はじめから） | 起動時 |
| `newGame` | 主人公選択（男性：黒髪・青系／女性：赤系） | はじめから |
| `world` | 歩行（街・家・ショップ・大会会場・ダンジョン）。セーブの現在地のマップを表示 | つづきから・各画面から戻る |
| `deck` | デッキ編集 | 家の机 |
| `dungeonSelect` | ダンジョン選択 | 家の壁の地図 |
| `collection` | 図鑑 | 家の本棚 |
| `settings` | 休む（セーブ）・記録・セーブ削除・QA用 | 家のベッド |
| `shopMenu` | 店員メニュー（カードを見る・売る（無効）・ガチャ・特別復元） | ショップの店員 |
| `cardList` | 解放済みパックの収録カード一覧・詳細 | 店員メニュー |
| `gacha` | カードガチャ（パック購入・収録・提供割合・開封） | ショップのガチャマシン・店員メニュー |
| `tournament` | 大会受付（参加条件・景品・対戦表・結果・景品受け取り） | 大会会場の受付 |
| `battle` | カードバトル | ダンジョンの敵・大会 |

画面を追加するとき：`src/config/screens.ts` に ID → `src/ui/screens/` に `ScreenDefinition` → `registry.ts` に登録（登録漏れは型チェックでエラー）。
バトルは `GameStore.pendingBattle` に依頼（相手・タイトル・終了時の処理）を入れて `battle` へ移動する。

## カードバトル画面（`src/ui/screens/battleScreen.ts`）

- 流れ：先攻・後攻を決める（伏せたカード2枚から1枚を選ぶ）→ 手札を1枚ずつ高速で配る（効果音つき）→ 対戦 → 結果
- 縦持ちの配置：上＝手番と先攻/後攻／中＝相手・自分の情報箱（マナ・山札・手札）とモンスター3体（下にライフの数字）／
  中段＝左に説明文、右に選んだカードの拡大／下＝手札。コマンドは必要なときだけ画面中央の帯に縦並び（`components/commandButton.ts`）
- ターン開始時の補充・ドローで新しく来たカードも、同じ演出と効果音で配る
- 効果音は `src/ui/sound.ts`（`SE_REGISTRY` を書き換えれば差し替え可能。出どころは `docs/audio-credits.md`）

## カードバトルのルール（`src/game/battle/`）

- `engine.ts`：状態（双方のモンスター3体・ライフ・山札・手札・捨て札・マナ・手番・防御待ち・勝敗・記録）と `applyAction()`
  - 行動：`useCard`（技を使う：使うモンスター・対象を指定）／`defend`（防御・回避カードを1枚ずつ何枚でも、null で守備を終えてダメージ計算）／`endAttack`（攻撃を終えてマナ化へ）／`convertToMana`（手札1枚をマナに・何回でも）／`endTurn`（マナ化中のみ）
  - `cardUsability()`：使用不可の理由（マナ不足・行動済み・倒れている・守備は攻撃を受けたときだけ・狙われたモンスターのカードだけ・能力が違う・防御不可/回避不可 等）
  - ルール上できない行動は無視して状態を変えない（二重タップや AI の誤りで壊れない）
  - 乱数はシード付き（同じシードなら同じ展開）
- `ai.ts`：相手の思考（回復 → 倒せる相手を攻撃 → 強い攻撃 → マナ/ドロー → 攻撃終了。マナ化は守備1枚と次に使う技1枚を残して残りをマナに。守備は大きいダメージなら回避、それ以外は防御を重ねてダメージ0まで）
- ルールの数値は `src/data/rules.ts`（**仮ルール**。画面の「ルール（仮）」にも表示）

## 技カード UI（V4 テンプレート）

`src/ui/components/skillCard.ts`。同梱の `SkillCard_MasterV4`（承認待ちの版）を `assets/images/ui/skillcard/` に置き、
`07_SPECS/master_layout_v4.json` の重ね順と座標どおりに重ねる。

1. イラスト（`art_rect`。正式画像がなければ仮の絵）
2. 外枠マスク（白）をモンスターのテーマ色で着色（CSS の mask）
3. 空欄のマスター
4. マナのバー＋数字（青）
5. ちから（赤）か かしこさ（緑）の **どちらか一方** のバー＋数字
6. 技名・説明（ゲーム側の文字）

モンスターカードの正式テンプレートはないため、テーマ色の枠と仮の絵で表示している（`monsterCard.ts`）。

## 歩行（`src/ui/screens/worldScreen.ts`・`src/game/world/world.ts`）

- マップは `src/data/maps.ts` の記号マップ（**仮マップ**）。1マス 40 論理px、カメラはプレイヤー中心（端では止まる）
- 操作：画面下の仮想パッド（押しっぱなしで移動）／地面をタップすると経路探索で移動／人・家具・敵・宝箱をタップすると近づいて話す・調べる／「しらべる」で正面と足元を調べる（欠片はここで見つかる）
- 当たり判定：壁・建物・家具・人・敵・宝箱は通れない。敵にぶつかるとバトル。出入口・階段は踏むと移動
- 歩行速度：4.5マス/秒（仮）。歩行素材は QA 試作品（128×144 を 40×45 に縮小、行＝前/後/左/右、列＝4コマ）

## セーブ（`src/game/save/`）

- 1つのセーブにカード所持・通貨・パック解放・欠片・大会実績（参加中の大会を含む）・ダンジョン進捗（探索中を含む）・デッキ・現在地をまとめて保存（localStorage）
- `version` で形式を管理し、古い形式は `MIGRATIONS` で変換。新しすぎる・壊れたセーブは退避（`...-unreadable-backup`）して上書きしない
- 読み込み時に `normalizeSave()` で型・範囲を確認し、`sanitizeLocation()` で矛盾した位置（ダンジョン外なのに探索中など）を家に戻す
- 二重決済・二重受け取り防止：購入・特別復元は「確認を開いたときに作る ID」で1回だけ処理（`processedTransactions`）。大会の景品は参加ID（`claimedEntries`）で1回だけ
- アプリがバックグラウンドに回ったときにも保存

## 正式素材・正式データへの差し替え

| 差し替えるもの | 場所 |
| --- | --- |
| カードの名前・数値・効果 | `src/data/cards.ts` |
| カード画像 | `assets/images/cards/monsters/`・`skills/` に置き、カード定義に `art` を指定（自動で一覧化） |
| ルールの数値 | `src/data/rules.ts`（ルールの仕組み自体を変えるときは `src/game/battle/engine.ts`） |
| 価格・提供割合・パック収録 | `src/data/economy.ts`（テストで合計100%などを確認） |
| 大会の人数・対戦数・相手・景品 | `src/data/tournaments.ts` |
| ダンジョンの敵編成 | `src/data/dungeons.ts` |
| 街・家・ショップ・会場・ダンジョンの背景 | 現在は `src/data/maps.ts` の記号マップ。正式背景が届いたら背景画像を敷き、記号マップは当たり判定として位置を合わせる |
| 隠しモンスター | `src/data/cards.ts` の `HIDDEN_MONSTER`（現在は未確定扱い） |
