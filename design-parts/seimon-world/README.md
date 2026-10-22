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

| town_house_e.png・town_fountain.png・tex_grass/stone/dirt.png・props_trees/flowers/street/misc.png | 住宅E・噴水・地面3・小物4 | 2026-10-22 ZIP「Seimon_Town9_Room14_23Assets_20261022」 |
| room_shell_*.png（7）・furn_*.png（7） | 部屋の箱・家具 | 同じ ZIP（「Seimon_Room14_ProductionAssets_20261022」と中身は同じ） |
| decal_grass.png・decal_flowers.png・props_bush_v2.png | 草むら・小花・植え込み | **復元**（下の注意） |

- 確認：いまの設計図（4800）で街・部屋を作り直し、ゲームの絵と比べた。**部屋は1ファイルも変わらず完全に一致**（＝原本）。街は建物・小物・地面・噴水が一致
- **草むら・小花・植え込みの3枚は原本が見つからなかったため、いまの街の絵から切り出して作った**（2026-10-22）。
  同じ乱数で「3つだけ抜いた街」を作って差を取り、草むら11・小花8・植え込み4を切り抜いて並べ直したもの。原本より少し淡く、ふちが少しやわらかい。
  原本が見つかったら、同じ名前で置き換える

## 使わないもの

- 2026-10-22 にチャットで届いた「斜め見下ろし（アイソメ）」の住宅E・噴水・地面の模様・部屋の箱・家具の絵（2枚の一覧画像）は、いまの街の画風・向き（正面）と違うので使っていない
