# -*- coding: utf-8 -*-
"""人物の絵を生成AIに頼むときに添付する「位置の目安の枠」を作る（デザイン資料用。ゲーム本体のコードではない）

使い方: python3 tools/design/char_templates.py <出力フォルダ>（T1〜T5 をまとめて作る）

- T1：ゲーム用の正面の立ち姿（1024×1024）。頭の上・あご・股・足元の線で、3.5頭身の目安を示す
- T2：歩きの3ポーズ（1536×1024）。左から「立つ」「右足を前」「左足を前」。どの枠も頭の上・足元の高さが同じ
- T3：歩きの中間2ポーズ（1536×1024・2026-10-23 追加）。左から「右足を半歩前」「立つ（見本）」「左足を半歩前」。
  T2 の3ポーズのあいだを埋め、歩きを4コマ→8コマにする（docs/design/walk-inbetween-20261023）
- T4：走りの3ポーズ（1536×1024・2026-10-23 追加）。左から「右足を大きく前」「両足が浮く」「左足を大きく前」（docs/design/run-20261023）
- T5：1ポーズだけの枠（1024×1024・2026-10-23 追加）。斜め向きの絵を1ポーズずつ頼むとき用（docs/design/diagonal-20261023）
- 線と文字は目安。生成AIには「線と文字は描かない」と頼む
- 足元の線（y=940）と背の高さ（860）は、ゲームのコマ（216×288・足元 270・人物の高さ 約250）に縮めたときにそろう
"""
import os
import sys

from PIL import Image, ImageDraw, ImageFont

TOP, CHIN, CROTCH, FOOT = 80, 320, 584, 940      # 3.5頭身の目安（頭 240・胴 264・脚 356）
FONT = '/usr/share/fonts/opentype/ipafont-gothic/ipag.ttf'


def guides(d: ImageDraw.ImageDraw, x1: int, x2: int, title: str, font: ImageFont.FreeTypeFont) -> None:
    gray, blue, red = (170, 170, 178), (120, 150, 210), (220, 90, 90)
    d.rectangle([x1 + 6, 6, x2 - 6, 1018], outline=gray, width=2)
    cx = (x1 + x2) // 2
    for y in range(20, 1010, 24):
        d.line([cx, y, cx, y + 12], fill=gray, width=2)
    for y, name, col in ((TOP, '頭の上', blue), (CHIN, 'あご', blue), (CROTCH, '股', blue), (FOOT, '足元', red)):
        d.line([x1 + 20, y, x2 - 20, y], fill=col, width=3 if name == '足元' else 2)
        d.text((x1 + 24, y - 30), name, font=font, fill=col)
    d.text((x1 + 24, 970), title, font=font, fill=(90, 90, 100))


def main() -> None:
    out = sys.argv[1]
    os.makedirs(out, exist_ok=True)
    font = ImageFont.truetype(FONT, 26)
    t1 = Image.new('RGB', (1024, 1024), 'white')
    guides(ImageDraw.Draw(t1), 256, 768, '正面の立ち姿（3.5頭身の目安）', font)
    t1.save(os.path.join(out, 'T1_正面の立ち姿の枠_1024x1024.png'), optimize=True)
    t2 = Image.new('RGB', (1536, 1024), 'white')
    d = ImageDraw.Draw(t2)
    for i, title in enumerate(['1 立つ', '2 右足を前', '3 左足を前']):
        guides(d, i * 512, (i + 1) * 512, title, font)
    t2.save(os.path.join(out, 'T2_歩きの3ポーズの枠_1536x1024.png'), optimize=True)
    t3 = Image.new('RGB', (1536, 1024), 'white')
    d = ImageDraw.Draw(t3)
    for i, title in enumerate(['1 右足を半歩前', '2 立つ（見本）', '3 左足を半歩前']):
        guides(d, i * 512, (i + 1) * 512, title, font)
    t3.save(os.path.join(out, 'T3_歩きの中間ポーズの枠_1536x1024.png'), optimize=True)
    t4 = Image.new('RGB', (1536, 1024), 'white')
    d = ImageDraw.Draw(t4)
    for i, title in enumerate(['1 走る・右足を大きく前', '2 走る・両足が浮く', '3 走る・左足を大きく前']):
        guides(d, i * 512, (i + 1) * 512, title, font)
    t4.save(os.path.join(out, 'T4_走りの3ポーズの枠_1536x1024.png'), optimize=True)
    t5 = Image.new('RGB', (1024, 1024), 'white')
    guides(ImageDraw.Draw(t5), 256, 768, '1ポーズ（頭の上と足元をそろえる）', font)
    t5.save(os.path.join(out, 'T5_1ポーズの枠_1024x1024.png'), optimize=True)
    print('ok', out)


if __name__ == '__main__':
    main()
