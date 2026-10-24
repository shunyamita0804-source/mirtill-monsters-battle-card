"""試作（2026-10-24）：横向き（左向き）の立ち姿を部品（体・太もも・すね・二の腕・前腕）に分け、関節を回して歩き・走りのコマを作る。
部品に分けて動かす方法（ユーザー「画像を何枚も作るのではなく動かせないか」）が使えるかを見るための試作。ゲームにはまだ入れていない。
python3 -I tools/art/rig_side_prototype.py <左向きの立ち姿（左右に128pxの余白を足したもの）> <出力フォルダ>
"""
import math
import sys
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

SRC, OUT = sys.argv[1], Path(sys.argv[2])
OUT.mkdir(parents=True, exist_ok=True)

im = Image.open(SRC).convert('RGBA')
W, H = im.size
arr = np.array(im)
alpha = arr[..., 3] > 40
# となりのポーズのはみ出し（右下の靴のかけら）を消す：いちばん大きいかたまりだけ
from scipy import ndimage  # noqa: E402

lab, n = ndimage.label(ndimage.binary_dilation(alpha, iterations=2))
sizes = ndimage.sum(np.ones_like(lab), lab, range(1, n + 1))
keep = lab == (int(np.argmax(sizes)) + 1)
arr[~keep] = 0
alpha = arr[..., 3] > 40


def poly_mask(points) -> np.ndarray:
    m = Image.new('L', (W, H), 0)
    ImageDraw.Draw(m).polygon(points, fill=255)
    return np.array(m) > 0


rgb = arr[..., :3].astype(int)
r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
mx, mn = rgb.max(-1), rgb.min(-1)
dark_gray = (mx < 105) & ((mx - mn) < 38)  # ズボン（濃い灰色）と輪郭の黒

# ── 部品の範囲（このポーズの絵の座標） ──
# 手前の足：ズボン（腰〜ひざ）＋ブーツ。ひざ（ブーツの折り返しの上）で分ける
NEAR_LEG = poly_mask([(324, 540), (464, 520), (470, 735), (480, 760), (476, 962), (314, 962), (316, 880), (374, 862), (328, 740)])
leg_zone = (np.arange(H)[:, None] >= 720) | dark_gray
near_leg = alpha & NEAR_LEG & leg_zone
# ひざより上はズボンの色だけ（上着のすそ・手袋は体の部品に残す）
upper = np.arange(H)[:, None] < 728
near_leg &= ~upper | dark_gray
KNEE_Y = 738
thigh = near_leg & (np.arange(H)[:, None] < KNEE_Y + 6)
shin = near_leg & (np.arange(H)[:, None] >= KNEE_Y - 6)
HIP = (418.0, 548.0)
KNEE = (420.0, float(KNEE_Y))

# 奥の足の絵（ブーツ・ズボン）はすべて消す（手前の足を暗くして奥の足にする）
LEGS_ALL = poly_mask([(306, 520), (473, 520), (478, 735), (488, 760), (480, 966), (248, 966), (248, 860), (318, 720), (304, 600)])
legs_all = alpha & LEGS_ALL & leg_zone & ~(np.arange(H)[:, None] < 728) | (alpha & LEGS_ALL & dark_gray & (np.arange(H)[:, None] >= 560))

# 手前の腕：二の腕（袖）＋前腕＋手袋。ひじ（袖口）で分ける
NEAR_ARM = poly_mask([(394, 318), (473, 312), (512, 360), (518, 470), (504, 525), (508, 560), (504, 650), (458, 664), (410, 652), (414, 560), (426, 520), (432, 476), (404, 470), (390, 400)])
near_arm = alpha & NEAR_ARM
# 腕のまわりの輪郭の残り（黒い線）も腕に含める
near_arm = alpha & ndimage.binary_dilation(near_arm, iterations=4) & ndimage.binary_dilation(NEAR_ARM, iterations=6)
ELBOW_Y = 474
upper_arm = near_arm & (np.arange(H)[:, None] < ELBOW_Y + 6)
fore_arm = near_arm & (np.arange(H)[:, None] >= ELBOW_Y - 22)
SHOULDER = (450.0, 350.0)
ELBOW = (464.0, float(ELBOW_Y))
# 奥の腕（体の前に少し見えている袖口と手袋）は消す（手前の腕を暗くして奥の腕にする）。ベルトの飾りは残す
FAR_ARM = poly_mask([(278, 398), (333, 398), (336, 468), (314, 500), (306, 620), (256, 625), (240, 560), (268, 500), (278, 470)])
ornament = poly_mask([(278, 495), (306, 495), (310, 640), (276, 640)])
far_arm = np.zeros_like(alpha)


def part(mask: np.ndarray) -> Image.Image:
    a = arr.copy()
    a[..., 3] = np.where(mask, a[..., 3], 0)
    return Image.fromarray(a)


def darken(p: Image.Image, k: float = 0.62) -> Image.Image:
    a = np.array(p).astype(float)
    a[..., :3] *= k
    return Image.fromarray(a.clip(0, 255).astype(np.uint8))


# ── 体（頭・胴・上着のすそ）：足・腕を抜いた所を埋める ──
removed = legs_all | near_arm | far_arm
# 体の中（埋める所）：腕のうしろ（背中の線より前）・腰より下は上着のすその中だけ
body_inside = poly_mask([(308, 300), (470, 312), (466, 470), (460, 520), (608, 690), (568, 790), (458, 660), (428, 740), (308, 740), (278, 470)])
fill = removed & body_inside & ~legs_all
fill |= removed & body_inside & (np.arange(H)[:, None] < 560)
torso_rgba = arr.copy()
# 抜いた所は、まわりの服の模様をずらして写す（上着のすそは斜めの向き、上は横から）。残りだけ inpaint でなじませる
src_ok = alpha & ~removed
ys_, xs_ = np.nonzero(fill)
copied = np.zeros_like(fill)
for y, x in zip(ys_, xs_):
    offs = ((34, 34), (52, 52), (20, 20), (0, 48)) if y >= 500 else ((-46, 0), (-64, 0), (-30, 0), (0, -40))
    for dx, dy in offs:
        sx, sy = x + dx, y + dy
        if 0 <= sx < W and 0 <= sy < H and src_ok[sy, sx]:
            torso_rgba[y, x, :3] = arr[sy, sx, :3]
            copied[y, x] = True
            break
fill_rest = fill & ~copied
bgr = cv2.cvtColor(torso_rgba[..., :3], cv2.COLOR_RGB2BGR)
inp = cv2.inpaint(bgr, (ndimage.binary_dilation(fill_rest, iterations=2) * 255).astype(np.uint8), 9, cv2.INPAINT_NS)
torso_rgba[..., :3] = np.where(fill_rest[..., None], cv2.cvtColor(inp, cv2.COLOR_BGR2RGB), torso_rgba[..., :3])
# 写したところと元の境目を少しだけぼかす
soft = cv2.GaussianBlur(torso_rgba[..., :3], (5, 5), 0)
edge = ndimage.binary_dilation(fill, iterations=2) & ~ndimage.binary_erosion(fill, iterations=2)
torso_rgba[..., :3] = np.where(edge[..., None], soft, torso_rgba[..., :3])
torso_alpha = np.where(removed & ~fill, 0, torso_rgba[..., 3])
torso_alpha = np.where(fill, 255, torso_alpha)
torso_rgba[..., 3] = torso_alpha
TORSO = Image.fromarray(torso_rgba)

THIGH, SHIN = part(thigh), part(shin)
UPPER, FORE = part(upper_arm), part(fore_arm)


def affine(p: Image.Image, pivot, angle_deg: float, dx: float = 0.0, dy: float = 0.0) -> Image.Image:
    """pivot を中心に angle（正＝下向きの棒の先が左＝前へ）回して (dx, dy) ずらす"""
    t = math.radians(angle_deg)
    c, s = math.cos(t), math.sin(t)
    px, py = pivot
    # 出力 (X, Y) → 入力 (x, y)：p' = pivot + R (p - pivot) + d の逆
    # R = [[c, -s], [s, c]]（y 下向きの座標で、下向きの棒が左へ回る）
    X0, Y0 = px + dx, py + dy
    a, b_, d_ = c, s, -s
    e = c
    # 入力 = R^-1 (出力 - pivot - d) + pivot、R^-1 = [[c, s], [-s, c]]
    coeffs = (a, b_, px - a * X0 - b_ * Y0, d_, e, py - d_ * X0 - e * Y0)
    return p.transform(p.size, Image.AFFINE, coeffs, resample=Image.BICUBIC)


def rot(pt, pivot, angle_deg):
    t = math.radians(angle_deg)
    x, y = pt[0] - pivot[0], pt[1] - pivot[1]
    return (pivot[0] + math.cos(t) * x - math.sin(t) * y, pivot[1] + math.sin(t) * x + math.cos(t) * y)


def leg(hip_angle: float, knee_bend: float, shift=(0.0, 0.0)) -> tuple[Image.Image, float]:
    """太ももを腰で、すねをひざで回した手前の足（すねは太もも＋ひざの曲がり）。返す：絵と、足の裏のいちばん下の y"""
    th = affine(THIGH, HIP, hip_angle, *shift)
    knee = rot(KNEE, HIP, hip_angle)
    sh = affine(SHIN, KNEE, hip_angle - knee_bend, knee[0] - KNEE[0] + shift[0], knee[1] - KNEE[1] + shift[1])
    out = Image.new('RGBA', (W, H))
    out.alpha_composite(th)
    out.alpha_composite(sh)
    ys = np.nonzero(np.array(out)[..., 3].max(axis=1) > 40)[0]
    return out, float(ys[-1]) if len(ys) else 0.0


def arm(shoulder_angle: float, elbow_bend: float, shift=(0.0, 0.0)) -> Image.Image:
    up = affine(UPPER, SHOULDER, shoulder_angle, *shift)
    el = rot(ELBOW, SHOULDER, shoulder_angle)
    fo = affine(FORE, ELBOW, shoulder_angle + elbow_bend, el[0] - ELBOW[0] + shift[0], el[1] - ELBOW[1] + shift[1])
    out = Image.new('RGBA', (W, H))
    out.alpha_composite(fo)
    out.alpha_composite(up)
    return out


GROUND = float(np.nonzero(alpha.any(axis=1))[0][-1])


def frame(phase: float, run: bool) -> Image.Image:
    """phase 0〜1 の1コマ。0＝手前の足が前に着く、0.5＝奥の足が前に着く"""
    w = 2 * math.pi * phase
    if run:
        A, KB, KB0, AA, EB, lean = 30.0, 78.0, 16.0, 36.0, 62.0, 9.0
    else:
        A, KB, KB0, AA, EB, lean = 22.0, 48.0, 6.0, 20.0, 18.0, 2.0
    # 太もも：cos で前後。すね：前へ振り出す間（sin<0）にひざを曲げる
    hip_n = A * math.cos(w)
    hip_f = A * math.cos(w + math.pi)
    bend_n = KB0 + KB * max(0.0, -math.sin(w)) ** 1.3
    bend_f = KB0 + KB * max(0.0, math.sin(w)) ** 1.3
    if run:
        # 走り：後ろへけり出した足はかかとを高く
        bend_n += 18 * max(0.0, -math.cos(w)) ** 2
        bend_f += 18 * max(0.0, math.cos(w)) ** 2
    near_leg_img, near_bottom = leg(hip_n, bend_n)
    far_leg_img, far_bottom = leg(hip_f, bend_f, (-14.0, -4.0))
    # 腕は足と反対（手前の足が前なら手前の腕は後ろ）
    sh_n = -AA * math.cos(w)
    sh_f = -AA * math.cos(w + math.pi)
    el_n = EB + (12 if run else 10) * max(0.0, -math.cos(w))
    el_f = EB + (12 if run else 10) * max(0.0, math.cos(w))
    near_arm_img = arm(sh_n, el_n)
    far_leg_img = darken(far_leg_img, 0.66)
    # 足の裏が地面に着くように全体を上下させる（歩き）。走りは浮く時間を作る
    lowest = max(near_bottom, far_bottom - 4)
    dy = GROUND - lowest
    if run:
        dy -= 26 * abs(math.sin(w)) - 8
    fig = Image.new('RGBA', (W, H))
    for layer in (far_leg_img, near_leg_img):
        fig.alpha_composite(layer)
    fig.alpha_composite(TORSO)
    fig.alpha_composite(near_arm_img)
    if lean:
        fig = affine(fig, HIP, -lean * 0)  # 体の前傾きは下でまとめて
        fig = fig.rotate(lean, resample=Image.BICUBIC, center=HIP)
    out = Image.new('RGBA', (W, H))
    out.alpha_composite(fig, (0, int(round(dy))))
    return out


if __name__ == '__main__':
    TORSO.save(OUT / 'part_torso.png')
    for nm, p in (('thigh', THIGH), ('shin', SHIN), ('upper', UPPER), ('fore', FORE)):
        p.save(OUT / f'part_{nm}.png')
    N = 32
    for kind, run in (('walk', False), ('run', True)):
        for i in range(N):
            frame(i / N, run).save(OUT / f'{kind}_{i:02d}.png')
    print('ok')
