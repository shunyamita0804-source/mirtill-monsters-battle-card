# 設計（第2段階時点）

## 層の分け方

| 層 | 場所 | 内容 | DOM |
| --- | --- | --- | --- |
| 設定 | `src/config/` | 正式名称・論理解像度・画面ID一覧 | 使わない |
| 基盤ロジック | `src/core/` | 画面の拡大縮小計算、画面遷移（Router）、素材パス | 使わない |
| ゲームロジック | `src/game/` | カード定義・カタログ・画像の引き当て、バトル状態（reducer） | 使わない |
| UI | `src/ui/` | ステージ、画面、カード表示などの部品、CSS | 使う |

`src/core/` と `src/game/` は DOM に依存しない純粋な TypeScript で、`tests/` の Vitest でテストしています。
UI は状態を直接書き換えず、`battleReducer` などのロジック関数を通して変更します。

## 画面サイズとセーフエリア

```
#app            画面全体（position: fixed）
 └ .viewport    セーフエリアの内側（env(safe-area-inset-*)）
    └ .stage    論理解像度の画面（幅 390px 固定）。transform で拡大縮小
```

- `computeStageLayout()`（`src/core/stageLayout.ts`）が倍率と配置を計算し、`src/ui/stage.ts` が適用します。
- 基準の 390×844 が必ず全部見えるように拡大縮小します。
- 基準より縦長の端末では、ステージの論理高さを伸ばして上下の余白をなくします。
- 基準より横長の画面（iPhone SE・PC など）では、左右に余白を作って中央に表示します。
- 画面の CSS はすべて論理 px（390 幅基準）で書きます。高さは flex で伸び縮みさせます。

## 画面遷移

- 画面ID一覧：`src/config/screens.ts`（`title` / `town` / `shop` / `battle`）
- 画面定義の登録：`src/ui/screens/registry.ts`
- 履歴の管理：`Router`（`src/core/router.ts`）
  - `navigate`：履歴に積んで移動（街→ショップ）
  - `back`：前の画面に戻る
  - `reset`：履歴を消して移動（タイトル⇔街）

### 画面を追加するとき（ダンジョン・ガチャ・大会など）

1. `SCREEN_IDS` にIDを足す
2. `src/ui/screens/` に `ScreenDefinition` を実装した画面を作る
3. `registry.ts` に登録する（登録しないと型チェックでエラーになる）
4. 街から行く施設なら、`townScreen.ts` の `TOWN_FACILITIES` に1行足す

## カード

- 型：`src/game/cards/cardTypes.ts`。持っているのは表示用の項目（ID・種類・名前・説明・画像）だけで、戦闘用のパラメータはありません。
- 仮カード：`src/game/cards/placeholderCards.ts`。すべて `isPlaceholder: true`、IDは `tmp-` 始まり、名前は「仮」始まりです。正式データができたら差し替えます。
- カタログ：`CardCatalog` インターフェースを満たせば、正式データ（例：`assets/data/` の JSON）に置き換えられます。

### 正式画像への差し替え

1. 画像を `assets/images/cards/monsters/` か `assets/images/cards/skills/` に置く（命名規則は `assets/README.md`）
2. カード定義に `art` を指定する

```ts
art: { category: 'skillCards', file: 'skill_001.png', layout: 'full' }
```

- `layout: 'frame'`：画像をカード枠の絵の部分に表示し、名前や種類は UI 側で描きます。
- `layout: 'full'`：画像をカード全面に表示します。文字まで描き込んだ完成済みの技カード画像向けです。
- 画像は `import.meta.glob` で自動的に一覧化されるので、import 文を書く必要はありません。見つからない場合は仮の絵で表示します。

## カードバトル画面（基盤のみ）

- 状態：`src/game/battle/battleState.ts`
  - 場の枠・手札・マナ・手番・選択中のカード
  - 操作は `selectCard` / `clearSelection` / `endTurn` の3つです。
- 仮の初期状態：`src/game/battle/placeholderBattle.ts`。場は3枠、マナは 3/5 と 2/5 で、いずれも仮の値です。
- 操作
  - カードを1回タップすると選択、選択中のカードをもう一度タップすると詳細を表示します。下部の「詳細」ボタンでも開けます。
  - 相手の手札は裏向きなので選択できません。
  - 「ターン終了」で手番が交代し、ターン数が進みます。カードとマナは変化しません。
- 戦闘ルール、ダメージ計算、勝敗、マナの増減、カードを出す・使う操作は未実装です。
