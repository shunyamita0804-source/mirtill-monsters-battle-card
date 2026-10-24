"""後ろ向きの歩き2枚目（左足の1歩）を1枚目（右足の1歩）から作る（2026-10-24。画像AIの2枚目が1枚目とほぼ同じ絵だったための代わり）。
コート（青・金のふち・その輪郭）・手・かばんは元の位置のまま残し、ズボンとブーツだけを股の中心で左右反転して、コートの後ろに描く。
python3 -I tools/art/back_walk_swap_legs.py <1枚目> <出力> [切れ目 0.60]
"""
import sys
import numpy as np
from PIL import Image
from scipy import ndimage

src, dst = sys.argv[1], sys.argv[2]
CUT = float(sys.argv[3]) if len(sys.argv) > 3 else 0.60
im = np.array(Image.open(src).convert('RGBA')).astype(np.float32)
H = im.shape[0]
YY = np.arange(H)[:, None]


def over(d, s):
    sa = s[..., 3:4] / 255
    da = d[..., 3:4] / 255
    oa = sa + da * (1 - sa)
    rgb = (s[..., :3] * sa + d[..., :3] * da * (1 - sa)) / np.maximum(oa, 1e-6)
    return np.concatenate([rgb, oa * 255], -1)


out = np.zeros_like(im)
masks = []
for i in range(4):
    x0, x1 = i * 384, (i + 1) * 384
    s = im[:, x0:x1]
    a = s[..., 3] > 30
    lab, n = ndimage.label(a)
    sizes = ndimage.sum(a, lab, range(1, n + 1))
    a = lab == (1 + int(np.argmax(sizes)))
    ys = np.nonzero(a.any(1))[0]
    top, bot = ys[0], ys[-1]
    h = bot - top
    cut = int(top + CUT * h)
    r, g, b = s[..., 0], s[..., 1], s[..., 2]
    mx = np.maximum(np.maximum(r, g), b)
    blue = a & (b > r + 20) & (b > g + 5)
    gold = a & (r > 150) & (g > 95) & (r - b > 70)
    near_blue = ndimage.binary_dilation(blue, iterations=5)
    glab, gn = ndimage.label(gold)
    coat_gold = np.zeros_like(gold)
    for k in range(1, gn + 1):
        c = glab == k
        if (c & near_blue).sum() >= 0.3 * c.sum():
            coat_gold |= c
    coat = blue | coat_gold
    dark = a & (mx < 90)
    coat |= dark & ndimage.binary_dilation(coat, iterations=4)
    coat = ndimage.binary_closing(coat, iterations=2) & a
    # 足＝切れ目より下の「コート以外」のうち、いちばん下（ブーツ）までつながっている部分
    cand = a & ~coat & (YY >= cut)
    lab2, n2 = ndimage.label(cand)
    legs = np.zeros_like(cand)
    for k in range(1, n2 + 1):
        c = lab2 == k
        if c[int(bot - 0.12 * h):].any():
            legs |= c
    # 股の中心：切れ目のすぐ下の足の左右の端の真ん中
    xs = np.nonzero(legs[cut:cut + 12].any(0))[0]
    cx = (xs[0] + xs[-1]) / 2
    leg_img = s.copy()
    leg_img[..., 3] = np.where(legs, s[..., 3], 0)
    mir = np.zeros_like(leg_img)
    for x in range(384):
        xm = int(round(2 * cx - x))
        if 0 <= xm < 384:
            mir[:, x] = leg_img[:, xm]
    rest = s.copy()
    rest[..., 3] = np.where(legs | ~a, 0, s[..., 3])
    res = over(mir, rest)
    # 反転で取り残された小さなかけらを消す
    ra = res[..., 3] > 30
    lab3, n3 = ndimage.label(ra)
    sz = ndimage.sum(ra, lab3, range(1, n3 + 1))
    big = lab3 == (1 + int(np.argmax(sz)))
    res[..., 3] = np.where(ndimage.binary_dilation(big, iterations=2), res[..., 3], 0)
    out[:, x0:x1] = res
    masks.append((coat, legs))
    print(i, 'cx', cx, 'cut', cut)
Image.fromarray(np.clip(out, 0, 255).astype(np.uint8)).save(dst)
# 確認用：コート＝青、足＝赤
dbg = np.zeros((H, 1536, 3), np.uint8)
for i, (c, l) in enumerate(masks):
    dbg[:, i * 384:(i + 1) * 384][c] = (60, 90, 220)
    dbg[:, i * 384:(i + 1) * 384][l] = (220, 60, 60)
Image.fromarray(dbg).save(dst.replace('.png', '_mask.png'))
