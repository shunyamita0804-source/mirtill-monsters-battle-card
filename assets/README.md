# assets/ — ゲーム素材

ゲームで使う画像・音声・フォント・データを置く場所です。
ここに置いたファイルはコードから `import` して使い、Vite がビルド時にハッシュ付きファイル名で出力し、
GitHub Pages のサブパス（`/sacred-monsters-battle-card/`）にも自動で対応します。

```ts
import monsterUrl from '@assets/images/cards/monsters/monster_001.png';
```

## ディレクトリ構成

| パス | 用途 | コード上のカテゴリ名 |
| --- | --- | --- |
| `images/cards/monsters/` | モンスターカード画像 | `monsterCards` |
| `images/cards/skills/` | 技カード画像 | `skillCards` |
| `images/characters/` | キャラクター立ち絵・ドット絵 | `characters` |
| `images/backgrounds/` | 背景画像 | `backgrounds` |
| `images/ui/` | ボタン・枠などUI部品 | `ui` |
| `images/icons/` | アイコン | `icons` |
| `images/maps/town/` | 街マップ | `townMaps` |
| `images/maps/dungeon/` | ダンジョンマップ | `dungeonMaps` |
| `images/effects/` | エフェクト | `effects` |
| `audio/bgm/` | BGM | `bgm` |
| `audio/se/` | 効果音 | `se` |
| `fonts/` | フォント | `fonts` |
| `data/` | カード・モンスター等の定義データ（JSON） | `data` |

カテゴリ定義は `src/core/assetCategories.ts` にあり、テストでこの構成と一致することを確認しています。
ディレクトリを増やす場合は両方を更新してください。

## 配置済みの素材（2026-10-22）

| パス | 内容 | 状態 |
| --- | --- | --- |
| `images/ui/skillcard/skillcard_master_v4.png` ほか | 技カードUIテンプレート V4（マスター・外枠マスク・マナ/ちから/かしこさのバー・数字1〜10） | ユーザー提供・**正式承認待ちの版**。マスターと外枠マスクは 972×1618 を 1/2 に縮小、数字は 128→64px に縮小（描き換えなし） |
| `images/ui/button/btn_command_blank.png`・`btn_command_blank_wine.png` | コマンドボタン（金の枠・青地／ワインレッド地）。無地に場面ごとの文字を重ねて使う | ユーザー提供（2026-10-22）の「はい／いいえ」画像から切り出し、1/2 に縮小。「はい」の文字の部分を左右の色でつないで消した（「はい／いいえ」の文字入りは使わない：ユーザー指示）。ワインレッドは青地だけを塗り替えたもの（金の枠はそのまま） |
| `images/characters/player_male_walk_qa.png`・`player_female_walk_qa.png` | 主人公の歩行（4方向×4コマ、128×144） | ユーザー提供・**QA 試作品**（正式品質ではない） |

| `audio/se/card_draw.*`・`turn_order_select.*`・`mana_gain.*`・`damage_hit.*` | 効果音（カードを引く・先攻後攻を選ぶ・マナが増える・ダメージ）。OGG と M4A | ミスティックモンスターズの素材を許可により利用（`docs/audio-credits.md`） |

アプリアイコンは `public/icons/`。2026-10-22 にユーザー承認の正式アイコンへ差し替え：
原本 `images/icons/sacred-monsters-bc-official-icon.png`（1254×1254 RGBA。受け取ったファイル「セイクリッドモンスターズBC_正式アイコン.png」をそのまま保管・改変なし）から、
高品質縮小（Lanczos）だけで 512・192・180（apple-touch-icon）・48・32・16 を作成。透過加工・切り抜き・加筆はしていない（原本の角の外側は白）。
原本はビルドに含めない（画面では `public/icons/icon-512.png` を使う）。

## 命名規則

- 小文字英数字・ハイフン・アンダースコアのみ（例: `monster_001.png`, `bgm-title.ogg`）
- 日本語・スペース・大文字は使わない（環境によりURLやビルドで問題が出るため）
- 連番は3桁ゼロ埋め（`_001`）

## 推奨フォーマット

- 画像: PNG（ドット絵・透過）／WebP（写真調・背景）
- 音声: OGG と M4A（iOS Safari 対応のため両方用意を推奨）

## 注意

- 権利が確認できていない素材は置かないでください。
- `.psd` `.clip` などの作業用ファイルは `.gitignore` で除外しています。
- ビルドを通さずにURLで直接参照したいファイル（`robots.txt` 等）は `public/` に置きます。
