from PIL import Image, ImageDraw, ImageFont, ImageFilter
import math, random, pathlib
random.seed(19)
W,H=1200,630
im=Image.new('RGB',(W,H),(10,14,28))
pix=im.load()
for y in range(H):
  for x in range(W):
    dx=(x-W*.5)/(W*.7);dy=(y-H*.2)/(H*.82)
    glow=max(0,1-math.sqrt(dx*dx+dy*dy))
    pix[x,y]=(int(10+27*glow),int(14+17*glow),int(28+37*glow))
d=ImageDraw.Draw(im,'RGBA')
for i in range(110):
  x=random.randrange(40,W-40);y=random.randrange(30,H-30)
  r=random.choice([1,1,1,2])
  d.ellipse((x-r,y-r,x+r,y+r),fill=(242,217,175,random.randint(45,125)))
for radius,a in [(213,30),(172,45),(134,75)]:
  d.ellipse((600-radius,267-radius,600+radius,267+radius),outline=(236,188,124,a),width=2)
# four-point star icon
cx,cy=600,235
coords=[(cx,cy-66),(cx+16,cy-16),(cx+75,cy),(cx+16,cy+16),(cx,cy+66),(cx-16,cy+16),(cx-75,cy),(cx-16,cy-16)]
d.polygon(coords,fill=(242,202,130,225))
font_path='/usr/share/fonts/opentype/noto/NotoSerifCJK-Regular.ttc'
if not pathlib.Path(font_path).exists():
  import subprocess
  font_path=subprocess.check_output(['fc-match','-f','%{file}','Noto Serif CJK JP']).decode()
serif=ImageFont.truetype(font_path,67)
serif_sub=ImageFont.truetype(font_path,27)
sans=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',21)
def centered(text,y,font,fill,spacing=0):
  box=d.textbbox((0,0),text,font=font)
  d.text((W/2-(box[2]-box[0])/2,y),text,font=font,fill=fill)
centered('運命の相棒ガチャ',370,serif,(250,224,172))
centered('IDENTITY FANTASY GACHA',473,sans,(186,177,207))
centered('15系統・300種から、あなただけの相棒を召喚',525,serif_sub,(223,219,220))
d.rounded_rectangle((26,26,1174,604),radius=24,outline=(233,195,133,80),width=2)
im.save('/mnt/data/identity-fantasy-gacha/assets/ogp.png',optimize=True)
