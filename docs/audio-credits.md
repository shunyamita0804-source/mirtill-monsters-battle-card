# 音源の出どころ（効果音）

ゲームで鳴らす音は `src/ui/sound.ts` の `SE_REGISTRY` で管理する。素材を差し替えるときは、ファイルを `assets/audio/se/` に置き、
`SE_REGISTRY` とこの表を更新する。

2026-10-22：ユーザー（ミスティックモンスターズとバトルカードの両方の所有者）の許可により、ミスティックモンスターズ
（`shunyamita0804-source/mystic-monsters`）の素材を利用。本編リポジトリは読み取りのみで、変更していない。
後から別の素材・UI を用意する可能性がある（ユーザー）。

| 場面（SE_REGISTRY） | ファイル | 元の素材（ミスティックモンスターズ） | 作者・ライセンス | 加工 |
| --- | --- | --- | --- | --- |
| `cardDraw`：カードを引く・手札に配る（1枚ごと） | `card_draw.ogg` / `card_draw.m4a` | `assets/audio/se/interface_sfx_pack_1/cursor_style_2.ogg`（本編の UI_SELECT） | Interface SFX Pack 1 / ObsydianX（CC0・クレジット不要） | 末尾の無音を切り落とし、iPhone 用に M4A（AAC）も作成。音色は変えていない |
| `manaGain`：山札からマナが増えた（手札5枚のときのドロー・カードの効果）。2026-10-22 からマナ化では鳴らさない | `mana_gain.ogg` / `mana_gain.m4a` | `assets/audio/se/ivokard/bell.ogg`（本編の GOLD_GET） | Mix of SFX by Ivokard（CC0・クレジット不要） | 先頭1.0秒に切り、最後0.3秒をフェードアウト。M4A も作成 |
| `turnOrderSelect`：先攻・後攻のカードを選んだ瞬間 | `turn_order_select.ogg` / `turn_order_select.m4a` | `assets/audio/se/mystic_monsters_official/15_branch_select.ogg`（本編の BRANCH_SELECT） | ミスティックモンスターズ正式素材（ユーザー提供・ゲーム所有） | 同上 |

- 2026-10-22：以前の `damageHit`（本編の BATTLE_HIT）は、正式採用の命中音（下の表）と二重に鳴らないよう使うのをやめ、ファイルも削除した

## 正式採用の効果音（ユーザー承認 2026-10-22）

ユーザーが試聴して承認した4音。受け取った MP3（`Seimon_Claude_IntegrationBatch_SE_NPC_Town_Player_20261022.zip` の `ASSETS/SE_APPROVED/`）を
**加工せずそのまま**使う（ファイル名だけ英字に変更）。素材サイトの元のファイル（原本）とは照合していない＝**原本未検証**。
原本が手に入ったら、同じ音であることを聞き比べてから差し替える。元の PS 版の音は使っていない。

| 場面（SE_REGISTRY）・鳴らすとき | ファイル | 素材 | 利用条件 |
| --- | --- | --- | --- |
| `evade`：回避が成功してダメージ0が確定した瞬間（1回の攻撃で1回） | `evade_success.mp3`（受け取り名 03_回避成功.mp3） | 効果音ラボ「高速移動」 | 効果音ラボの利用規約に従う（商用可） |
| `hitNormal`：攻撃が命中した瞬間（通常） | `hit_normal.mp3`（04_通常攻撃命中.mp3） | OtoLogic「Hit-Punch02-1(Dry)」 | 無料で使うときはクレジット表記が必要 → 設定画面の「素材のクレジット」に表示 |
| `hitStrong`：強攻撃が命中した瞬間（**仮の基準：必要マナ3以上の技**。ユーザー指定） | `hit_strong.mp3`（05_強攻撃命中.mp3） | 効果音ラボ「大パンチ」 | 効果音ラボの利用規約に従う |
| `manaSpend`：マナを支払った瞬間（技・サポート・守備。1回の支払いで1回。マナ化では鳴らさない） | `mana_spend.mp3`（06_マナ消費_正式採用済み.mp3） | 効果音ラボ「ワープ」 | 効果音ラボの利用規約に従う |

- 参照：https://soundeffect-lab.info/ ・ https://otologic.jp/ （最新の規約に従う）
- 鳴らすきっかけはバトルのルール（`src/game/battle/engine.ts` の `fx`）で、結果が確定したときに1件ずつ記録する。画面は描き直しても同じ音を2回鳴らさない
- **使わない音（不採用・未承認）**：01 カード使用・02 防御・07 KO・08 回復（旧素材は NG、代わりの候補も未承認）。
  防御が成功してダメージ0のとき・KO のときは無音

## マナ化の音（09・2026-10-22 追加）

統合便のときは「未承認の候補」として送られておらず、ゲームに届いていなかった（ユーザーの指摘で判明）。
2026-10-22 にユーザーが `Seimon_ManaConvert_SE_EmergencyFix_Claude_20261022.zip` で送り、使うよう指示した。
**ChatGPT が作った独自の電子音の試作**で、原作 PS版の音のコピーではない。正式採用の4音（03〜06）とは別の経緯。

| 場面（SE_REGISTRY）・鳴らすとき | ファイル | 加工 |
| --- | --- | --- |
| `manaConvert`：手札のカードをマナにした瞬間（マナ化。1枚につき1回。カードが情報箱に着いてマナが1増えるのと同時。相手のマナ化も） | `mana_convert.ogg` / `mana_convert.m4a`（受け取ったまま。SHA-256 は ZIP の照合表と一致） | なし（音量は `SE_REGISTRY` で 0.7 倍） |

- 原本 `mana_convert_original_44100.wav`（44.1kHz・モノラル・約0.55秒）も `assets/audio/se/` に保管（ゲームでは読み込まない）。試聴用 MP3 は使っていない
- 鳴らすきっかけはルール（`engine.ts` の `fx`）の `manaConvert`。山札からマナが増えたときは `manaGain`（従来のベル）で、マナ化と二重には鳴らない

- 再生は Web Audio。OGG を再生できるブラウザは OGG、できないブラウザ（iPhone Safari の一部など）は M4A を使う（正式採用の4音は MP3 をどのブラウザでも使う）
- iPhone は最初のタップまで音を出せないため、最初のタップで音を使えるようにしてから読み込む

## BGM（2026-10-22 追加・ミスモンの曲）

ユーザー指示「BGM を使って。曲の規約は確認済み OK」（2026-10-22）。ミスモン（本編）で使っている曲から選んだ。本編のリポジトリは読み取りだけ。
`tools/audio/make_bgm_loops.py` が本編の OGG から「ループする範囲だけを切り出し、終わりを頭へつないだ」MP3（128kbps）を作る（範囲は本編の audio-registry.js と同じ）。
鳴らし方は `src/ui/bgm.ts`（`BGM_REGISTRY`）。ゲーム内のクレジット（設定 → 素材のクレジット）にも曲名・作者を出す。

| 場面（BGM_REGISTRY） | ファイル | 曲名 / 作者 | 出典 | 本編のファイル |
| --- | --- | --- | --- | --- |
| `title`：タイトル | bgm_title.mp3 | Bon Voyage! / HarumachiMusic | Pixabay | licensed_20261007/06_prologue_departure.ogg |
| `town`：街・部屋（ショップなどの画面も続けて） | bgm_town.mp3 | 冒険への誘い / のる | OpenTracks（旧 DOVA-SYNDROME） | licensed_20261008/town_bouken_e_no_izanai.ogg |
| `tournament`：大会の受付 | bgm_tournament.mp3 | Battle - スタンバイフェイズ / lei | DOVA-SYNDROME | licensed_20261007/08_tournament_table_start17s.ogg（17秒から） |
| `tournamentBattle`：大会の対戦 | bgm_tournament_battle.mp3 | 戦いの旅路を征く / MATSU | DOVA-SYNDROME | licensed_20261007/14_official_rank_battle.ogg |
| `dungeon`：ダンジョンの探索 | bgm_dungeon.mp3 | Spirits Forest / HydroGene（CC0） | itch.io | hydrogene_16bit_rpg/07_spirits_forest_full.ogg（前奏を除いたループ部） |
| `battle`：ダンジョン・練習の対戦 | bgm_battle.mp3 | 通常戦闘曲 - α / lei | DOVA-SYNDROME | licensed_20261007/12_wild_battle.ogg |
| `bossBattle`：ダンジョンのボス | bgm_boss_battle.mp3 | 中ボスくらいの戦闘風 / Motoyuki | DOVA-SYNDROME | licensed_20261007/13_rare_monster_battle.ogg |

- 本編の作品固有の曲（タイトル曲・本編の正式 BGM・作者不明の「公式ランク」）は使っていない
- 切れ目：MP3 は頭と終わりにごく短い無音が入るため、ループの継ぎ目でほんの一瞬切れることがある（気になれば形式を変える）

## ミスモンの画像（2026-10-22 追加）

ユーザー指示「ダンジョンと景品のアイコン、ボタン、金貨を使って。残りは使わない」（2026-10-22）。本編の正式素材をそのまま（大きさの縮小だけ）。

| 使う所 | ファイル | 本編のファイル | 加工 |
| --- | --- | --- | --- |
| ダンジョンの対戦の背景（B1F 草原・B2F 海岸・B3F 火山。仮の割り当て） | `assets/images/backgrounds/battle_field_{meadow,coast,volcano}.webp` | battle/field_1012/ch1_meadow・ch2_coast・ch4_volcano.webp | なし |
| ダンジョンの宝箱（木・鉄・金）と開く動き | `assets/images/maps/dungeon/chest_0{1,2,3}_{base,anim_01〜04}.webp` | chests/chest_0{1,2,3}_*.webp | 高さ 160px に縮小 |
| 大会の景品のアイコン（初回優勝＝勲章・再優勝＝小袋） | `assets/images/icons/prize_{medal,pouch}.webp` | items/body_1012/27・15.webp | 128px に縮小 |
| 金貨（所持金・参加報酬） | `assets/images/icons/coin.png` | ui/gold/coin.png | なし |
| ボタン（行う＝青・やめる＝赤） | `assets/images/ui/button/mm_btn_blue_ornate.png`・`mm_btn_red.webp` | ui/a_group/a19・a04 | **2026-10-23 から使っていない**（ユーザー指示でふつうのボタンに戻した。ファイルだけ残している） |

## 本編の画像素材（会話の UI）

2026-10-22：ユーザー指示「セリフの UI はミスモンのものを使う。NPC の名前の UI も同様」により、ミスティックモンスターズの会話 UI の画像を利用。
本編リポジトリは読み取りのみで、変更していない。画像だけを使い、本編のソースコードは流用していない（表示の CSS はこのリポジトリで書いたもの）。

| 使う場所 | ファイル | 元の素材（ミスティックモンスターズ） | 加工 |
| --- | --- | --- | --- |
| 会話のセリフ枠（四隅の飾りは縮尺のまま、中央だけ伸ばす） | `assets/images/ui/talk/dialogue_window_blank.png` | `assets/ui/recovery_1006/talk/dialogue_window_blank.png`（780×242） | なし（そのままコピー） |
| 話している人の名前の札 | `assets/images/ui/talk/name_label_blank.png` | `assets/ui/recovery_1006/talk/name_label_blank.png`（360×79） | なし |
| 会話の選択肢のボタン | `assets/images/ui/talk/button_blank.png` | `assets/ui/recovery_1006/talk/button_blank.png`（420×113） | なし |

元のコミット：`bc3160cf391616000883f2d3089588df835b9ae4`（本編の最新、2026-10-21）。
