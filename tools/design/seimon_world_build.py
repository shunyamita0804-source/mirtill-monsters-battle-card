# -*- coding: utf-8 -*-
"""正式な街・部屋の部品（ユーザー承認済みの33枚）を設計図どおりに並べ、ゲーム用の絵と当たり判定を作る

使い方:
  python3 tools/design/seimon_world_build.py 部品のフォルダ [確認画像の出力フォルダ]

- 部品のファイル名は docs/design/seimon-town/05_補助資料/02_納品ファイル名一覧 の保存名（town_arena.png など）
- 配置の正本は tools/design/seimon_town_pack.py の TOWN / ROOMS（設計図と同じ座標）
- 出力
  - assets/images/maps/town/town_r{行}c{列}.webp   街の完成図（4800 を 3600 に縮小し 3×3 に分割）
  - assets/images/maps/rooms/{部屋}_shell.webp      部屋の箱（床と壁）
  - assets/images/maps/rooms/{部屋}_{家具}.webp     家具（1つずつ切り出し。人より奥／手前の重なりをゲームで決める）
  - src/data/worldArt.generated.ts                  マス目（歩ける所）・扉・家具の位置（ゲームが読む）
- 絵は描き直さない。縮小・切り抜き・透明部分のふちの整理・影を付けて並べるだけ
"""
from __future__ import annotations

import json
import os
import random
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy import ndimage

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import seimon_town_pack as pack  # noqa: E402

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
OUT_TOWN = os.path.join(ROOT, 'assets/images/maps/town')
OUT_ROOMS = os.path.join(ROOT, 'assets/images/maps/rooms')
OUT_TS = os.path.join(ROOT, 'src/data/worldArt.generated.ts')

CELL = 32                 # 当たり判定のマス（完成図のピクセル）
MAP = pack.MAP            # 4800
TOWN_OUT = 3600           # 街の絵の書き出しの大きさ（ゲームでは 2700 論理px で表示＝約1.33倍の細かさ）
TOWN_SPLIT = 3
WEBP_Q = 82

# 建物 ID → 部品のファイル名
BUILDING_FILE = {
    'ARENA': 'town_arena', 'TRAINING': 'town_training', 'HOUSE_A': 'town_house_a', 'HOUSE_B': 'town_house_b',
    'HOUSE_C': 'town_house_c', 'HOUSE_D': 'town_house_d', 'HOUSE_E': 'town_house_e', 'SHOP': 'town_shop',
    'LAB': 'town_lab', 'PLAYER_HOME': 'town_player_home', 'GUIDE_HOME': 'town_guide_home',
}


# ───────────── 部品の読み込み ─────────────
def clean_alpha(im: Image.Image, cut: int = 128) -> Image.Image:
    """透明部分のふちの色にじみを消す：半透明を切り、1px 内側に縮める（絵そのものは変えない）"""
    a = np.array(im.convert('RGBA'))
    al = np.where(a[..., 3] > cut, 255, 0).astype(np.uint8)
    al = np.array(Image.fromarray(al).filter(ImageFilter.MinFilter(3)))
    a[..., 3] = al
    return Image.fromarray(a)


def load_part(parts: str, name: str) -> Image.Image:
    im = clean_alpha(Image.open(f'{parts}/{name}.png'))
    return im.crop(im.getbbox())


def split_sheet(parts: str, name: str, dilate: int = 3) -> list[Image.Image]:
    """家具・小物の1枚の絵から、1つずつ切り出す（左上から読む順）"""
    im = Image.open(f'{parts}/{name}.png').convert('RGBA')
    a = np.array(im)[..., 3] > 40
    lab, _ = ndimage.label(ndimage.binary_dilation(a, iterations=dilate))
    boxes = []
    for i, s in enumerate(ndimage.find_objects(lab)):
        ys, xs = s
        if (a[s] & (lab[s] == i + 1)).sum() < 1500:
            continue
        boxes.append((xs.start, ys.start, xs.stop, ys.stop, i + 1))
    boxes.sort(key=lambda b: (round(((b[1] + b[3]) / 2) / 250), b[0]))
    out = []
    for x1, y1, x2, y2, k in boxes:
        piece = np.array(im.crop((x1, y1, x2, y2)))
        piece[..., 3] = np.where(lab[y1:y2, x1:x2] == k, piece[..., 3], 0)
        p = clean_alpha(Image.fromarray(piece), 96)
        out.append(p.crop(p.getbbox()))
    return out


# ───────────── 街 ─────────────
def tile_texture(tex: Image.Image, size: int, scale: float) -> Image.Image:
    t = tex.convert('RGB').resize((round(tex.width * scale), round(tex.height * scale)), Image.LANCZOS)
    out = Image.new('RGB', (size, size))
    for y in range(0, size, t.height):
        for x in range(0, size, t.width):
            out.paste(t, (x, y))
    return out


def town_walk_mask() -> Image.Image:
    """歩ける所（白）。設計図の長方形＋噴水広場の円。噴水そのものは後で絵の形で抜く"""
    m = Image.new('L', (MAP, MAP), 0)
    d = ImageDraw.Draw(m)
    p = pack.TOWN['plaza']
    cx, cy = p['center']
    d.ellipse([cx - p['r'], cy - p['r'], cx + p['r'], cy + p['r']], fill=255)
    for w in pack.TOWN['walk']:
        r = w['rect']
        d.rectangle([r[0], r[1], r[2] - 1, r[3] - 1], fill=255)
    return m


def place_fountain(parts: str) -> tuple[Image.Image, tuple[int, int]]:
    f = pack.TOWN['fountain']
    part = load_part(parts, 'town_fountain')
    x1, y1, x2, y2 = f['slot']
    s = (x2 - x1) / part.width
    part = part.resize((round(part.width * s), round(part.height * s)), Image.LANCZOS)
    cx, cy = f['center']
    return part, (cx - part.width // 2, cy - part.height // 2)


def place_building(parts: str, b: dict) -> tuple[Image.Image, tuple[int, int]]:
    x1, y1, x2, y2 = b['rect']
    part = load_part(parts, BUILDING_FILE[b['id']])
    s = (x2 - x1) / part.width
    part = part.resize((round(part.width * s), round(part.height * s)), Image.LANCZOS)
    return part, ((x1 + x2) // 2 - part.width // 2, y2 - part.height)


def shadow(base: Image.Image, part: Image.Image, xy: tuple[int, int], dx=18, dy=10, blur=10, alpha=90) -> None:
    sh = part.getchannel('A').point(lambda v: alpha if v > 0 else 0).filter(ImageFilter.GaussianBlur(blur))
    base.paste(Image.new('RGBA', part.size, (40, 50, 30, 255)), (xy[0] + dx, xy[1] + dy), sh)


# 小物（部品の何番目か → 名前と、街での大きさの倍率）
PROPS = {
    'props_trees': [('tree_round', 0.80), ('tree_conifer', 0.80), ('tree_small', 0.80), ('bush', 0.62)],
    'props_flowers': [('flowerbed_long', 0.52), ('planter_round', 0.50), ('flower_pot', 0.45), ('planter_box', 0.48)],
    'props_street': [('lamp', 0.62), ('bench', 0.46), ('flag', 0.62), ('signpost', 0.55)],
    'props_misc': [('barrel', 0.42), ('crates', 0.45), ('fence', 0.50), ('rock', 0.45)],
}

# 小物の置き場所（足元の座標＝絵の下辺の中央）。緑地・道のわき・街のまわり。道（歩ける所）には重ねない
# 自動で置くもの（木立・まわりの木）は place_props() で足す
PROP_SPOTS = [
    # 東西の通りの北側：街灯（道の外の芝生）
    ('lamp', 600, 2240), ('lamp', 1100, 2240), ('lamp', 1540, 2240), ('lamp', 3220, 2240), ('lamp', 3880, 2240), ('lamp', 4380, 2240),
    # 噴水広場の外：ベンチ
    ('bench', 1720, 2200), ('bench', 3080, 2200),
    # 大会会場の前庭：旗と花壇
    ('flag', 1990, 1700), ('flag', 2810, 1700),
    # 木立（北西）
    ('tree_small', 1790, 1640), ('tree_small', 1790, 1880),
    # 練習場の前
    ('flowerbed_long', 560, 1260), ('flowerbed_long', 1170, 1260),
    # 花壇の小広場（南西）
    ('flowerbed_long', 560, 2780), ('planter_round', 900, 2800), ('flowerbed_long', 1260, 2780), ('bench', 900, 2980),
    ('planter_box', 480, 2990), ('planter_box', 1440, 2990),
    # ショップのわき（樽・木箱）
    ('barrel', 230, 3820), ('crates', 1210, 3830),
    # 家と家の間の生け垣（南東）
    ('bush', 3552, 3500), ('bush', 3552, 3780),
    # 東の小さな緑地
    ('planter_round', 3400, 2900), ('bench', 3800, 2880), ('planter_round', 4200, 2900),
    # 北東の庭
    ('flowerbed_long', 3000, 1500), ('planter_round', 3250, 1750), ('flowerbed_long', 3000, 1860), ('bench', 3250, 1500),
    # 草原への出口：標柱と柵
    ('signpost', 2160, 4520), ('fence', 1980, 4700), ('fence', 2820, 4700),
    ('rock', 1500, 4500), ('rock', 3400, 4560), ('barrel', 2680, 4380),
    ('crates', 4620, 2600), ('rock', 160, 2650),
]


def load_props(parts: str) -> dict[str, Image.Image]:
    out = {}
    for sheet, items in PROPS.items():
        pieces = split_sheet(parts, sheet, 3)
        assert len(pieces) == len(items), (sheet, len(pieces))
        for piece, (name, scale) in zip(pieces, items):
            out[name] = piece.resize((round(piece.width * scale), round(piece.height * scale)), Image.LANCZOS)
    return out


def build_town(parts: str, check_dir: str | None):
    W = MAP
    walk = town_walk_mask()
    walk_np = np.array(walk) > 0

    # 地面：草地 → 歩ける所は石畳 → 草原への出口は土の道
    base = tile_texture(Image.open(f'{parts}/tex_grass.png'), W, 0.75).convert('RGBA')
    stone = tile_texture(Image.open(f'{parts}/tex_stone.png'), W, 0.5).convert('RGBA')
    dirt = tile_texture(Image.open(f'{parts}/tex_dirt.png'), W, 0.75).convert('RGBA')
    ex = pack.TOWN['exit']['rect']
    dirt_mask = Image.new('L', (W, W), 0)
    ImageDraw.Draw(dirt_mask).rectangle([ex[0], ex[1], ex[2] - 1, ex[3] - 1], fill=255)
    stone_mask = Image.fromarray(np.where(walk_np & ~(np.array(dirt_mask) > 0), 255, 0).astype(np.uint8))
    # 石畳のふち：少し濃い縁取りと、草とのなじみ
    edge = stone_mask.filter(ImageFilter.MaxFilter(9))
    base.paste(Image.new('RGBA', (W, W), (120, 112, 92, 255)), (0, 0), edge.filter(ImageFilter.GaussianBlur(3)))
    base.paste(stone, (0, 0), stone_mask.filter(ImageFilter.GaussianBlur(1.5)))
    # 土の道は上（石畳との境）をぼかしてつなぐ
    dm = np.array(dirt_mask).astype(np.float32)
    ramp = np.clip((np.arange(W) - ex[1]) / 120.0, 0, 1)[:, None]
    dm = (dm * ramp).astype(np.uint8)
    base.paste(dirt, (0, 0), Image.fromarray(dm).filter(ImageFilter.GaussianBlur(6)))

    # 噴水（形は絵のとおり。絵の部分は歩けない）
    fountain, fxy = place_fountain(parts)
    shadow(base, fountain, fxy, 10, 8, 8, 70)
    base.alpha_composite(fountain, fxy)
    fountain_block = np.zeros((W, W), bool)
    fa = np.array(fountain.getchannel('A')) > 0
    fountain_block[fxy[1]:fxy[1] + fa.shape[0], fxy[0]:fxy[0] + fa.shape[1]] = fa

    # 小物
    props = load_props(parts)
    prop_list = list(PROP_SPOTS)
    rng = random.Random(20261022)
    # 街のまわりの木（ふち）と北西の木立
    for x in range(60, W, 220):
        prop_list.append((rng.choice(['tree_round', 'tree_conifer']), x + rng.randint(-40, 40), 200 + rng.randint(-30, 30)))
    for y in range(400, W - 200, 260):
        prop_list.append((rng.choice(['tree_round', 'tree_conifer', 'tree_small']), 70 + rng.randint(-20, 20), y))
        prop_list.append((rng.choice(['tree_round', 'tree_conifer', 'tree_small']), W - 70 + rng.randint(-20, 20), y))
    gx1, gy1, gx2, gy2 = next(g['rect'] for g in pack.TOWN['green'] if g['id'] == 'GREEN_NW')
    for y in range(gy1 + 200, gy2 + 1, 170):
        for x in range(gx1 + 60, gx2, 150):
            prop_list.append((rng.choice(['tree_round', 'tree_small', 'tree_conifer']), x + rng.randint(-25, 25), y + rng.randint(-20, 20)))
    for g in ('MEADOW_SW', 'MEADOW_SE'):
        mx1, my1, mx2, my2 = next(z['rect'] for z in pack.TOWN['green'] if z['id'] == g)
        for x in range(mx1 + 120, mx2 - 60, 330):
            prop_list.append((rng.choice(['tree_round', 'tree_small', 'bush']), x + rng.randint(-60, 60), my1 + 160 + rng.randint(-40, 120)))

    # 建物の枠（小物を重ねない）
    bld_rects = [b['rect'] for b in pack.TOWN['buildings']]
    # 歩ける所から「人の背たけぶん上」まで（人がこの範囲を歩くと、小物の奥／手前が逆に見えるため置かない）
    walk_dil = ndimage.binary_dilation(walk_np, iterations=8)
    placed: list[tuple[Image.Image, tuple[int, int]]] = []
    skipped = []
    occupied = np.zeros((W, W), bool)
    for name, fx, fy in prop_list:
        im = props[name]
        x, y = fx - im.width // 2, fy - im.height
        if x < -im.width // 3 or x + im.width > W + im.width // 3 or y < -im.height // 2 or fy > W:
            continue
        x1c, y1c, x2c, y2c = max(x, 0), max(y, 0), min(x + im.width, W), min(y + im.height, W)
        a = np.array(im.getchannel('A'))[y1c - y:y2c - y, x1c - x:x2c - x] > 0
        if (walk_dil[y1c:y2c, x1c:x2c] & a).any() or (occupied[y1c:y2c, x1c:x2c] & a).any():
            skipped.append((name, fx, fy))
            continue
        if any(not (x2c <= r[0] or x1c >= r[2] or y2c <= r[1] or y1c >= r[3]) for r in bld_rects):
            skipped.append((name, fx, fy))
            continue
        occupied[y1c:y2c, x1c:x2c] |= a
        placed.append((im, (x, y)))
    # 奥（上）から順に描く
    for im, xy in sorted(placed, key=lambda p: p[1][1] + p[0].height):
        shadow(base, im, xy, 10, 6, 6, 60)
        base.alpha_composite(im, xy)

    # 建物（奥から）
    buildings = []
    for b in sorted(pack.TOWN['buildings'], key=lambda b: b['rect'][3]):
        part, xy = place_building(parts, b)
        shadow(base, part, xy)
        base.alpha_composite(part, xy)
        buildings.append((b, part, xy))

    # 書き出し（3600 に縮小して 3×3）
    os.makedirs(OUT_TOWN, exist_ok=True)
    small = base.convert('RGB').resize((TOWN_OUT, TOWN_OUT), Image.LANCZOS)
    step = TOWN_OUT // TOWN_SPLIT
    tiles = []
    for r in range(TOWN_SPLIT):
        for c in range(TOWN_SPLIT):
            name = f'town_r{r}c{c}.webp'
            small.crop((c * step, r * step, (c + 1) * step, (r + 1) * step)).save(f'{OUT_TOWN}/{name}', quality=WEBP_Q, method=6)
            u = MAP // TOWN_SPLIT
            tiles.append(dict(file=f'maps/town/{name}', x=c * u, y=r * u, w=u, h=u))

    # ───── マス目 ─────
    cols = rows = MAP // CELL
    grid = [['#'] * cols for _ in range(rows)]
    for ry in range(rows):
        for cx in range(cols):
            px, py = cx * CELL + CELL // 2, ry * CELL + CELL // 2
            if walk_np[py, px] and not fountain_block[py, px]:
                grid[ry][cx] = '='
    # 噴水のまわり：足元が噴水の絵にかかるマスも歩けない（中心だけでなくマスの4すみで見る）
    for ry in range(rows):
        for cx in range(cols):
            if grid[ry][cx] != '=':
                continue
            x0, y0 = cx * CELL, ry * CELL
            if fountain_block[y0 + 4:y0 + CELL - 4, x0 + 4:x0 + CELL - 4].any():
                grid[ry][cx] = '#'

    doors = {}
    for b, part, xy in buildings:
        dx, dy = pack.door_of(b)
        half = b['door_w'] / 2
        door_cols = [cx for cx in range(cols) if dx - half <= cx * CELL + CELL // 2 <= dx + half]
        # 玄関のマス：建物の枠の中の一番下の行（その下が歩ける道）
        r0 = dy // CELL
        door_row = r0 if r0 * CELL + CELL // 2 < dy else r0 - 1
        for cx in door_cols:
            assert grid[door_row + 1][cx] == '=', (b['id'], cx, door_row)
            grid[door_row][cx] = '='
        doors[b['id']] = dict(x=door_cols[0], y=door_row, w=len(door_cols), h=1,
                              back=dict(x=(door_cols[0] + door_cols[-1] + 1) // 2, y=door_row + 1),
                              label=dict(x=(b['rect'][0] + b['rect'][2]) // 2, y=xy[1]))
    # 草原への出口
    tx1, ty1, tx2, ty2 = pack.TOWN['exit']['trigger']
    exit_cols = [cx for cx in range(cols) if tx1 <= cx * CELL + CELL // 2 < tx2 and grid[rows - 1][cx] == '=']
    exit_row = rows - 1
    fx1, fy1 = fxy
    fountain_cells = dict(x=fx1 // CELL, y=fy1 // CELL,
                          w=(fx1 + fountain.width) // CELL - fx1 // CELL + 1,
                          h=(fy1 + fountain.height) // CELL - fy1 // CELL + 1)
    sx, sy = pack.TOWN['spawn']['point']
    town = dict(
        id='town', cols=cols, rows=rows, width=MAP, height=MAP, cell=CELL,
        grid=[''.join(r) for r in grid], tiles=tiles, sprites=[],
        doors=doors, exit=dict(x=exit_cols[0], y=exit_row, w=len(exit_cols), h=1),
        fountain=fountain_cells, spawn=dict(x=sx // CELL, y=sy // CELL),
    )
    if check_dir:
        chk = base.copy()
        d = ImageDraw.Draw(chk, 'RGBA')
        for ry in range(rows):
            for cx in range(cols):
                if grid[ry][cx] == '=':
                    d.rectangle([cx * CELL, ry * CELL, cx * CELL + CELL - 1, ry * CELL + CELL - 1], fill=(0, 120, 255, 50))
        for dd in doors.values():
            d.rectangle([dd['x'] * CELL, dd['y'] * CELL, (dd['x'] + dd['w']) * CELL, (dd['y'] + 1) * CELL], fill=(0, 255, 0, 140))
        chk.convert('RGB').resize((1600, 1600), Image.LANCZOS).save(f'{check_dir}/town_check.jpg', quality=88)
        small.resize((1600, 1600), Image.LANCZOS).save(f'{check_dir}/town_full.jpg', quality=88)
        base.crop((2500, 3000, 4500, 4300)).convert('RGB').save(f'{check_dir}/town_se_1x.jpg', quality=88)
        print('skipped props:', skipped)
    return town


# ───────────── 部屋 ─────────────
# 部屋の箱の絵（1024×1024）の中の床の範囲：奥の壁の下 top、手前の壁の上 bottom、
# 左右の壁（奥 lt/rt・手前 lb/rb）、手前の壁の出入口の左右 door
SHELL = {
    'ROOM_PLAYER': dict(file='room_shell_player', top=300, bottom=938, lt=70, rt=955, lb=25, rb=1000, door=(444, 582)),
    'ROOM_GUIDE': dict(file='room_shell_guide', top=250, bottom=932, lt=50, rt=975, lb=12, rb=1012, door=(444, 582)),
    'ROOM_HOUSE': dict(file='room_shell_house', top=290, bottom=905, lt=95, rt=930, lb=25, rb=1000, door=(416, 608)),
    'ROOM_SHOP': dict(file='room_shell_shop', top=335, bottom=888, lt=95, rt=932, lb=18, rb=1008, door=(414, 612)),
    'ROOM_LAB': dict(file='room_shell_lab', top=340, bottom=905, lt=75, rt=950, lb=22, rb=1002, door=(416, 610)),
    'ROOM_TRAINING': dict(file='room_shell_training', top=318, bottom=932, lt=75, rt=950, lb=22, rb=1002, door=(448, 576)),
    'ROOM_ARENA': dict(file='room_shell_arena', top=330, bottom=850, lt=60, rt=965, lb=40, rb=985, door=(390, 650)),
}

# 家具の部品（部品の何番目か）。分割の広げ幅（大会会場の客席は板が離れているので広く）
FURN = {
    'furn_player': (3, ['bed', 'desk', 'bookshelf', 'wall_map']),
    'furn_common': (3, ['rug', 'plant', 'table', 'shelf']),
    'furn_guide': (3, ['fireplace', 'kitchen', 'round_table', 'flower_stand']),
    'furn_shop': (3, ['shelf_wall', 'pack_machine', 'counter', 'showcase']),
    'furn_lab': (3, ['big_shelf', 'crystal', 'specimen', 'desk', 'shelf2', 'reading_table']),
    'furn_training': (3, ['board', 'table', 'bench', 'shelf']),
    'furn_arena': (12, ['flags', 'stage', 'seats', 'reception']),
}

# 設計図の家具 ID → 使う部品。kind: furniture（床に置く・歩けない）／rug（敷物・歩ける）／wall（壁に掛ける）
ROOM_ITEMS = {
    'ROOM_PLAYER': {'BED': 'furn_player:bed', 'WALL_MAP': 'furn_player:wall_map', 'BOOKSHELF': 'furn_player:bookshelf',
                    'DESK': 'furn_player:desk', 'RUG': 'furn_common:rug', 'PLANT': 'furn_common:plant'},
    'ROOM_GUIDE': {'FIREPLACE': 'furn_guide:fireplace', 'KITCHEN': 'furn_guide:kitchen', 'BOOKSHELF': 'furn_player:bookshelf',
                   'TABLE': 'furn_guide:round_table', 'FLOWER': 'furn_guide:flower_stand'},
    'ROOM_HOUSE': {'SHELF': 'furn_common:shelf', 'PLANT': 'furn_common:plant', 'TABLE': 'furn_common:table'},
    'ROOM_SHOP': {'SHELF_WALL': 'furn_shop:shelf_wall', 'PACK_MACHINE': 'furn_shop:pack_machine', 'COUNTER': 'furn_shop:counter',
                  'CASE_L': 'furn_shop:showcase', 'CASE_R': 'furn_shop:showcase'},
    'ROOM_LAB': {'BIG_SHELF': 'furn_lab:big_shelf', 'CRYSTAL': 'furn_lab:crystal', 'SPECIMEN': 'furn_lab:specimen',
                 'DESK': 'furn_lab:desk', 'SHELF2': 'furn_lab:shelf2', 'TABLE': 'furn_lab:reading_table'},
    'ROOM_TRAINING': {'BOARD': 'furn_training:board', 'SHELF': 'furn_training:shelf', 'TABLE_1': 'furn_training:table',
                      'TABLE_2': 'furn_training:table', 'BENCH_L': 'furn_training:bench', 'BENCH_R': 'furn_training:bench'},
    'ROOM_ARENA': {'FLAGS': 'furn_arena:flags', 'STAGE': 'furn_arena:stage', 'SEATS_L': 'furn_arena:seats',
                   'SEATS_R': 'furn_arena:seats', 'RECEPTION': 'furn_arena:reception'},
}

ROOM_SLUG = {'ROOM_PLAYER': 'player', 'ROOM_GUIDE': 'guide', 'ROOM_HOUSE': 'house', 'ROOM_SHOP': 'shop',
             'ROOM_LAB': 'lab', 'ROOM_TRAINING': 'training', 'ROOM_ARENA': 'arena'}


def load_furniture(parts: str) -> dict[str, Image.Image]:
    out = {}
    for sheet, (dil, names) in FURN.items():
        pieces = split_sheet(parts, sheet, dil)
        assert len(pieces) == len(names), (sheet, len(pieces))
        for p, n in zip(pieces, names):
            out[f'{sheet}:{n}'] = p
    return out


def build_room(parts: str, room: dict, furn: dict[str, Image.Image], check_dir: str | None):
    rid = room['id']
    sh = SHELL[rid]
    W, H = room['size']
    k = W / 1024                       # 部屋の箱の絵 1px → 部屋の単位（設計図と同じ。主人公 108×144）
    top, bottom = sh['top'] * k, sh['bottom'] * k
    wall = pack.ROOM_WALL

    def map_y(by: float) -> float:
        """設計図の y → 部屋の絵の上の y（奥の壁と床をそれぞれ縦に合わせる）"""
        if by <= wall:
            return by / wall * top
        return top + (by - wall) / (H - wall) * (bottom - top)

    slug = ROOM_SLUG[rid]
    os.makedirs(OUT_ROOMS, exist_ok=True)
    # 書き出しの細かさ：表示（論理px＝単位×0.5625）の約2倍、元の大きさまで
    out_scale = min(1.0, 2 * 0.5625 * W / 1024)
    shell = Image.open(f'{parts}/{sh["file"]}.png').convert('RGB')
    shell.resize((round(1024 * out_scale), round(1024 * out_scale)), Image.LANCZOS).save(
        f'{OUT_ROOMS}/{slug}_shell.webp', quality=WEBP_Q + 4, method=6)

    cols = rows = W // CELL
    unit = W  # 部屋の絵は正方形
    grid = [['#'] * cols for _ in range(rows)]

    def floor_x(y: float) -> tuple[float, float]:
        t = (y / k - sh['top']) / (sh['bottom'] - sh['top'])
        return (sh['lt'] + (sh['lb'] - sh['lt']) * t) * k, (sh['rt'] + (sh['rb'] - sh['rt']) * t) * k

    for ry in range(rows):
        for cx in range(cols):
            px, py = cx * CELL + CELL / 2, ry * CELL + CELL / 2
            if top + 8 <= py <= bottom - 4:
                lx, rx = floor_x(py)
                if lx + 10 <= px <= rx - 10:
                    grid[ry][cx] = '.'
    # 出入口：手前の壁のすき間（床の下から絵の下まで）
    dl, dr = sh['door'][0] * k, sh['door'][1] * k
    door_cols = [cx for cx in range(cols) if dl + 6 <= cx * CELL + CELL / 2 <= dr - 6]
    for ry in range(rows):
        if ry * CELL + CELL / 2 > bottom - 4:
            for cx in door_cols:
                grid[ry][cx] = '.'

    sprites = []
    items = {}
    saved_files = {}
    for it in room['items']:
        key = ROOM_ITEMS[rid].get(it['id'])
        bx1, by1, bx2, by2 = it['rect']
        y1, y2 = map_y(by1), map_y(by2)
        rect_u = [bx1, y1, bx2, y2]
        if key:
            src = furn[key]
            w = bx2 - bx1
            s = w / src.width
            h = src.height * s
            if it['kind'] == 'wall':
                # 壁の物：枠の中に収める（縦横の小さい方に合わせる）
                s = min(w / src.width, (y2 - y1) / src.height)
                w, h = src.width * s, src.height * s
                x = (bx1 + bx2) / 2 - w / 2
                y = (y1 + y2) / 2 - h / 2
            else:
                x, y = bx1, y2 - h
            fname = f'{slug}_{key.split(":")[1]}.webp'
            if fname not in saved_files:
                px_w = max(1, round(w * 0.5625 * 2))
                src.resize((px_w, max(1, round(src.height * px_w / src.width))), Image.LANCZOS).save(
                    f'{OUT_ROOMS}/{fname}', quality=WEBP_Q + 6, method=6)
                saved_files[fname] = True
            # 敷物は床の一部（いつも人より奥）。壁の物も奥
            z = 0 if it['kind'] in ('rug', 'wall') else y2
            sprites.append(dict(file=f'maps/rooms/{fname}', x=round(x), y=round(y), w=round(w), h=round(h), z=round(z)))
        # 当たり判定：床に置く家具は、設計図の枠（床に当たる部分）を歩けなくする
        c1, c2 = int(bx1 // CELL), int(-(-bx2 // CELL))
        r1, r2 = int(y1 // CELL), int(-(-y2 // CELL))
        if it['kind'] == 'furniture':
            for ry in range(max(r1, 0), min(r2, rows)):
                for cx in range(max(c1, 0), min(c2, cols)):
                    if ry * CELL + CELL / 2 < y2 + 4:
                        grid[ry][cx] = '#'
        # 調べる範囲（マス）：家具の枠。上が歩けないマスなら絵の上までのばす（壁ぎわの家具・壁の物）
        rr1 = r1
        if key:
            img_top = int(sprites[-1]['y'] // CELL)
            while rr1 > max(img_top, 0) and all(grid[rr1 - 1][cx] == '#' for cx in range(max(c1, 0), min(c2, cols))):
                rr1 -= 1
        if it['kind'] == 'wall':
            # 壁の物は床に届くまで下にのばす（床の一番奥から調べられるように）
            while r2 < rows and all(grid[r2][cx] == '#' for cx in range(max(c1, 0), min(c2, cols))):
                r2 += 1
        items[it['id']] = dict(x=c1, y=rr1, w=c2 - c1, h=max(1, r2 - rr1))
    exit_row = rows - 1
    spawn_row = max(ry for ry in range(rows) if ry * CELL + CELL / 2 <= bottom - 4)
    data = dict(
        id=slug, cols=cols, rows=rows, width=unit, height=unit, cell=CELL,
        grid=[''.join(r) for r in grid],
        tiles=[dict(file=f'maps/rooms/{slug}_shell.webp', x=0, y=0, w=unit, h=unit)],
        sprites=sprites, items=items,
        exit=dict(x=door_cols[0], y=exit_row, w=len(door_cols), h=1),
        spawn=dict(x=(door_cols[0] + door_cols[-1] + 1) // 2, y=spawn_row),
    )
    if check_dir:
        im = shell.resize((unit, unit), Image.LANCZOS).convert('RGBA')
        for s in sorted(sprites, key=lambda s: s['z']):
            f = Image.open(f'{OUT_ROOMS}/{s["file"].split("/")[-1]}').convert('RGBA').resize((s['w'], s['h']), Image.LANCZOS)
            im.alpha_composite(f, (s['x'], s['y']))
        d = ImageDraw.Draw(im, 'RGBA')
        for ry in range(rows):
            for cx in range(cols):
                if grid[ry][cx] == '.':
                    d.rectangle([cx * CELL, ry * CELL, cx * CELL + CELL - 1, ry * CELL + CELL - 1], outline=(0, 120, 255, 120), fill=(0, 120, 255, 35))
        for iid, r in items.items():
            d.rectangle([r['x'] * CELL, r['y'] * CELL, (r['x'] + r['w']) * CELL - 1, (r['y'] + r['h']) * CELL - 1], outline=(255, 0, 0, 200), width=2)
            d.text((r['x'] * CELL + 3, r['y'] * CELL + 3), iid, fill=(255, 255, 0, 255))
        e = data['exit']
        d.rectangle([e['x'] * CELL, e['y'] * CELL, (e['x'] + e['w']) * CELL - 1, (e['y'] + 1) * CELL - 1], fill=(0, 255, 0, 140))
        im.convert('RGB').save(f'{check_dir}/room_{slug}.jpg', quality=88)
    return data


# ───────────── TypeScript に書き出す ─────────────
def to_ts(town: dict, rooms: list[dict]) -> str:
    files: list[str] = []

    def ref(d: dict) -> dict:
        f = d['file']
        if f not in files:
            files.append(f)
        return {**d, 'file': f'@@{files.index(f)}@@'}

    maps = []
    for m in [town, *rooms]:
        m = dict(m)
        m['tiles'] = [ref(t) for t in m['tiles']]
        m['sprites'] = [ref(s) for s in m['sprites']]
        maps.append(m)
    body = json.dumps({m['id']: m for m in maps}, ensure_ascii=False, indent=1)
    for i, _ in enumerate(files):
        body = body.replace(f'"@@{i}@@"', f'img{i}')
    imports = '\n'.join(f"import img{i} from '@assets/images/{f}';" for i, f in enumerate(files))
    return (
        '// このファイルは tools/design/seimon_world_build.py が自動で作る（手で直さない）\n'
        '// 正式な街・部屋の絵（ユーザー承認済みの部品を設計図どおりに並べたもの）と、歩ける所のマス目・扉・家具の位置\n'
        f'{imports}\n\n'
        'export interface ArtImage { readonly file: string; readonly x: number; readonly y: number; readonly w: number; readonly h: number; readonly z?: number }\n'
        'export interface CellRect { readonly x: number; readonly y: number; readonly w: number; readonly h: number }\n'
        'export interface ArtMap {\n'
        '  readonly id: string;\n  readonly cols: number;\n  readonly rows: number;\n'
        '  /** 絵の大きさ（設計図の単位。表示は 0.5625 倍の論理px） */\n  readonly width: number;\n  readonly height: number;\n'
        '  /** 1マスの大きさ（設計図の単位） */\n  readonly cell: number;\n'
        "  /** マス目：'#' 歩けない・'=' 道・'.' 床 */\n  readonly grid: readonly string[];\n"
        '  readonly tiles: readonly ArtImage[];\n  /** 人と前後を比べて重ねる絵（z＝足元の y。0 はいつも奥） */\n  readonly sprites: readonly ArtImage[];\n'
        '  readonly exit: CellRect;\n  readonly spawn: { readonly x: number; readonly y: number };\n'
        '  readonly doors?: Readonly<Record<string, CellRect & { readonly back: { readonly x: number; readonly y: number }; readonly label: { readonly x: number; readonly y: number } }>>;\n'
        '  readonly items?: Readonly<Record<string, CellRect>>;\n  readonly fountain?: CellRect;\n'
        '}\n\n'
        f'export const WORLD_ART: Readonly<Record<string, ArtMap>> = {body};\n'
    )


def main() -> None:
    parts = sys.argv[1]
    check = sys.argv[2] if len(sys.argv) > 2 else None
    if check:
        os.makedirs(check, exist_ok=True)
    town = build_town(parts, check)
    furn = load_furniture(parts)
    rooms = [build_room(parts, r, furn, check) for r in pack.ROOMS]
    with open(OUT_TS, 'w', encoding='utf-8') as f:
        f.write(to_ts(town, rooms))
    print('ok', OUT_TS)


if __name__ == '__main__':
    main()
