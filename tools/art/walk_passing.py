# -*- coding: utf-8 -*-
"""横向きの歩行に「足がそろう（交差する）」コマを足す（応急処置。描き直しの絵が届くまで）

届いた横向きの4コマは、どれも足を前後に開いた同じ形で、足が動いて見えない。
コートやスカートのすそより下（足の部分）だけ、両足を体の真ん中へ少しずつ寄せて「足がそろう形」を作る。
靴の形は変えず、横にずらすだけ（下へ行くほど大きくずらす）。

使い方: python3 tools/art/walk_passing.py 歩行シート.png 待機の絵のフォルダの接頭辞 出力.png
  出力は 5列×4行（1〜4列目＝歩き：開く→そろう→開く→そろう、5列目＝立ち止まり）
  正面・背中は届いた4コマのまま。横向き（3・4行目）だけ「開く・そろう」を交互にする
"""
import sys
import numpy as np
from PIL import Image

FW, FH = 216, 288


def foot_range(a: np.ndarray) -> tuple[int, int]:
    al = a[..., 3] > 40
    rows = np.nonzero(al.any(axis=1))[0]
    return int(rows[0]), int(rows[-1])


def hem_row(a: np.ndarray) -> int:
    """すその高さ：下半分で、不透明な幅がいちばん狭くなる直前（足のつけ根）の行"""
    al = a[..., 3] > 40
    top, bottom = foot_range(a)
    widths = al.sum(axis=1)
    lo = top + int((bottom - top) * 0.70)
    hi = bottom - 18
    # すその下は足2本ぶんの細い幅になる。幅がいちばん小さい行の少し上をすそとする
    y_min = lo + int(np.argmin(widths[lo:hi]))
    return max(lo, y_min - 6)


def passing(frame: Image.Image, facing: str) -> Image.Image:
    a = np.array(frame.convert('RGBA'))
    al = a[..., 3] > 40
    hem = hem_row(a)
    _, ground = foot_range(a)
    legs = al[hem:ground + 1]
    xs = np.nonzero(legs.any(axis=0))[0]
    cx = (xs[0] + xs[-1]) / 2
    spread = (xs[-1] - xs[0]) / 2
    out = a.copy()
    out[hem:] = 0
    left = np.zeros_like(a)
    right = np.zeros_like(a)
    for y in range(hem, FH):
        t = min(1.0, max(0.0, (y - hem) / max(1, ground - hem)))
        shift = int(round(spread * 0.55 * t ** 1.1))
        row = a[y]
        for x in range(FW):
            if row[x, 3] == 0:
                continue
            if x < cx:
                nx = min(FW - 1, x + shift)
                left[y, nx] = row[x]
            else:
                nx = max(0, x - shift)
                right[y, nx] = row[x]
    # 進む向きの側の足を手前に描く
    first, second = (right, left) if facing == 'left' else (left, right)
    img = Image.fromarray(out)
    img.alpha_composite(Image.fromarray(first))
    img.alpha_composite(Image.fromarray(second))
    # すそより上（体）は元のまま上に重ねる（足のずれがすそに食い込まないように）
    body = a.copy()
    body[hem:] = 0
    img.alpha_composite(Image.fromarray(body))
    return img


def main() -> None:
    sheet_path, idle_prefix, out_path = sys.argv[1:4]
    sheet = Image.open(sheet_path).convert('RGBA')
    out = Image.new('RGBA', (FW * 5, FH * 4), (0, 0, 0, 0))
    for row, d in enumerate(['front', 'back', 'left', 'right']):
        frames = [sheet.crop((c * FW, row * FH, (c + 1) * FW, (row + 1) * FH)) for c in range(4)]
        if d in ('left', 'right'):
            frames = [frames[0], passing(frames[1], d), frames[2], passing(frames[3], d)]
        for c, f in enumerate(frames):
            out.alpha_composite(f, (c * FW, row * FH))
        out.alpha_composite(Image.open(f'{idle_prefix}{d}.png').convert('RGBA'), (4 * FW, row * FH))
    out.save(out_path, optimize=True)


if __name__ == '__main__':
    main()
