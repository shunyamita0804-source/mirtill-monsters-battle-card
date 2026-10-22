# -*- coding: utf-8 -*-
"""届いた建物の部品を設計図の位置に仮に並べる確認用スクリプト（地面と噴水は仮の色）
使い方: python3 tools/design/seimon_town_preview.py 部品のフォルダ 主人公の歩行シート.png 出力フォルダ
部品は 05_補助資料/02 の保存名で置く。主人公は大きさ確認のために置くだけ"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import seimon_town_pack as p
from PIL import Image, ImageDraw, ImageFilter
import numpy as np
PARTS, SPRITE, OUT = (sys.argv[1:4] + [None] * 3)[:3] if __name__ == '__main__' else (None, None, None)
FILE = {'ARENA': 'town_arena', 'TRAINING': 'town_training', 'HOUSE_A': 'town_house_a', 'HOUSE_B': 'town_house_b',
        'HOUSE_C': 'town_house_c', 'HOUSE_D': 'town_house_d', 'HOUSE_E': None, 'SHOP': 'town_shop', 'LAB': 'town_lab',
        'PLAYER_HOME': 'town_player_home', 'GUIDE_HOME': 'town_guide_home'}

def load_part(name):
    im = Image.open(f'{PARTS}/{name}.png').convert('RGBA')
    a = np.array(im)
    al = a[..., 3]
    # 背景抜きのふちの色にじみを減らす：半透明を切り、1px 内側に縮める
    al = np.where(al > 128, 255, 0).astype(np.uint8)
    al = np.array(Image.fromarray(al).filter(ImageFilter.MinFilter(3)))
    a[..., 3] = al
    im = Image.fromarray(a)
    return im.crop(im.getbbox())

def build(scale_mode='slot'):
    mask = p.town_mask()
    W = p.MAP
    im = Image.new('RGBA', (W, W), (126, 178, 92, 255))
    stone = Image.new('RGBA', (W, W), (226, 210, 178, 255))
    im.paste(stone, (0, 0), mask)
    edge = mask.filter(ImageFilter.FIND_EDGES).filter(ImageFilter.MaxFilter(7))
    im.paste(Image.new('RGBA', (W, W), (170, 150, 120, 255)), (0, 0), edge)
    d = ImageDraw.Draw(im)
    fx, fy = p.TOWN['fountain']['center']
    d.ellipse([fx-288, fy-288, fx+288, fy+288], fill=(200, 200, 205), outline=(120, 120, 130), width=6)
    d.ellipse([fx-224, fy-224, fx+224, fy+224], fill=(110, 175, 215))
    info = []
    for b in sorted(p.TOWN['buildings'], key=lambda b: b['rect'][3]):
        x1, y1, x2, y2 = b['rect']
        name = FILE[b['id']]
        if not name:
            d.rectangle(b['rect'], fill=(200, 200, 200), outline=(90, 90, 90), width=6)
            d.text(((x1+x2)//2, (y1+y2)//2), '住宅E（未着）', font=p.font(40), fill=(60, 60, 60), anchor='mm')
            continue
        part = load_part(name)
        s = (x2 - x1) / part.width
        part = part.resize((round(part.width*s), round(part.height*s)), Image.LANCZOS)
        px = (x1 + x2)//2 - part.width//2
        py = y2 - part.height
        sh = Image.new('L', part.size, 0)
        sh.paste(part.getchannel('A').point(lambda v: 90 if v > 0 else 0))
        sh = sh.filter(ImageFilter.GaussianBlur(10))
        im.paste(Image.new('RGBA', part.size, (40, 50, 30, 255)), (px+18, py+10), sh)
        im.alpha_composite(part, (px, py))
        info.append((b['name'], round(part.height/(y2-y1), 2)))
    pl = p.load_player(SPRITE, p.PLAYER_H)
    for b in p.TOWN['buildings']:
        dx, dy = p.door_of(b)
        p.paste_player(im, pl, (dx, dy + 40))
    return im, info

if __name__ == '__main__':
  im, info = build()
  print(info)
  im.convert('RGB').resize((1600, 1600), Image.LANCZOS).save(f'{OUT}/v2_全体_縮小.jpg', quality=90)
  im.crop((2600, 3000, 4500, 4250)).convert('RGB').save(f'{OUT}/v2_南東_等倍.jpg', quality=90)
  im.crop((200, 2900, 2600, 4250)).convert('RGB').resize((1600, 900)).save(f'{OUT}/v2_南西.jpg', quality=90)
