# -*- coding: utf-8 -*-
"""大人の人物の歩く絵（2026-10-23 納品）を、ゲーム用のシートにする

届く絵（1人につき3枚。docs/design/characters-adult-20261022/ の依頼どおり）:
  {ID}_walk_front.png / {ID}_walk_back.png / {ID}_walk_left.png
  1536×1024 に 512×1024 の枠が3つ。左から「立つ・右足を前・左足を前」。足元は枠の y≈940、背の高さ約860
  （男性主人公〔2026-10-23 の別便〕は背の高さ約944・足元 y≈972。人ごとに正面の「立つ」の背の高さで縮める倍率を決める）

作るもの（1コマ 216×288、足元 (108, 270)、人物の高さ約250。行は 正面・背中・左・右）:
  - 主人公：5列（右足を前・立つ・左足を前・立つ・立ち止まり）＝ 1080×1152
  - NPC   ：4列（右足を前・立つ・左足を前・立つ）＝ 864×1152（2列目が待機の絵）
  - 主人公の選択画面の立ち絵：正面の「立つ」1コマ（216×288）
  右向きは左向きの左右反転。絵は描き直さない（縮小と位置合わせだけ）

使い方:
  python3 tools/art/adult_walk_build.py 届いた絵のフォルダ ID 出力.png [--npc] [--idle 立ち絵の出力.png] [--scale 倍率]

--scale：コマの大きさの倍率（2026-10-23 追加）。1.5 なら 1コマ 324×432・足元 (162, 405)。並び・位置の割合は同じなので、
  ゲームはそのまま読める。人物を大きく表示してもぼやけないように、ゲームのシートは 1.5 で作る（出力は .webp）
"""
import sys

import numpy as np
from PIL import Image
from scipy import ndimage

FW, FH = 216, 288
FOOT_X, FOOT_Y = 108, 270
FIGURE_H = 250          # ゲームのコマでの人物の高さ（いまの人物と同じ）
SRC_W = 512             # 届いた絵の1ポーズの枠の幅
WIN_W = 1024            # 1ポーズを切り出す幅（枠からのはみ出しも入る広さ）


def split_poses(sheet: Image.Image) -> list[Image.Image]:
    """1枚の歩きの絵を3ポーズに分ける。枠（512 幅）からはみ出した靴の先などもその人のポーズに入れ、
    となりのポーズのはみ出しは入れない（つながった形ごとに、近い枠のポーズへ）。
    返すのは、枠の真ん中を中心にした 1024 幅の絵（はみ出しも入る広さ）"""
    a = np.array(sheet)[..., 3] > 40
    lab, n = ndimage.label(ndimage.binary_dilation(a, iterations=3))
    owner = np.zeros(n + 1, dtype=int)
    for i, sl in enumerate(ndimage.find_objects(lab), start=1):
        ys, xs = np.nonzero(lab[sl] == i)
        cx = xs.mean() + sl[1].start
        owner[i] = min(2, int(cx // SRC_W))
    out = []
    rgba = np.array(sheet)
    for p in range(3):
        mask = (owner[lab] == p) & (lab > 0)
        piece = rgba.copy()
        piece[..., 3] = np.where(mask, piece[..., 3], 0)
        cx = p * SRC_W + SRC_W // 2
        win = Image.new('RGBA', (WIN_W, sheet.height), (0, 0, 0, 0))
        win.alpha_composite(Image.fromarray(piece).crop((cx - WIN_W // 2, 0, cx + WIN_W // 2, sheet.height)))
        out.append(win)
    return out


def alpha(im: Image.Image) -> np.ndarray:
    return np.array(im)[..., 3] > 40


def body_band(a: np.ndarray) -> slice:
    """上半身（頭の下〜腰）の行"""
    ys = np.nonzero(a.any(axis=1))[0]
    top, bottom = int(ys[0]), int(ys[-1])
    return slice(top + int((bottom - top) * 0.15), top + int((bottom - top) * 0.50))


def body_center(a: np.ndarray) -> float:
    """上半身の横の真ん中"""
    xs = np.nonzero(a[body_band(a)])[1]
    return float(xs.mean())


def body_shift(ref: np.ndarray, a: np.ndarray) -> int:
    """a を横に何 px ずらすと、上半身が ref と一番重なるか。
    足を出したポーズは体が枠の真ん中からずれて描かれていることがあり、そのままだと歩くたびに体が左右にぶれる"""
    band = body_band(ref)
    r, m = ref[band], a[band]
    best, best_dx = -1, 0
    for dx in range(-240, 241, 2):
        score = int((r & np.roll(m, dx, axis=1)).sum())
        if score > best:
            best, best_dx = score, dx
    return best_dx


def place(win: Image.Image, anchor_x: float, k: float) -> Image.Image:
    """ポーズを 216×288 のコマに。足元（いちばん下の不透明な行）を y=270、上半身の真ん中（anchor_x）を x=108 に"""
    ground = int(np.nonzero(alpha(win).any(axis=1))[0][-1])
    small = win.convert('RGBa').resize((round(win.width * k), round(win.height * k)), Image.LANCZOS).convert('RGBA')
    out = Image.new('RGBA', (FW, FH), (0, 0, 0, 0))
    out.alpha_composite(small, (round(FOOT_X - anchor_x * k), round(FOOT_Y - ground * k)))
    return out


def poses(sheet: Image.Image, k: float) -> list[Image.Image]:
    """立つ・右足を前・左足を前 の3コマ。足を出した2つは、上半身が「立つ」と重なる位置に"""
    wins = split_poses(sheet)
    ref = alpha(wins[0])
    cx = body_center(ref)
    return [place(wins[0], cx, k)] + [place(w, cx - body_shift(ref, alpha(w)), k) for w in wins[1:]]


def figure_height(sheet: Image.Image) -> int:
    """正面の「立つ」ポーズの人物の高さ（頭のてっぺん〜足元）"""
    ys = np.nonzero(alpha(split_poses(sheet)[0]).any(axis=1))[0]
    return int(ys[-1] - ys[0])


def main() -> None:
    args = sys.argv[1:]
    npc = '--npc' in args
    idle_out = args[args.index('--idle') + 1] if '--idle' in args else None
    scale_arg = args[args.index('--scale') + 1] if '--scale' in args else None
    if scale_arg:
        global FW, FH, FOOT_X, FOOT_Y, FIGURE_H
        sc = float(scale_arg)
        FW, FH, FOOT_X, FOOT_Y, FIGURE_H = (round(v * sc) for v in (FW, FH, FOOT_X, FOOT_Y, FIGURE_H))
    folder, cid, out_path = [a for a in args if not a.startswith('--') and a not in (idle_out, scale_arg)][:3]
    rows = []
    k = FIGURE_H / figure_height(Image.open(f'{folder}/{cid}_walk_front.png').convert('RGBA'))
    for d in ('front', 'back', 'left'):
        sheet = Image.open(f'{folder}/{cid}_walk_{d}.png').convert('RGBA')
        stand, right_fwd, left_fwd = poses(sheet, k)
        rows.append([right_fwd, stand, left_fwd, stand] + ([] if npc else [stand]))
    rows.append([f.transpose(Image.FLIP_LEFT_RIGHT) for f in rows[2]])
    cols = len(rows[0])
    out = Image.new('RGBA', (FW * cols, FH * 4), (0, 0, 0, 0))
    for r, frames in enumerate(rows):
        for c, f in enumerate(frames):
            out.alpha_composite(f, (c * FW, r * FH))
    if out_path.endswith('.webp'):
        out.save(out_path, quality=92, method=6)
    else:
        out.save(out_path, optimize=True)
    if idle_out:
        rows[0][1].save(idle_out, optimize=True)


if __name__ == '__main__':
    main()
