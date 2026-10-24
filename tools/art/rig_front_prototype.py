"""試作（2026-10-24）：正面の立ち姿を部品（体・左右の太もも・すね〔ブーツ〕・左右の腕）に分け、歩き・走りのコマを作る。
正面では足が前後（画面の奥・手前）に動くので、関節を回すのではなく、
前に出た足は少し下・少し大きく、後ろの足は少し上・少し小さく、持ち上げた足は太ももを縮めてブーツを上げて見せる。
ゲームにはまだ入れていない。python3 -I tools/art/rig_front_prototype.py <正面の立ち姿> <出力フォルダ>
"""
import math
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

SRC, OUT = sys.argv[1], Path(sys.argv[2])
OUT.mkdir(parents=True, exist_ok=True)
im = Image.open(SRC).convert('RGBA')
W, H = im.size
arr = np.array(im)
alpha = arr[..., 3] > 40
Y = np.arange(H)[:, None]
X = np.arange(W)[None, :]


def poly(points) -> np.ndarray:
    m = Image.new('L', (W, H), 0)
    ImageDraw.Draw(m).polygon(points, fill=255)
    return np.array(m) > 0


def part(mask: np.ndarray) -> Image.Image:
    a = arr.copy()
    a[..., 3] = np.where(mask, a[..., 3], 0)
    return Image.fromarray(a)


rgb = arr[..., :3].astype(int)
mx, mn = rgb.max(-1), rgb.min(-1)
dark_gray = (mx < 110) & ((mx - mn) < 40)

# ── 足（画面の左＝主人公の右足、画面の右＝左足）。ひざ（ブーツの上）で太ももとすねに分ける ──
KNEE_Y = 945
HIP_Y = 735
LEG_L = poly([(470, 700), (622, 700), (622, 1215), (430, 1215), (430, 950), (470, 940)])
LEG_R = poly([(622, 700), (790, 700), (820, 940), (820, 1215), (622, 1215)])
leg_zone = (Y >= 935) | (dark_gray & (Y >= 700))
legL = alpha & LEG_L & leg_zone
legR = alpha & LEG_R & leg_zone
thighL, shinL = legL & (Y < KNEE_Y + 8), legL & (Y >= KNEE_Y - 8)
thighR, shinR = legR & (Y < KNEE_Y + 8), legR & (Y >= KNEE_Y - 8)

# ── 腕（そで＋手袋）。肩で回す ──
ARM_L = poly([(362, 385), (462, 385), (466, 600), (478, 640), (478, 785), (366, 785), (360, 640), (364, 600)])
ARM_R = poly([(792, 385), (885, 385), (890, 600), (885, 640), (885, 785), (775, 785), (775, 640), (790, 600)])
armL = alpha & ARM_L
armR = alpha & ARM_R
SH_L = (425.0, 410.0)
SH_R = (835.0, 410.0)

removed = legL | legR | armL | armR
torso = arr.copy()
torso[..., 3] = np.where(removed, 0, torso[..., 3])
TORSO = Image.fromarray(torso)


def thigh_part(mask: np.ndarray) -> Image.Image:
    """太もも。上の端を上へ伸ばしておく（足が下がったとき、シャツのすその下にすき間が出ないように）"""
    p = np.array(part(mask))
    ys = np.nonzero(mask.any(axis=1))[0]
    top = int(ys[0]) + 4
    for y in range(top - 60, top):
        p[y] = p[top]
    # 下の端も少し下へ伸ばす（ひざを曲げてブーツが離れたとき、ひざにすき間が出ないように。ブーツが上に重なる）
    bottom = int(ys[-1]) - 10
    for y in range(bottom + 1, min(H, bottom + 30)):
        p[y] = p[bottom]
    return Image.fromarray(p)


TL, SL = thigh_part(thighL), part(shinL)
TR, SR = thigh_part(thighR), part(shinR)
AL, AR = part(armL), part(armR)


def scale_about(p: Image.Image, cx: float, cy: float, sx: float, sy: float, dx=0.0, dy=0.0) -> Image.Image:
    """(cx, cy) を中心に (sx, sy) 倍して (dx, dy) ずらす"""
    coeffs = (1 / sx, 0, cx - (cx + dx) / sx, 0, 1 / sy, cy - (cy + dy) / sy)
    return p.transform(p.size, Image.AFFINE, coeffs, resample=Image.BICUBIC)


def rotate_about(p: Image.Image, cx: float, cy: float, deg: float, dx=0.0, dy=0.0) -> Image.Image:
    return p.rotate(deg, resample=Image.BICUBIC, center=(cx, cy), translate=(dx, dy))


def leg(thigh: Image.Image, shin: Image.Image, cx: float, depth: float, lift: float) -> Image.Image:
    """depth：+1 前（手前）〜 −1 後ろ（奥）。lift：0〜1 ひざを持ち上げる量"""
    s = 1 + 0.06 * depth           # 手前は大きく
    foot_dy = 44 * depth           # 手前は下へ
    th_sy = s * (1 - 0.38 * lift)  # 持ち上げると太ももが縮んで見える
    th = scale_about(thigh, cx, HIP_Y, s, th_sy)
    knee_y = HIP_Y + (KNEE_Y - HIP_Y) * th_sy
    sh = scale_about(shin, cx, KNEE_Y, s, s * (1 - 0.06 * lift), 0, knee_y - KNEE_Y + foot_dy * (1 - lift) - 70 * lift)
    th = scale_about(th, cx, HIP_Y, 1, 1, 0, foot_dy * 0.35 * (1 - lift))
    out = Image.new('RGBA', (W, H))
    out.alpha_composite(th)
    out.alpha_composite(sh)
    return out


def arm(p: Image.Image, sh, swing: float, side: int, amp: float) -> Image.Image:
    """swing：+1 前（手前）〜 −1 後ろ。前に振った手は少し下・内側・大きく、後ろは少し上・外側・小さく"""
    deg = side * 9 * swing * amp     # 画面の左の腕は前に振ると右回り（内側）
    s = 1 + 0.06 * swing * amp
    q = scale_about(p, sh[0], sh[1], s, s * (1 - 0.10 * max(0.0, -swing) * amp), 0, 14 * swing * amp)
    return rotate_about(q, sh[0], sh[1], -deg, 0, 0)


GROUND = float(np.nonzero(alpha.any(axis=1))[0][-1])
CX_L, CX_R = 540.0, 705.0


def frame(phase: float, run: bool) -> Image.Image:
    """phase 0＝画面の左の足（主人公の右足）が前に着く、0.5＝画面の右の足が前に着く"""
    w = 2 * math.pi * phase
    amp = 1.9 if run else 1.0
    dL = math.cos(w)
    dR = -dL
    # 前へ運んでいる足（後ろ→前の間）はひざを上げる
    liftL = max(0.0, -math.sin(w)) ** 1.3 * (1.0 if run else 0.7)
    liftR = max(0.0, math.sin(w)) ** 1.3 * (1.0 if run else 0.7)
    legL_img = leg(TL, SL, CX_L, dL * min(amp, 1.4), liftL)
    legR_img = leg(TR, SR, CX_R, dR * min(amp, 1.4), liftR)
    # 腕は足と反対（画面の左の足が前なら、画面の右の腕が前）
    armL_img = arm(AL, SH_L, dR, +1, amp)
    armR_img = arm(AR, SH_R, dL, -1, amp)
    fig = Image.new('RGBA', (W, H))
    # 奥の足を先に描く
    for img, d in sorted(((legL_img, dL), (legR_img, dR)), key=lambda t: t[1]):
        fig.alpha_composite(img)
    # 体：足がそろう（持ち上げている）ときに少し上がる。走りは浮く
    bob = -10 * abs(math.sin(w)) if not run else -34 * abs(math.sin(w)) + 10
    body = Image.new('RGBA', (W, H))
    body.alpha_composite(TORSO)
    # 腕は体の前（手前の腕）か後ろ（奥の腕）か：前に振っている腕を前に
    back_arms = [a for a, s in ((armL_img, dR), (armR_img, dL)) if s < 0]
    front_arms = [a for a, s in ((armL_img, dR), (armR_img, dL)) if s >= 0]
    upper = Image.new('RGBA', (W, H))
    for a in back_arms:
        upper.alpha_composite(a)
    upper.alpha_composite(body)
    for a in front_arms:
        upper.alpha_composite(a)
    # 走り：上半身を少し前に（正面では少し縮めて見せる）
    if run:
        upper = scale_about(upper, W / 2, HIP_Y, 1.0, 0.975)
    sway = 7 * math.cos(w) * (0.6 if run else 1.0)
    fig.alpha_composite(upper, (int(round(-sway)), int(round(bob * 0.6))))
    if run:
        fig = scale_about(fig, W / 2, GROUND, 1, 1, 0, bob)
    return fig


if __name__ == '__main__':
    TORSO.save(OUT / 'part_torso.png')
    N = 32
    for kind, run in (('walk', False), ('run', True)):
        for i in range(N):
            frame(i / N, run).save(OUT / f'{kind}_{i:02d}.png')
    print('ok')
