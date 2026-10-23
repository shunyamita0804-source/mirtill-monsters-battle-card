"""デザイン第6弾・第7弾（2026-10-23 納品）を、ゲームで使う大きさの部品に切り出す。

使い方：
  python3 -I tools/design/ui67_build.py <第6弾のフォルダ> <第7弾のフォルダ>

書き出し先：assets/images/ui/battle/（光の帯・ターンの帯・数字・対戦の上のボタン）、assets/images/ui/hud/（話す印・きらめき）、
assets/images/ui/button/（ボタン・タブ・戻る・増減・つまみ・説明の台）、assets/images/ui/worldmap/（地図の印・地名の札）

- 部品の位置は tools/design/ui_parts_cut.py と同じ方法で見つける（透明でないかたまり）
- 高さは、画面に出す大きさの2倍くらい（iPhone の細かい画面でもぼやけないように）にそろえる
- 数字・地図の印は部品どうしが少しくっついているので、ほぼ同じ幅とみなし、すき間がいちばん少ない列で切る
"""

import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

sys.path.insert(0, str(Path(__file__).resolve().parent))
from ui_parts_cut import parts  # noqa: E402

ROOT = Path(__file__).resolve().parents[2] / 'assets' / 'images' / 'ui'


def save(img: Image.Image, path: Path, height: int | None = None, width: int | None = None) -> None:
    if height:
        img = img.resize((round(img.width * height / img.height), height), Image.LANCZOS)
    elif width:
        img = img.resize((width, round(img.height * width / img.width)), Image.LANCZOS)
    path.parent.mkdir(parents=True, exist_ok=True)
    img.save(path, quality=90, method=6)
    print(path.relative_to(ROOT), img.size)


def cut(src: Path, names: list[str | None], out: Path, dilate: int = 3, height: int | dict[str, int] | None = None, width: int | None = None) -> None:
    img = Image.open(src).convert('RGBA')
    found = parts(img, dilate)
    if len(found) != len(names):
        raise SystemExit(f'{src.name}: 部品は {len(found)} 個、名前は {len(names)} 個 {found}')
    for name, box in zip(names, found):
        if name:
            h = height.get(name) if isinstance(height, dict) else height
            save(img.crop(box), out / f'{name}.webp', h, width)


def clean(piece: Image.Image) -> Image.Image:
    """切った端に入りこんだ、となりの部品のかけら（小さなかたまり）を消す"""
    arr = np.array(piece)
    lab, n = ndimage.label(arr[:, :, 3] >= 8)
    if n <= 1:
        return piece
    sizes = ndimage.sum(np.ones_like(lab), lab, range(1, n + 1))
    keep = np.isin(lab, [i + 1 for i, v in enumerate(sizes) if v >= sizes.max() * 0.05])
    arr[~keep] = 0
    return Image.fromarray(arr)


def split_row(img: Image.Image, band: tuple[int, int], names: list[str], out: Path, height: int, trim_vertical: bool = True) -> None:
    """横一列に並んだ同じくらいの幅の部品を、境目の近くで不透明な点がいちばん少ない列で切る（くっついていても切れる）"""
    a = np.array(img.getchannel('A'))[band[0] : band[1]] >= 24
    cols = np.where(a.any(axis=0))[0]
    x0, x1 = cols[0], cols[-1] + 1
    prof = a.sum(axis=0)
    n = len(names)
    step = (x1 - x0) / n
    cuts = [x0]
    for k in range(1, n):
        g = int(x0 + step * k)
        lo, hi = g - int(step * 0.35), g + int(step * 0.35)
        cuts.append(lo + int(np.argmin(prof[lo:hi])))
    cuts.append(x1)
    for name, l, r in zip(names, cuts[:-1], cuts[1:]):
        piece = clean(img.crop((l, band[0], r, band[1])))
        bb = piece.getchannel('A').point(lambda v: 255 if v >= 24 else 0).getbbox()
        # 数字は上下を切り詰めない（並べたときに文字の高さ・位置がそろうように）
        save(piece.crop(bb if trim_vertical else (bb[0], 0, bb[2], piece.height)), out / f'{name}.webp', height=height)


def digits(src: Path, out: Path) -> None:
    """2段×11文字（上：ダメージ −0〜9、下：回復 ＋0〜9）"""
    img = Image.open(src).convert('RGBA')
    a = np.array(img.getchannel('A')) >= 24
    rows = np.where(a.any(axis=1))[0]
    mid = img.height // 2
    split = min((y for y in range(img.height) if not a[y].any()), key=lambda y: abs(y - mid))
    split_row(img, (int(rows[0]), split), ['dmg_minus'] + [f'dmg_{n}' for n in range(10)], out, 96, trim_vertical=False)
    split_row(img, (split, int(rows[-1]) + 1), ['heal_plus'] + [f'heal_{n}' for n in range(10)], out, 96, trim_vertical=False)


def main() -> None:
    six, seven = Path(sys.argv[1]), Path(sys.argv[2])
    battle, hud, btn, wmap = ROOT / 'battle', ROOT / 'hud', ROOT / 'button', ROOT / 'worldmap'
    # 第6弾
    save(Image.open(six / 'showcase_band.png').convert('RGBA'), battle / 'showcase_band.webp', width=1024)
    cut(six / 'phase_banners.png', ['phase_player', 'phase_opponent'], battle, width=900)
    digits(six / 'battle_digits.png', battle / 'digits')
    cut(six / 'talk_marker.png', ['talk_marker'], hud, height=120)
    save(Image.open(six / 'examine_sparkle.png').convert('RGBA'), hud / 'examine_sparkle.webp', width=256)
    # 第7弾
    cut(seven / 'btn_primary.png', ['btn_primary', 'btn_primary_pressed', 'btn_primary_disabled'], btn, height=96)
    cut(seven / 'btn_secondary.png', ['btn_secondary', 'btn_secondary_pressed', 'btn_secondary_disabled'], btn, height=96)
    cut(seven / 'btn_danger.png', ['btn_danger', 'btn_danger_pressed'], btn, height=120)
    cut(seven / 'tab_chips.png', ['tab_on', 'tab_off'], btn, height=88)
    cut(seven / 'nav_buttons.png', ['nav_back', 'nav_close'], btn, height=96)
    cut(seven / 'stepper.png', ['step_minus', 'step_window', 'step_plus', 'step_minus_off', 'step_plus_off'], btn, height=96)
    cut(seven / 'slider.png', ['slider_track', 'slider_fill', 'slider_knob'], btn, height={'slider_track': 48, 'slider_fill': 48, 'slider_knob': 88})
    # 音量の金色の部分だけ（つまみの左側に、音量に合わせた長さで伸ばして出す）。溝の中の金色の棒の位置（高さ 48 の絵で）
    fill = Image.open(btn / 'slider_fill.webp').convert('RGBA')
    save(fill.crop((31, 14, 323, 35)), btn / 'slider_gold.webp')
    cut(seven / 'notice_panel.png', ['notice_panel'], btn, height=120)
    pins = Image.open(seven / 'map_pins.png').convert('RGBA')
    found = parts(pins, 0)
    top = found[0]
    split_row(pins, (top[1] - 4, max(b[3] for b in found[:3]) + 4), ['pin_town', 'pin_dungeon', 'pin_cleared', 'pin_here_ring'], wmap, 72)
    save(pins.crop(found[3]), wmap / 'map_label.webp', height=72)
    cut(seven / 'battle_top_icons.png', ['icon_surrender', 'icon_rules'], battle, height=96)


if __name__ == '__main__':
    main()
