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

--scale：コマの大きさの倍率（2026-10-23 追加）。1.25 なら 1コマ 270×360・足元 (135, 338)。並び・位置の割合は同じなので、
  ゲームはそのまま読める。人物を大きく表示してもぼやけないように、ゲームのシートは 1.25 で作る（出力は .webp）。
  1.5 も試したが、iPhone で絵が大きすぎて歩くときにコマが飛んだ（2026-10-23）
--tone：大人向けの色の落ち着かせ（彩度 0.72・明るさ 0.94・コントラスト 1.06）を絵に焼き込む（2026-10-23 追加）。
  それまでは CSS の filter で毎回計算していて、歩くたびに描き直しが重くなっていた
--diag：斜め向きの4行を足す（主人公だけ。2026-10-23 追加）。行は 正面・背中・左・右・左下・右下・左上・右上 の8行になる。
  届く絵は1枚に1ポーズ：{ID}_{downleft,upleft}_{stand,rightfoot,leftfoot}.png（1024×1024 か 1254×1254）。
  絵ごとに大きさが違うので、1枚ずつ背の高さ（頭のてっぺん〜足元）を FIGURE_H にそろえる。右下・右上は左下・左上の左右反転
--outline N：人物のまわりに N px の暗い輪郭を付ける（2026-10-23 追加）。背景の描き込みが強い街・部屋で人物が埋もれないように。
  同じ日に --tone（色を落ち着かせる）はやめた（背景を描き直して色の調整を外したので、人物だけがくすんで見えたため）
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


def diag_poses(folder: str, cid: str, d: str) -> list[Image.Image]:
    """斜め向き（d＝downleft / upleft）の 立つ・右足を前・左足を前 の3コマ。
    1枚ずつ背の高さを FIGURE_H にそろえ、足を出した2つは上半身が「立つ」と重なる位置に"""
    ims = [Image.open(f'{folder}/{cid}_{d}_{p}.png').convert('RGBA') for p in ('stand', 'rightfoot', 'leftfoot')]
    heights = []
    for im in ims:
        ys = np.nonzero(alpha(im).any(axis=1))[0]
        heights.append(int(ys[-1] - ys[0]))
    # 上半身の重なりは、背の高さをそろえた（REF_H）大きさの形で比べる
    REF_H = 860
    norm = [REF_H / hh for hh in heights]
    masks = [np.array(Image.fromarray(alpha(im)).resize((round(im.width * n), round(im.height * n)), Image.NEAREST)) for im, n in zip(ims, norm)]
    w = max(m.shape[1] for m in masks)
    hh = max(m.shape[0] for m in masks)
    padded = [np.pad(m, ((0, hh - m.shape[0]), (0, w - m.shape[1]))) for m in masks]
    cx = body_center(padded[0])
    out = []
    for i, (im, n) in enumerate(zip(ims, norm)):
        anchor = cx if i == 0 else cx - body_shift(padded[0], padded[i])
        out.append(place(im, anchor / n, FIGURE_H / heights[i]))
    return out


def figure_height(sheet: Image.Image) -> int:
    """正面の「立つ」ポーズの人物の高さ（頭のてっぺん〜足元）"""
    ys = np.nonzero(alpha(split_poses(sheet)[0]).any(axis=1))[0]
    return int(ys[-1] - ys[0])


def tone(im: Image.Image) -> Image.Image:
    """CSS の filter: saturate(0.72) brightness(0.94) contrast(1.06) と同じ計算（sRGB のまま）"""
    a = np.asarray(im).astype(np.float64) / 255
    rgb, al = a[..., :3], a[..., 3:]
    s = 0.72
    m = np.array([
        [0.213 + 0.787 * s, 0.715 - 0.715 * s, 0.072 - 0.072 * s],
        [0.213 - 0.213 * s, 0.715 + 0.285 * s, 0.072 - 0.072 * s],
        [0.213 - 0.213 * s, 0.715 - 0.715 * s, 0.072 + 0.928 * s],
    ])
    rgb = np.clip(rgb @ m.T, 0, 1)
    rgb = np.clip(rgb * 0.94, 0, 1)
    rgb = np.clip((rgb - 0.5) * 1.06 + 0.5, 0, 1)
    out = np.concatenate([rgb, al], axis=-1)
    return Image.fromarray(np.round(out * 255).astype(np.uint8), 'RGBA')


def outline(im: Image.Image, width: int) -> Image.Image:
    """人物のまわりに暗い輪郭（こげ茶、少し透ける）を付ける。絵そのものは変えず、後ろに輪郭を敷く"""
    a = np.asarray(im)[..., 3] > 40
    yy, xx = np.mgrid[-width:width + 1, -width:width + 1]
    disk = (xx * xx + yy * yy) <= width * width + 0.5
    grown = ndimage.binary_dilation(a, structure=disk)
    soft = ndimage.gaussian_filter(grown.astype(np.float64), 0.6)
    layer = np.zeros((*a.shape, 4), dtype=np.uint8)
    layer[..., 0], layer[..., 1], layer[..., 2] = 34, 22, 14
    layer[..., 3] = np.clip(soft * 215, 0, 255).astype(np.uint8)
    base = Image.fromarray(layer, 'RGBA')
    base.alpha_composite(im)
    return base


def main() -> None:
    args = sys.argv[1:]
    npc = '--npc' in args
    idle_out = args[args.index('--idle') + 1] if '--idle' in args else None
    scale_arg = args[args.index('--scale') + 1] if '--scale' in args else None
    outline_arg = args[args.index('--outline') + 1] if '--outline' in args else None
    if scale_arg:
        global FW, FH, FOOT_X, FOOT_Y, FIGURE_H
        sc = float(scale_arg)
        FW, FH, FOOT_X, FOOT_Y, FIGURE_H = (round(v * sc) for v in (FW, FH, FOOT_X, FOOT_Y, FIGURE_H))
    folder, cid, out_path = [a for a in args if not a.startswith('--') and a not in (idle_out, scale_arg, outline_arg)][:3]
    rows = []
    k = FIGURE_H / figure_height(Image.open(f'{folder}/{cid}_walk_front.png').convert('RGBA'))
    for d in ('front', 'back', 'left'):
        sheet = Image.open(f'{folder}/{cid}_walk_{d}.png').convert('RGBA')
        stand, right_fwd, left_fwd = poses(sheet, k)
        rows.append([right_fwd, stand, left_fwd, stand] + ([] if npc else [stand]))
    rows.append([f.transpose(Image.FLIP_LEFT_RIGHT) for f in rows[2]])
    if '--diag' in args:
        for d in ('downleft', 'upleft'):
            stand, right_fwd, left_fwd = diag_poses(folder, cid, d)
            row = [right_fwd, stand, left_fwd, stand] + ([] if npc else [stand])
            rows.append(row)
            rows.append([f.transpose(Image.FLIP_LEFT_RIGHT) for f in row])
    cols = len(rows[0])
    out = Image.new('RGBA', (FW * cols, FH * len(rows)), (0, 0, 0, 0))
    for r, frames in enumerate(rows):
        for c, f in enumerate(frames):
            out.alpha_composite(f, (c * FW, r * FH))
    if '--tone' in args:
        out = tone(out)
    if outline_arg:
        out = outline(out, int(outline_arg))
    if out_path.endswith('.webp'):
        out.save(out_path, quality=92, method=6)
    else:
        out.save(out_path, optimize=True)
    if idle_out:
        rows[0][1].save(idle_out, optimize=True)


if __name__ == '__main__':
    main()
