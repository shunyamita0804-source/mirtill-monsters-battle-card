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
| `damageHit`：モンスターがダメージを受けた | `damage_hit.ogg` / `damage_hit.m4a` | `assets/audio/se/ivokard/hit_1.ogg`（本編の BATTLE_HIT） | Mix of SFX by Ivokard（CC0・クレジット不要） | 先頭0.9秒に切り、最後0.2秒をフェードアウト。M4A も作成 |
| `turnOrderSelect`：先攻・後攻のカードを選んだ瞬間 | `turn_order_select.ogg` / `turn_order_select.m4a` | `assets/audio/se/mystic_monsters_official/15_branch_select.ogg`（本編の BRANCH_SELECT） | ミスティックモンスターズ正式素材（ユーザー提供・ゲーム所有） | 同上 |

- 再生は Web Audio。OGG を再生できるブラウザは OGG、できないブラウザ（iPhone Safari の一部など）は M4A を使う
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
