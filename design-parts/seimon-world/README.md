# 街・部屋の部品の原本（2026-10-22〜）

`tools/design/seimon_world_build.py` で街・部屋の絵を作り直すときに使う部品。**ゲームには直接入らない**（ビルドの対象外。ゲームが読むのは作り直した `assets/images/maps/`）。
以前は原本をリポジトリに入れておらず、作り直すたびにユーザーに再送してもらっていた。2026-10-22 ユーザー指示で、届いた原本をここに保管する。

使い方：`python3 tools/design/seimon_world_build.py design-parts/seimon-world 確認画像の出力先`（部品がそろってから）

受け取ったファイルは**そのまま**（名前だけ、`docs/design/seimon-town/05_補助資料/02_納品ファイル名一覧` の保存名に付け直し）。

## そろっているもの

| 保存名 | 中身 | 受け取り |
| --- | --- | --- |
| town_arena.png | 大会会場（青いドーム） | 2026-10-22 チャットの画像（1536×1024・透明） |
| town_training.png | 練習場（赤い横長） | 同上（1536×1024） |
| town_shop.png | カードショップ（オレンジのしましま屋根） | 同上（1536×1024） |
| town_lab.png | 研究所（青緑） | 同上（1254×1254） |
| town_player_home.png | 主人公の家（郵便受け・赤茶の屋根） | 同上（1254×1254） |
| town_guide_home.png | 案内役の家（紫） | 同上 |
| town_house_a.png | 住宅A（茶） | 同上 |
| town_house_b.png | 住宅B（青） | 同上 |
| town_house_c.png | 住宅C（緑） | 同上 |
| town_house_d.png | 住宅D（赤） | 同上 |

## まだ無いもの（届いたらここに入れる）

- 街：town_house_e（住宅E）・town_fountain・tex_grass・tex_stone・tex_dirt・props_trees・props_flowers・props_street・props_misc
- 街の追加部品：decal_grass・decal_flowers・props_bush_v2（草むら・小花・植え込み）
- 部屋（14枚）：room_shell_player・room_shell_guide・room_shell_house・room_shell_shop・room_shell_lab・room_shell_training・room_shell_arena・
  furn_player・furn_common・furn_guide・furn_shop・furn_lab・furn_training・furn_arena
