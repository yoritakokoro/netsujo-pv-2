# Lace / fringe overlays from The Met images: alpha from the contrast between the lace and its backing.
import os, json, numpy as np
from PIL import Image
from scipy.ndimage import gaussian_filter
D = 'mv/assets/met'
def lum(a): return (a[..., :3].astype(np.float32) / 255 * [0.3, 0.59, 0.11]).sum(2)
def lace(key, light_on_dark=True, lo=None, hi=None, out=None, crop=None):
    im = Image.open(f'{D}/{key}.jpg').convert('RGB')
    if crop: im = im.crop(crop)
    a = np.asarray(im); L = lum(a)
    if not light_on_dark: L = 1 - L
    lo = lo if lo is not None else np.percentile(L, 35); hi = hi if hi is not None else np.percentile(L, 92)
    m = np.clip((L - lo) / (hi - lo), 0, 1)
    rgb = np.clip(a.astype(np.float32) * 0 + 250, 0, 255).astype(np.uint8)  # lace drawn as ivory, tinted at render time
    rgba = np.dstack([rgb, (m * 255).astype(np.uint8)])
    Image.fromarray(rgba, 'RGBA').save(f'{D}/{out or key}_mask.png', optimize=True)
    print(out or key, im.size)
lace('lace_220632'); lace('lace_221112'); lace('lace_214828'); lace('lace_214853'); lace('lace_227682'); lace('lace_223050', light_on_dark=False)
# fringe: keep colours, alpha from distance to the white backing
im = Image.open(f'{D}/textile_224903.jpg').convert('RGB'); a = np.asarray(im).astype(np.float32)
bg = np.median(a[:8].reshape(-1, 3), 0)
d = np.abs(a - bg).sum(2)
m = np.clip((d - 40) / 60, 0, 1); m = gaussian_filter(m, 0.6)
Image.fromarray(np.dstack([a.astype(np.uint8), (m * 255).astype(np.uint8)]), 'RGBA').save(f'{D}/fringe_224903.png', optimize=True)
print('fringe', im.size)
