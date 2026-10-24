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
PH=[dict(name='1 着く', step=(26,-4), other=(-22,-14), arm_o=(22,22), arm_s=(-22,8), weight='both', toe=0, note='前の足はかかとから着く\n後ろの足はつま先が着く'),
    dict(name='2 沈む', step=(34,-56), other=(-26,-22), arm_o=(14,18), arm_s=(-14,8), weight='step', toe=0, note='前の足で体重を受けて\nひざが曲がり、いちばん低い'),
    dict(name='3 足を運ぶ', step=(0,0), other=(20,-70), arm_o=(2,10), arm_s=(-2,8), weight='step', toe=0, note='片足でまっすぐ立ち\nもう片方の足を前へ運ぶ'),
    dict(name='4 伸び上がる', step=(-18,8), other=(30,-12), arm_o=(-10,8), arm_s=(10,14), weight='step', toe=0.1, note='後ろの足のつま先でけり出し\nいちばん高い')]
L=150; UA,FA=105,95
def foot(angs):
    a1=math.radians(angs[0]); a2=math.radians(angs[0]+angs[1])
    return L*math.cos(a1)+L*math.cos(a2)
def guide(step_r, path, title):
    W,H=1536,1024; sw=W//4
    im=Image.new('RGB',(W,H),(255,255,255)); d=ImageDraw.Draw(im)
    step_col, other_col = (RED,BLUE) if step_r else (BLUE,RED)
    ground=800
    hips=[]
    for ph in PH:
        drop = max(foot(ph['step']),foot(ph['other'])) if ph['weight']=='both' else foot(ph['step'])
        hips.append(ground-drop-ph['toe']*L)
    for i,ph in enumerate(PH):
        x0=i*sw; cx=x0+sw//2-10
        d.rectangle((x0+6,6,x0+sw-6,H-110),outline=(200,200,200),width=2)
        d.text((x0+18,18),ph['name'],font=F,fill=GRAY)
        hip=(cx, hips[i]); sh=(cx+8, hip[1]-190)
        def limb(start,angs,col,ln,w=12,arm=False,toe=False):
            a1=math.radians(angs[0]); k=(start[0]+ln[0]*math.sin(a1), start[1]+ln[0]*math.cos(a1))
            a2=math.radians(angs[0]+angs[1]); e=(k[0]+ln[1]*math.sin(a2), k[1]+ln[1]*math.cos(a2))
            d.line([start,k,e],fill=col,width=w,joint='curve'); d.ellipse((k[0]-7,k[1]-7,k[0]+7,k[1]+7),fill=col)
            if arm: d.ellipse((e[0]-10,e[1]-10,e[0]+10,e[1]+10),fill=col)
            elif toe: d.line([e,(e[0]+26,e[1]+15)],fill=col,width=w)
            else: d.line([(e[0]-8,e[1]),(e[0]+30,e[1])],fill=col,width=w)
        limb(sh, ph['arm_s'], step_col, (UA,FA), 10, True)
        limb(hip, ph['other'], other_col, (L,L))
        d.line([hip,sh],fill=GRAY,width=16)
        d.ellipse((sh[0]-36,sh[1]-110,sh[0]+36,sh[1]-38),outline=GRAY,width=7)
        limb(hip, ph['step'], step_col, (L,L), toe=ph['toe']>0)
        limb(sh, ph['arm_o'], other_col, (UA,FA), 10, True)
        d.line([(x0+20,ground+16),(x0+sw-20,ground+16)],fill=(170,170,170),width=3)
        stand_top=ground-2*L-190-110
        d.line([(x0+20,stand_top),(x0+sw-20,stand_top)],fill=(230,190,190),width=2)
        for j,line in enumerate(ph['note'].split('\n')): d.text((x0+18,ground+34+j*32),line,font=FS,fill=GRAY)
    d.text((18,H-90),title,font=FS,fill=GRAY)
    d.text((18,H-52),'赤＝人物の右足・右腕　青＝人物の左足・左腕。横から見た図（右へ歩く）。うすい赤の線＝立っているときの頭の高さ',font=FS,fill=GRAY)
    im.save(path, optimize=True)
guide(True, f'{OUT}/guide_walk_r.png', '動きの見本：歩き・右足を前に出す1歩（腕は足と反対：右足が前のとき左腕が前）')
guide(False, f'{OUT}/guide_walk_l.png', '動きの見本：歩き・左足を前に出す1歩（腕は足と反対：左足が前のとき右腕が前）')
print('ok')
