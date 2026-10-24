"""後ろ向きの歩き2枚目（左足の1歩）を1枚目（右足の1歩）から作る（2026-10-24）。
腰（コートの途中）より下だけ左右反転する。コート・ズボン・ブーツは左右ほぼ対称なので、足だけ入れ替わる。
画像AIの2枚目が1枚目とほぼ同じ絵になったための代わり。
python3 -I tools/art/back_walk_mirror_legs.py <1枚目> <出力> [切れ目の高さ 0.66]
"""
import sys
import numpy as np
from PIL import Image
from scipy import ndimage
src, dst = sys.argv[1], sys.argv[2]
CUT = float(sys.argv[3]) if len(sys.argv) > 3 else 0.62
im = np.array(Image.open(src).convert('RGBA'))
H = im.shape[0]
out = np.zeros_like(im)
for i in range(4):
    x0, x1 = i * 384, (i + 1) * 384
    s = im[:, x0:x1]
    a = s[..., 3] > 40
    lab, n = ndimage.label(a)
    sizes = ndimage.sum(a, lab, range(1, n + 1))
    keep = lab == (1 + int(np.argmax(sizes)))
    ys = np.nonzero(keep.any(1))[0]
    top, bot = ys[0], ys[-1]
    h = bot - top
    cut = int(top + CUT * h)
    # 切れ目付近の形が一番左右対称になる軸を探す
    band = a[cut - 10:cut + 10].astype(np.float32)
    best, cx = -1, 192.0
    for c2 in range(200, 568):  # 2*cx
        xs = np.arange(384)
        xm = c2 - xs
        ok = (xm >= 0) & (xm < 384)
        mir = np.zeros_like(band)
        mir[:, ok] = band[:, xm[ok]]
        score = (band * mir).sum() / max(1, band.sum() + mir.sum())
        if score > best:
            best, cx = score, c2 / 2
    mir = np.zeros_like(s)
    for x in range(384):
        xm = int(round(2 * cx - x))
        if 0 <= xm < 384:
            mir[:, x] = s[:, xm]
    # 切れ目の前後 BL px をなめらかに切り替える
    BL = 24
    w = np.clip((np.arange(H) - (cut - BL / 2)) / BL, 0, 1)[:, None, None]
    res = s.astype(np.float32) * (1 - w) + mir.astype(np.float32) * w
    out[:, x0:x1] = np.clip(res, 0, 255).astype(np.uint8)
    print(i, 'cx', cx, 'cut', cut, 'sym', round(best, 3))
Image.fromarray(out).save(dst)
