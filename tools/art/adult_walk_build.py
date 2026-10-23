# -*- coding: utf-8 -*-
"""大人の人物の歩く絵（2026-10-23 納品）を、ゲーム用のシートにする

届く絵（1人につき3枚。docs/design/characters-adult-20261022/ の依頼どおり）:
  {ID}_walk_front.png / {ID}_walk_back.png / {ID}_walk_left.png
  1536×1024 に 512×1024 の枠が3つ。左から「立つ・右足を前・左足を前」。足元は枠の y≈940、背の高さ約860

作るもの（1コマ 216×288、足元 (108, 270)、人物の高さ約250。行は 正面・背中・左・右）:
  - 主人公：5列（右足を前・立つ・左足を前・立つ・立ち止まり）＝ 1080×1152
  - NPC   ：4列（右足を前・立つ・左足を前・立つ）＝ 864×1152（2列目が待機の絵）
  - 主人公の選択画面の立ち絵：正面の「立つ」1コマ（216×288）
  右向きは左向きの左右反転。絵は描き直さない（縮小と位置合わせだけ）

使い方:
  python3 tools/art/adult_walk_build.py 届いた絵のフォルダ ID 出力.png [--npc] [--idle 立ち絵の出力.png]
"""
import sys

import numpy as np
from PIL import Image

FW, FH = 216, 288
FOOT_X, FOOT_Y = 108, 270
FIGURE_H = 250          # ゲームのコマでの人物の高さ（いまの人物と同じ）
SRC_W = 512             # 届いた絵の1ポーズの枠の幅
SRC_FIGURE_H = 860      # 届いた絵の人物の高さ（依頼の枠どおり）
K = FIGURE_H / SRC_FIGURE_H


def body_shift(ref: np.ndarray, a: np.ndarray) -> int:
    """a を横に何 px ずらすと、上半身（頭の下〜腰）が ref と一番重なるか。
    足を出したポーズは体が枠の真ん中からずれて描かれていることがあり、そのままだと歩くたびに体が左右にぶれる"""
    ys = np.nonzero(ref.any(axis=1))[0]
    top, bottom = int(ys[0]), int(ys[-1])
    band = slice(top + int((bottom - top) * 0.15), top + int((bottom - top) * 0.50))
    r, m = ref[band], a[band]
    best, best_dx = -1, 0
    for dx in range(-80, 81, 2):
        score = int((r & np.roll(m, dx, axis=1)).sum())
        if score > best:
            best, best_dx = score, dx
    return best_dx


def pose(sheet: Image.Image, i: int, ref: np.ndarray | None = None) -> Image.Image:
    """i 番目のポーズを 216×288 のコマにする。足元（いちばん下の不透明な行）を y=270 に、
    横は枠の真ん中を x=108 に（ref があれば、上半身が ref の立ち姿と重なるようにずらす）"""
    src = sheet.crop((i * SRC_W, 0, (i + 1) * SRC_W, sheet.height))
    a = np.array(src)[..., 3] > 40
    ground = int(np.nonzero(a.any(axis=1))[0][-1])
    dx = body_shift(ref, a) if ref is not None else 0
    small = src.convert('RGBa').resize((round(src.width * K), round(src.height * K)), Image.LANCZOS).convert('RGBA')
    out = Image.new('RGBA', (FW, FH), (0, 0, 0, 0))
    out.alpha_composite(small, (round(FOOT_X - (SRC_W / 2 - dx) * K), round(FOOT_Y - ground * K)))
    return out


def alpha_of(sheet: Image.Image, i: int) -> np.ndarray:
    return np.array(sheet.crop((i * SRC_W, 0, (i + 1) * SRC_W, sheet.height)))[..., 3] > 40


def main() -> None:
    args = sys.argv[1:]
    npc = '--npc' in args
    idle_out = args[args.index('--idle') + 1] if '--idle' in args else None
    folder, cid, out_path = [a for a in args if not a.startswith('--') and a != idle_out][:3]
    rows = []
    for d in ('front', 'back', 'left'):
        sheet = Image.open(f'{folder}/{cid}_walk_{d}.png').convert('RGBA')
        ref = alpha_of(sheet, 0)
        stand, right_fwd, left_fwd = pose(sheet, 0), pose(sheet, 1, ref), pose(sheet, 2, ref)
        rows.append([right_fwd, stand, left_fwd, stand] + ([] if npc else [stand]))
    rows.append([f.transpose(Image.FLIP_LEFT_RIGHT) for f in rows[2]])
    cols = len(rows[0])
    out = Image.new('RGBA', (FW * cols, FH * 4), (0, 0, 0, 0))
    for r, frames in enumerate(rows):
        for c, f in enumerate(frames):
            out.alpha_composite(f, (c * FW, r * FH))
    out.save(out_path, optimize=True)
    if idle_out:
        rows[0][1].save(idle_out, optimize=True)


if __name__ == '__main__':
    main()
