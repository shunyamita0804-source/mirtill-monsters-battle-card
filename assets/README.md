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
| `images/maps/rooms/` | 部屋（建物の中）の絵・家具 | `roomMaps` |
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
| `images/characters/player_male_walk.png`・`player_female_walk.png` | 主人公の歩行（4方向×4コマ、1コマ 216×288、足元 108,270） | ユーザー提供・**正式**（2026-10-22）。男の子の背中の1・3コマ目と `player_male_idle_back.png` だけ、帽子の金の飾りが一部のコマにだけ見えてちらつくため、2コマ目（飾りなし）の同じ所の色で塗りつぶした（ユーザー指示 2026-10-22・応急処置。描き直し依頼は `docs/design/quality-pass-20261022/09_…`）。それ以外は加工なし |
| `images/characters/player_{male,female}_idle_{front,back,left,right}.png` | 主人公の立ち止まり（4方向） | 同上（加工なし） |
| `images/characters/player_{male,female}_sheet.png` | **ゲームで使う主人公の絵**（5列×4行：歩き4コマ＋立ち止まり）。上の歩行シートと立ち止まりの絵から `tools/art/walk_passing.py` が作る | 横向きの2・4コマ目だけ、足の部分を体の真ん中へ寄せて「足がそろう形」にした（届いた4コマが全部同じ足を開いた形で、足が動いて見えないため。描き直しが届くまでの応急処置。2026-10-22 ユーザー指示） |
| `images/characters/npc_neighbor_guide_walk.png` | となりの家の女性（案内役）の歩行（4方向×4コマ、216×288）。待機の絵は2コマ目と同じ | ユーザー提供・**正式**（加工なし） |
| `images/characters/neighbor_guide_talk_{normal,smile,explain,surprised,worried,happy}.webp` | 案内役の会話の絵（胸から上・表情6種。困り顔 troubled は worried） | ユーザー提供・**正式**。原本 1122×1402 PNG を半分（561×701）に縮小して WebP にしただけ（描き換えなし） |
| `images/maps/town/town_r{0-2}c{0-2}.webp` | 街の完成図（3×3 に分割） | ユーザー承認済みの部品（建物11・噴水・地面3・小物4）を `tools/design/seimon_world_build.py` が設計図どおりに並べたもの。4800 を 3600 に縮小。部品の絵は描き換えていない（縮小・切り抜き・ふちの整理・影） |
| `images/maps/rooms/*.webp` | 7種類の部屋の箱と家具（1つずつ切り出し） | 同上（部屋の箱7・家具7） |
| `images/ui/talk/dialogue_window_blank.png`・`name_label_blank.png`・`button_blank.png` | 会話のセリフ枠・名前の札・選択肢のボタン（無地。文字はゲーム側で重ねる） | ミスティックモンスターズの会話 UI を許可により利用（ユーザー指示 2026-10-22。`docs/audio-credits.md`）。加工なし |

| `audio/se/card_draw.*`・`turn_order_select.*`・`mana_gain.*` | 効果音（カードを引く・先攻後攻を選ぶ・マナが増える）。OGG と M4A | ミスティックモンスターズの素材を許可により利用（`docs/audio-credits.md`） |
| `audio/se/mana_convert.ogg`・`mana_convert.m4a`（原本 `mana_convert_original_44100.wav`） | マナ化の効果音（09）。ChatGPT 作の独自の電子音（2026-10-22 ユーザー送付・指示） | 受け取ったまま（`docs/audio-credits.md`）。原本 WAV はビルドに含めない |
| `audio/se/evade_success.mp3`・`hit_normal.mp3`・`hit_strong.mp3`・`mana_spend.mp3` | 正式採用の効果音（回避成功・通常命中・強攻撃命中・マナ消費） | ユーザー承認の MP3 をそのまま（`docs/audio-credits.md`） |

ミスモン（本編）の素材（2026-10-22）：ダンジョンの対戦の背景（`images/backgrounds/battle_field_*`）・宝箱（`images/maps/dungeon/chest_*`）・景品のアイコンと金貨（`images/icons/`）・ボタン（`images/ui/button/mm_*`。2026-10-23 から未使用）・BGM（`audio/bgm/bgm_*.mp3`）。出どころは `docs/audio-credits.md`。

街・部屋の部品の原本（絵を作り直すときの材料。ゲームには直接入らない）は `design-parts/seimon-world/`（2026-10-22〜。何がそろっているかは中の README）。

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
