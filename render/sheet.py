# contact sheet: python3 render/sheet.py out.jpg img1 img2 ...
import sys
from PIL import Image, ImageDraw
out, fs = sys.argv[1], sys.argv[2:]
ims = [Image.open(f).resize((960, 540)) for f in fs]
cols = 2; rows = (len(ims) + 1) // 2
sheet = Image.new('RGB', (960 * cols, 540 * rows))
d = ImageDraw.Draw(sheet)
for i, im in enumerate(ims):
    x, y = (i % cols) * 960, (i // cols) * 540
    sheet.paste(im, (x, y)); d.text((x + 8, y + 8), fs[i].split('_')[-1], fill=(0, 255, 0))
sheet.save(out, quality=85)
