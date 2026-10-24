"""歩きの「動きの見本」（横から見た棒の人形・1歩4ポーズ）を描く。画像を作る AI に添付して、足と腕の動きを伝える（2026-10-24）。
python3 -I tools/art/walk_guide_draw.py <出力フォルダ>
"""
import sys, math
from PIL import Image, ImageDraw, ImageFont
OUT=sys.argv[1]
F=ImageFont.truetype('/usr/share/fonts/opentype/ipafont-gothic/ipag.ttf',30)
FS=ImageFont.truetype('/usr/share/fonts/opentype/ipafont-gothic/ipag.ttf',23)
RED=(220,60,60); BLUE=(50,100,230); GRAY=(90,90,90)
# weight：体重が乗る足（その足の先が地面）。toe：つま先立ちの高さ（L に対する割合）
WALK_PH=[dict(name='1 着く', step=(26,-4), other=(-22,-14), arm_o=(22,22), arm_s=(-22,8), weight='both', toe=0, note='前の足はかかとから着く\n後ろの足はつま先が着く'),
    dict(name='2 沈む', step=(34,-56), other=(-26,-22), arm_o=(14,18), arm_s=(-14,8), weight='step', toe=0, note='前の足で体重を受けて\nひざが曲がり、いちばん低い'),
    dict(name='3 足を運ぶ', step=(0,0), other=(20,-70), arm_o=(2,10), arm_s=(-2,8), weight='step', toe=0, note='片足でまっすぐ立ち\nもう片方の足を前へ運ぶ'),
    dict(name='4 伸び上がる', step=(-18,8), other=(30,-12), arm_o=(-10,8), arm_s=(10,14), weight='step', toe=0.1, note='後ろの足のつま先でけり出し\nいちばん高い')]
# 走り（1歩4ポーズ。weight='air' は両足が地面から離れる）。2026-10-24 walk-run-v3 の依頼用
RUN_PH=[dict(name='1 着地', step=(30,-22), other=(-36,-60), arm_o=(34,40), arm_s=(-34,30), weight='step', toe=0, note='前の足がひざを曲げて着く\n体は前に傾く。腕は大きく'),
    dict(name='2 沈む', step=(14,-62), other=(-18,-100), arm_o=(26,40), arm_s=(-30,30), weight='step', toe=0, note='前の足で体重を受けて\nいちばん低い。後ろ足は高く'),
    dict(name='3 けり出し', step=(-30,-6), other=(34,-84), arm_o=(-22,30), arm_s=(38,46), weight='step', toe=0.18, note='後ろの足のつま先で強くけり\n前の足のひざを前へ'),
    dict(name='4 浮く', step=(-42,-52), other=(40,-44), arm_o=(-34,26), arm_s=(30,40), weight='air', toe=0, note='両足が地面から離れて\nいちばん高い')]
L=150; UA,FA=105,95
def foot(angs):
    a1=math.radians(angs[0]); a2=math.radians(angs[0]+angs[1])
    return L*math.cos(a1)+L*math.cos(a2)
def guide(step_r, path, title, facing_left=False, legend=None, first=1, poses=None, lean=8):
    PH = poses or WALK_PH
    W,H=1536,1024; sw=W//4
    im=Image.new('RGB',(W,H),(255,255,255))
    fig=Image.new('RGBA',(W,H),(255,255,255,0)); d=ImageDraw.Draw(fig)
    step_col, other_col = (RED,BLUE) if step_r else (BLUE,RED)
    ground=800
    hips=[]
    for ph in PH:
        if ph['weight']=='air': drop = 2*L*0.95
        else: drop = max(foot(ph['step']),foot(ph['other'])) if ph['weight']=='both' else foot(ph['step'])
        hips.append(ground-drop-ph['toe']*L)
    for i,ph in enumerate(PH):
        x0=i*sw; cx=x0+sw//2-10
        hip=(cx, hips[i]); sh=(cx+lean, hip[1]-190)
        def limb(start,angs,col,ln,w=12,arm=False,toe=False):
            a1=math.radians(angs[0]); k=(start[0]+ln[0]*math.sin(a1), start[1]+ln[0]*math.cos(a1))
            a2=math.radians(angs[0]+angs[1]); e=(k[0]+ln[1]*math.sin(a2), k[1]+ln[1]*math.cos(a2))
            d.line([start,k,e],fill=col,width=w,joint='curve'); d.ellipse((k[0]-7,k[1]-7,k[0]+7,k[1]+7),fill=col)
            if arm: d.ellipse((e[0]-10,e[1]-10,e[0]+10,e[1]+10),fill=col)
            elif toe: d.line([e,(e[0]+26,e[1]+15)],fill=col,width=w)
            else: d.line([(e[0]-8,e[1]),(e[0]+30,e[1])],fill=col,width=w)
        step_near = (not facing_left) if step_r else facing_left
        far = [lambda: limb(sh, ph['arm_s'], step_col, (UA,FA), 10, True), lambda: limb(hip, ph['other'], other_col, (L,L))]
        near = [lambda: limb(hip, ph['step'], step_col, (L,L), toe=ph['toe']>0), lambda: limb(sh, ph['arm_o'], other_col, (UA,FA), 10, True)]
        if not step_near:
            far = [lambda: limb(sh, ph['arm_o'], other_col, (UA,FA), 10, True), lambda: limb(hip, ph['step'], step_col, (L,L), toe=ph['toe']>0)]
            near = [lambda: limb(hip, ph['other'], other_col, (L,L)), lambda: limb(sh, ph['arm_s'], step_col, (UA,FA), 10, True)]
        for f in far: f()
        d.line([hip,sh],fill=GRAY,width=16)
        d.ellipse((sh[0]-36,sh[1]-110,sh[0]+36,sh[1]-38),outline=GRAY,width=7)
        for f in near: f()
        d.line([(x0+20,ground+16),(x0+sw-20,ground+16)],fill=(170,170,170),width=3)
        stand_top=ground-2*L-190-110
        d.line([(x0+20,stand_top),(x0+sw-20,stand_top)],fill=(230,190,190),width=2)
    # 人の形だけ1コマずつ左右反転（左へ歩く図）。文字は反転しない
    for i in range(4):
        x0=i*sw
        panel=fig.crop((x0,0,x0+sw,H))
        if facing_left: panel=panel.transpose(Image.FLIP_LEFT_RIGHT)
        im.paste(panel,(x0,0),panel)
    d=ImageDraw.Draw(im)
    for i,ph in enumerate(PH):
        x0=i*sw
        d.rectangle((x0+6,6,x0+sw-6,H-110),outline=(200,200,200),width=2)
        d.text((x0+18,18),f"{i+first} {ph['name'].split(' ',1)[1]}",font=F,fill=GRAY)
        for j,line in enumerate(ph['note'].split('\n')): d.text((x0+18,ground+34+j*32),line,font=FS,fill=GRAY)
    d.text((18,H-90),title,font=FS,fill=GRAY)
    d.text((18,H-52),legend or '赤＝人物の右足・右腕　青＝人物の左足・左腕。横から見た図（右へ歩く）。うすい赤の線＝立っているときの頭の高さ',font=FS,fill=GRAY)
    im.save(path, optimize=True)
def stack8(top, bottom, path):
    """1歩ずつの見本2枚を上下に並べて、1周8ポーズの見本にする（上の段 1〜4・下の段 5〜8）"""
    a, b = Image.open(top), Image.open(bottom)
    im = Image.new('RGB', (a.width, a.height + b.height + 24), (255, 255, 255))
    im.paste(a, (0, 0)); im.paste(b, (0, a.height + 24))
    ImageDraw.Draw(im).line([(0, a.height + 12), (a.width, a.height + 12)], fill=(120, 120, 120), width=6)
    im.save(path, optimize=True)
if __name__ == '__main__':
    guide(True, f'{OUT}/guide_walk_r.png', '動きの見本：歩き・右足を前に出す1歩（腕は足と反対：右足が前のとき左腕が前）')
    guide(False, f'{OUT}/guide_walk_l.png', '動きの見本：歩き・左足を前に出す1歩（腕は足と反対：左足が前のとき右腕が前）')
    LEG = '赤＝人物の右足・右腕（左向きでは奥）　青＝人物の左足・左腕（左向きでは手前）。左へ歩く横向き。うすい赤の線＝立っているときの頭の高さ'
    guide(True, f'{OUT}/guide_walk_left_r.png', '動きの見本：左向き・右足（奥の足）を前に出す1歩（腕は足と反対）', True, LEG)
    guide(False, f'{OUT}/guide_walk_left_l.png', '動きの見本：左向き・左足（手前の足）を前に出す1歩（腕は足と反対）', True, LEG)
    # 1周8ポーズ（1枚に上下2段で描いてもらうとき。2026-10-24 redo8）
    import os, tempfile
    tmp = tempfile.mkdtemp()
    LEG8 = '赤＝人物の右足・右腕（左向きでは奥＝体の向こう側で、一部が隠れる）　青＝人物の左足・左腕（左向きでは手前＝全部見える）'
    guide(True, f'{tmp}/a.png', '上の段（1〜4）：赤い足（奥の右足）を前に出す1歩。腕は青（手前の左腕）が前', True, LEG8, 1)
    guide(False, f'{tmp}/b.png', '下の段（5〜8）：青い足（手前の左足）を前に出す1歩。腕は赤（奥の右腕）が前', True, LEG8, 5)
    stack8(f'{tmp}/a.png', f'{tmp}/b.png', f'{OUT}/guide8_left.png')
    LEGB = '赤＝人物の右足・右腕（背中から見ると画面の右側）　青＝人物の左足・左腕（画面の左側）。図は横から見たところ'
    guide(True, f'{tmp}/c.png', '上の段（1〜4）：赤い足（右足）を前に出す1歩。腕は青（左腕）が前', False, LEGB, 1)
    guide(False, f'{tmp}/d.png', '下の段（5〜8）：青い足（左足）を前に出す1歩。腕は赤（右腕）が前', False, LEGB, 5)
    stack8(f'{tmp}/c.png', f'{tmp}/d.png', f'{OUT}/guide8_back.png')
    # 走り（2026-10-24 walk-run-v3）：左向き・背中
    guide(True, f'{tmp}/e.png', '上の段（1〜4）：赤い足（奥の右足）で着地する1歩。腕は青（手前の左腕）が前。体は前に傾く', True, LEG8, 1, RUN_PH, 40)
    guide(False, f'{tmp}/f.png', '下の段（5〜8）：青い足（手前の左足）で着地する1歩。腕は赤（奥の右腕）が前', True, LEG8, 5, RUN_PH, 40)
    stack8(f'{tmp}/e.png', f'{tmp}/f.png', f'{OUT}/guide8_left_run.png')
    guide(True, f'{tmp}/g.png', '上の段（1〜4）：赤い足（右足）で着地する1歩。腕は青（左腕）が前。体は前に傾く', False, LEGB, 1, RUN_PH, 40)
    guide(False, f'{tmp}/h.png', '下の段（5〜8）：青い足（左足）で着地する1歩。腕は赤（右腕）が前', False, LEGB, 5, RUN_PH, 40)
    stack8(f'{tmp}/g.png', f'{tmp}/h.png', f'{OUT}/guide8_back_run.png')
print('ok')
