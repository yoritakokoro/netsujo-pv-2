# Trace Met / photo cut-outs into line art for the "neon" motif shots.
# Output: white lines on transparency (alpha = line strength), tinted and glowed at render time.
#   python3 tools/neon_lines.py            (run from the repo root)
import os, cv2, numpy as np

SRC = {  # key: (path, max side, canny lo/hi, min component px, inner line weight)
    'fan_169859': ('mv/assets/met/fan_169859.png', 1000, 60, 150, 40, 1),
    'fan_120720': ('mv/assets/met/fan_120720.png', 1000, 60, 150, 40, 1),
    'fan_156754': ('mv/assets/met/fan_156754.png', 1000, 60, 150, 40, 1),
    'fan_120449': ('mv/assets/met/fan_120449.png', 1000, 60, 150, 40, 1),
    'guitar_503385': ('mv/assets/met/guitar_503385.png', 1100, 50, 140, 40, 1),
    'guitar_505283': ('mv/assets/met/guitar_505283.png', 1100, 50, 140, 40, 1),
    'dish_471762': ('mv/assets/met/dish_471762.png', 1000, 70, 170, 60, 1),
    'dish_468516': ('mv/assets/met/dish_468516.png', 1000, 70, 170, 60, 1),
    'iron_466304': ('mv/assets/met/iron_466304.png', 1000, 60, 160, 60, 1),
    'jewel_206840': ('mv/assets/met/jewel_206840.png', 900, 60, 160, 30, 1),
    'watch_207363': ('mv/assets/met/watch_207363.png', 900, 60, 160, 30, 1),
    'rose': ('mv/assets/v3/obj_d_rose.png', 900, 40, 120, 40, 1),
    'rose3': ('mv/assets/v3/obj_fi_r3.png', 900, 40, 120, 40, 1),
}
OUT = 'mv/assets/neon'
os.makedirs(OUT, exist_ok=True)

for key, (path, side, lo, hi, minpx, wgt) in SRC.items():
    im = cv2.imread(path, cv2.IMREAD_UNCHANGED)
    if im is None: print('missing', path); continue
    if im.shape[2] == 3: im = np.dstack([im, np.full(im.shape[:2], 255, np.uint8)])
    s = side / max(im.shape[:2]); im = cv2.resize(im, None, fx=s, fy=s, interpolation=cv2.INTER_AREA)
    a = im[:, :, 3]; pad = 24
    im = cv2.copyMakeBorder(im, pad, pad, pad, pad, cv2.BORDER_CONSTANT, value=(0, 0, 0, 0)); a = im[:, :, 3]
    gray = cv2.cvtColor(im[:, :, :3], cv2.COLOR_BGR2GRAY)
    gray = cv2.bilateralFilter(gray, 7, 40, 7)
    inner = cv2.Canny(gray, lo, hi)
    inner[cv2.erode((a > 128).astype(np.uint8), np.ones((7, 7), np.uint8)) == 0] = 0
    n, lab, st, _ = cv2.connectedComponentsWithStats(inner, 8)   # drop specks
    keep = np.zeros(n, bool); keep[1:] = st[1:, cv2.CC_STAT_AREA] >= minpx
    inner = (keep[lab] * 255).astype(np.uint8)
    if wgt > 1: inner = cv2.dilate(inner, np.ones((wgt, wgt), np.uint8))
    sil = np.zeros_like(a)                                         # outer contour, heavier
    cs, _ = cv2.findContours((a > 128).astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    cs = [c for c in cs if cv2.contourArea(c) > 400]
    cv2.drawContours(sil, cs, -1, 255, 3, cv2.LINE_AA)
    line = np.maximum(cv2.GaussianBlur(inner, (3, 3), 0), sil)
    out = np.dstack([np.full_like(line, 255)] * 3 + [line])
    cv2.imwrite(f'{OUT}/{key}.png', out)
    print(key, out.shape[1], out.shape[0], int((line > 64).mean() * 1000) / 10, '% ink')
