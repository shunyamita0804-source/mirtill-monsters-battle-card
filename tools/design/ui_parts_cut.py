"""デザイン担当から届いた「部品を何個か並べた透過 PNG」を、部品ごとに切り出す（2026-10-23・第6弾・第7弾）。

使い方：
  python3 -I tools/design/ui_parts_cut.py <PNG> --list            … 見つかった部品の位置を表示
  python3 -I tools/design/ui_parts_cut.py <PNG> <書き出し先> 名前1 名前2 …  … 上の段から順・左から順に、名前を付けて WebP で保存

- 不透明な所（アルファ 24 以上）のかたまりを1つの部品とみなす。小さすぎるかたまり（光の粒など）は、いちばん近い部品にまとめる
- 縦の位置が近いものを同じ段とし、段ごとに左から並べる
- --height N で、保存するときの高さ（px）をそろえる（縦横比は保つ）
- --dilate N で、かたまりとみなす距離（px。0 で、くっついていない所はすべて別の部品）
"""

import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

ALPHA = 24
MIN_AREA = 0.002  # 画像全体に対する割合。これより小さいかたまりは近くの部品へ


def parts(img: Image.Image, dilate: int = 3) -> list[tuple[int, int, int, int]]:
    a = np.array(img.getchannel('A')) >= ALPHA
    lab, n = ndimage.label(ndimage.binary_dilation(a, iterations=dilate) if dilate else a)
    boxes = []
    for sl in ndimage.find_objects(lab):
        y0, y1, x0, x1 = sl[0].start, sl[0].stop, sl[1].start, sl[1].stop
        boxes.append([x0, y0, x1, y1])
    total = a.size
    big = [b for b in boxes if (b[2] - b[0]) * (b[3] - b[1]) >= total * MIN_AREA]
    for b in boxes:
        if b in big:
            continue
        cx, cy = (b[0] + b[2]) / 2, (b[1] + b[3]) / 2
        near = min(big, key=lambda c: abs((c[0] + c[2]) / 2 - cx) + abs((c[1] + c[3]) / 2 - cy))
        near[0], near[1], near[2], near[3] = min(near[0], b[0]), min(near[1], b[1]), max(near[2], b[2]), max(near[3], b[3])
    big.sort(key=lambda b: (b[1] + b[3]) / 2)
    rows: list[list[list[int]]] = []
    for b in big:
        cy = (b[1] + b[3]) / 2
        if rows and abs(cy - np.mean([(r[1] + r[3]) / 2 for r in rows[-1]])) < (b[3] - b[1]) / 2:
            rows[-1].append(b)
        else:
            rows.append([b])
    return [tuple(b) for r in rows for b in sorted(r, key=lambda b: b[0])]


def main() -> None:
    src = Path(sys.argv[1])
    img = Image.open(src).convert('RGBA')
    argv = sys.argv[2:]
    dilate = 3
    if '--dilate' in argv:
        k = argv.index('--dilate')
        dilate = int(argv[k + 1])
        argv = argv[:k] + argv[k + 2 :]
    found = parts(img, dilate)
    if argv[0] == '--list':
        for i, b in enumerate(found):
            print(i, b, b[2] - b[0], 'x', b[3] - b[1])
        return
    out = Path(argv[0])
    args = argv[1:]
    height = None
    if '--height' in args:
        k = args.index('--height')
        height = int(args[k + 1])
        args = args[:k] + args[k + 2 :]
    if len(args) != len(found):
        raise SystemExit(f'{src.name}: 部品は {len(found)} 個、名前は {len(args)} 個')
    out.mkdir(parents=True, exist_ok=True)
    for name, b in zip(args, found):
        if name == '-':
            continue
        part = img.crop(b)
        if height:
            part = part.resize((round(part.width * height / part.height), height), Image.LANCZOS)
        part.save(out / f'{name}.webp', lossless=False, quality=90, method=6)
        print(name, part.size)


if __name__ == '__main__':
    main()
