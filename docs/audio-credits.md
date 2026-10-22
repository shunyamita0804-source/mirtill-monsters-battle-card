# 音源の出どころ（効果音）

ゲームで鳴らす音は `src/ui/sound.ts` の `SE_REGISTRY` で管理する。素材を差し替えるときは、ファイルを `assets/audio/se/` に置き、
`SE_REGISTRY` とこの表を更新する。

2026-10-22：ユーザー（ミスティックモンスターズとバトルカードの両方の所有者）の許可により、ミスティックモンスターズ
（`shunyamita0804-source/mystic-monsters`）の素材を利用。本編リポジトリは読み取りのみで、変更していない。
後から別の素材・UI を用意する可能性がある（ユーザー）。

| 場面（SE_REGISTRY） | ファイル | 元の素材（ミスティックモンスターズ） | 作者・ライセンス | 加工 |
| --- | --- | --- | --- | --- |
| `cardDraw`：カードを引く・手札に配る（1枚ごと） | `card_draw.ogg` / `card_draw.m4a` | `assets/audio/se/interface_sfx_pack_1/cursor_style_2.ogg`（本編の UI_SELECT） | Interface SFX Pack 1 / ObsydianX（CC0・クレジット不要） | 末尾の無音を切り落とし、iPhone 用に M4A（AAC）も作成。音色は変えていない |
| `manaGain`：カードをマナにした・山札からマナが増えた | `mana_gain.ogg` / `mana_gain.m4a` | `assets/audio/se/ivokard/bell.ogg`（本編の GOLD_GET） | Mix of SFX by Ivokard（CC0・クレジット不要） | 先頭1.0秒に切り、最後0.3秒をフェードアウト。M4A も作成 |
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
- **使わない音（不採用・未承認）**：01 カード使用・02 防御・07 KO・08 回復（旧素材は NG、代わりの候補も未承認）、09 マナ化の新しい音（未承認）。
  防御が成功してダメージ0のとき・KO のときは無音。マナ化は以前からの `manaGain` のまま

- 再生は Web Audio。OGG を再生できるブラウザは OGG、できないブラウザ（iPhone Safari の一部など）は M4A を使う（正式採用の4音は MP3 をどのブラウザでも使う）
- iPhone は最初のタップまで音を出せないため、最初のタップで音を使えるようにしてから読み込む

## 本編の画像素材（会話の UI）

2026-10-22：ユーザー指示「セリフの UI はミスモンのものを使う。NPC の名前の UI も同様」により、ミスティックモンスターズの会話 UI の画像を利用。
本編リポジトリは読み取りのみで、変更していない。画像だけを使い、本編のソースコードは流用していない（表示の CSS はこのリポジトリで書いたもの）。

| 使う場所 | ファイル | 元の素材（ミスティックモンスターズ） | 加工 |
| --- | --- | --- | --- |
| 会話のセリフ枠（四隅の飾りは縮尺のまま、中央だけ伸ばす） | `assets/images/ui/talk/dialogue_window_blank.png` | `assets/ui/recovery_1006/talk/dialogue_window_blank.png`（780×242） | なし（そのままコピー） |
| 話している人の名前の札 | `assets/images/ui/talk/name_label_blank.png` | `assets/ui/recovery_1006/talk/name_label_blank.png`（360×79） | なし |
| 会話の選択肢のボタン | `assets/images/ui/talk/button_blank.png` | `assets/ui/recovery_1006/talk/button_blank.png`（420×113） | なし |

元のコミット：`bc3160cf391616000883f2d3089588df835b9ae4`（本編の最新、2026-10-21）。
