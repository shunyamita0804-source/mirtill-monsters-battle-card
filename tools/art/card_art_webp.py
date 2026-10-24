"""正式カードの技の絵（原本 PNG/JPEG）から、ゲーム用の WebP を作る（2026-10-24。ガウル16技・ラズック「いたずら」）。
原本は design-parts/cards-original/ に無改変で置き、ここでは縦横比を変えずに幅 827px へ縮めるだけ（切り抜き・変形・文字入れはしない）。
python3 -I tools/art/card_art_webp.py <原本> <出力.webp>
"""
import sys
from PIL import Image

WIDTH = 827  # ソラモ・ラズックの技の絵と同じ幅（827×937）
src, dst = sys.argv[1], sys.argv[2]
im = Image.open(src).convert('RGB')
h = round(im.height * WIDTH / im.width)
im.resize((WIDTH, h), Image.LANCZOS).save(dst, 'WEBP', quality=90, method=6)
print(dst, WIDTH, h)
