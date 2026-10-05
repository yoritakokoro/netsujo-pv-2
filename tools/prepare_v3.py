# v3 asset preparation: upscaled character stickers (white sticker border), halftone ink masks for
# character silhouettes and a handful of photos, and procedural paper textures.
# usage: python tools/prepare_v3.py <waifu2x art model> <chars dir> [--skip-upscale]
import os, sys, subprocess, json
import numpy as np
from PIL import Image, ImageFilter
from scipy.ndimage import gaussian_filter, binary_dilation, distance_transform_edt, zoom

here = os.path.dirname(os.path.abspath(__file__)); root = os.path.dirname(here)
model, chars = sys.argv[1], sys.argv[2]
OUT = os.path.join(root, 'mv', 'assets', 'v3'); os.makedirs(OUT, exist_ok=True)
WORK = os.path.join(root, 'work', 'v3up'); os.makedirs(WORK, exist_ok=True)

# key -> (file, upscale passes)
STICKERS = {
    'yo_cos': ('IMG_6235.png', 1), 'na_cos': ('IMG_6237.png', 1), 'to_cos': ('IMG_6245.png', 1),
    'shi_cos': ('IMG_6246.png', 1), 'ri_cos': ('IMG_6247.png', 1),
    'na_casual': ('IMG_6263.png', 1), 'yo_swim': ('IMG_6264.png', 1), 'shi_swim': ('IMG_6267.png', 1),
    'to_white': ('IMG_6271.png', 1), 'ri_resort': ('IMG_6273.png', 1),
    'c_yo': ('IMG_6258.png', 2), 'c_na': ('IMG_6259.png', 2), 'c_shi': ('IMG_6260.png', 2), 'c_to': ('IMG_6261.png', 2),
    'c_ri': ('IMG_6262.png', 2), 'c_yo_swim': ('IMG_6265.png', 2), 'c_na_casual': ('IMG_6266.png', 2),
    'c_shi_swim': ('IMG_6268.png', 2), 'c_to_white': ('IMG_6272.png', 2), 'c_ri_resort': ('IMG_6274.png', 2),
}

def upscale(src, passes, key):
    cur = src
    for p in range(passes):
        dst_dir = os.path.join(WORK, f'p{p}')
        os.makedirs(dst_dir, exist_ok=True)
        name = os.path.splitext(os.path.basename(cur))[0]
        dst = os.path.join(dst_dir, name + '.png')
        if not os.path.exists(dst) and '--skip-upscale' not in sys.argv:
            subprocess.run([sys.executable, os.path.join(here, 'w2x.py'), model, dst_dir, cur], check=True)
        cur = dst if os.path.exists(dst) else cur
    return cur

def sticker(rgba, border):
    a = rgba[..., 3].astype(np.float32) / 255
    pad = border * 2 + 4
    h, w = a.shape
    A = np.zeros((h + pad * 2, w + pad * 2), np.float32); A[pad:pad + h, pad:pad + w] = a
    # distance-based round outline
    d = distance_transform_edt(A < 0.5)
    out_a = np.clip((border + 0.8 - d), 0, 1)
    out_a = gaussian_filter(out_a, 0.7)
    base = np.zeros((h + pad * 2, w + pad * 2, 4), np.float32)
    base[..., :3] = [252, 249, 242]; base[..., 3] = out_a * 255
    img = np.zeros_like(base); img[pad:pad + h, pad:pad + w] = rgba.astype(np.float32)
    ia = img[..., 3:4] / 255
    res = base.copy()
    res[..., :3] = img[..., :3] * ia + base[..., :3] * (1 - ia)
    res[..., 3] = np.maximum(base[..., 3], img[..., 3])
    return res.clip(0, 255).astype(np.uint8)

def halftone(gray_dark, alpha=None, cell=8, angle=45, gamma=1.0):
    """gray_dark: 0..1 ink amount. returns ink coverage 0..1 as dots on a rotated grid."""
    h, w = gray_dark.shape
    g = gaussian_filter(gray_dark, cell * 0.35)
    if alpha is not None: g = g * alpha
    th = np.deg2rad(angle); c, s = np.cos(th), np.sin(th)
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    u = (xx * c + yy * s) / cell; v = (-xx * s + yy * c) / cell
    fu, fv = u - np.floor(u) - 0.5, v - np.floor(v) - 0.5
    d = np.sqrt(fu * fu + fv * fv) * cell
    # sample the tone at the cell centre
    cu, cv = np.floor(u) + 0.5, np.floor(v) + 0.5
    cx = (cu * c - cv * s) * cell; cy = (cu * s + cv * c) * cell
    cx = np.clip(cx, 0, w - 1).astype(np.int32); cy = np.clip(cy, 0, h - 1).astype(np.int32)
    tone = np.clip(g[cy, cx], 0, 1) ** gamma
    r = np.sqrt(tone) * cell * 0.72
    return np.clip(r - d + 0.5, 0, 1)

def save_mask(m, path):
    m8 = (np.clip(m, 0, 1) * 255).astype(np.uint8)
    rgba = np.dstack([np.full_like(m8, 255)] * 3 + [m8])
    Image.fromarray(rgba, 'RGBA').save(path, optimize=True)

def levels(x, lo, hi):
    return np.clip((x - lo) / max(1e-3, hi - lo), 0, 1)

manifest = {'stickers': {}, 'photos': {}}
for key, (fn, passes) in STICKERS.items():
    src = os.path.join(chars, fn)
    up = upscale(src, passes, key)
    im = Image.open(up).convert('RGBA')
    rgba = np.asarray(im)
    border = max(6, int(max(im.size) * 0.012))
    st = sticker(rgba, border)
    Image.fromarray(st, 'RGBA').save(os.path.join(OUT, key + '.png'), optimize=True)
    # halftone silhouette (for big graphic echoes in member ink)
    a = rgba[..., 3].astype(np.float32) / 255
    lum = (rgba[..., :3].astype(np.float32) / 255 * [0.3, 0.59, 0.11]).sum(2)
    dark = levels(1 - lum, 0.05, 0.85) * 0.8 + 0.2
    sm = Image.fromarray((a * 255).astype(np.uint8)).resize((im.width // 2, im.height // 2), Image.LANCZOS)
    smd = Image.fromarray((dark * 255).astype(np.uint8)).resize(sm.size, Image.LANCZOS)
    ht = halftone(np.asarray(smd, np.float32) / 255, np.asarray(sm, np.float32) / 255, cell=7, angle=22)
    save_mask(ht, os.path.join(OUT, key + '_ht.png'))
    manifest['stickers'][key] = {'w': st.shape[1], 'h': st.shape[0], 'border': border}
    print('sticker', key, st.shape[1], st.shape[0], flush=True)

PHOTOS = ['c1_rose1', 'b2_drop', 'ch_rose', 'slim_candle', 'fi_candle', 'ou_ring', 'ch_fire', 'c1_blaze', 'p1_embers', 'v1_stars',
          'c2_moon', 'v2_crescent', 'v2_moonbeach', 'fi_sail', 'br_sun', 'p2_bells', 'c2_clock', 'c2_pocket', 'ch_guitar', 'in_hole',
          'b1_lipstick', 'b1_letter', 'b1_curtain', 'd_tile', 'v1_palms', 'br_palms', 'c1_fountain', 'd_willow', 'ou_doily', 'v2_jewel',
          'p2_spires', 'fi_clouds']
for key in PHOTOS:
    im = Image.open(os.path.join(root, 'mv', 'assets', 'photos', key + '.jpg')).convert('RGB')
    im.thumbnail((1600, 1600), Image.LANCZOS)
    x = np.asarray(im, np.float32) / 255
    lum = (x * [0.3, 0.59, 0.11]).sum(2)
    lo, hi = np.percentile(lum, 3), np.percentile(lum, 97)
    l2 = levels(lum, lo, hi)
    # "ink" = dark areas print. For bright-subject-on-dark photos (candles, fire, stars) invert so the light prints.
    inv = lum.mean() < 0.35
    ink = l2 if inv else 1 - l2
    ht = halftone(ink, cell=7 if im.width >= 1200 else 6, angle=45 if not inv else 15, gamma=1.1)
    save_mask(ht, os.path.join(OUT, 'ht_' + key + '.png'))
    save_mask(ink ** 1.2, os.path.join(OUT, 'ink_' + key + '.png'))
    manifest['photos'][key] = {'w': im.width, 'h': im.height, 'inverted': bool(inv)}
    print('photo', key, im.size, 'inv' if inv else '', flush=True)

# paper textures
rng = np.random.default_rng(7)
def paper(base, fiber, mott, size=(1152, 2048), seed=0):
    r = np.random.default_rng(seed)
    h, w = size
    n1 = gaussian_filter(r.standard_normal((h, w)), 18); n1 /= np.abs(n1).max()
    n2 = gaussian_filter(r.standard_normal((h, w)), 2.2); n2 /= np.abs(n2).max()
    fib = np.zeros((h, w), np.float32)
    for _ in range(2600):
        y, x = r.integers(0, h), r.integers(0, w); L = r.integers(6, 40); ang = r.uniform(0, np.pi)
        for t in range(L):
            yy, xx = int(y + np.sin(ang) * t), int(x + np.cos(ang) * t)
            if 0 <= yy < h and 0 <= xx < w: fib[yy, xx] += r.uniform(0.3, 1)
    fib = gaussian_filter(fib, 0.6)
    img = np.array(base, np.float32)[None, None, :] * (1 + mott * n1[..., None] + 0.03 * n2[..., None]) - fiber * fib[..., None] * 18
    return Image.fromarray(np.clip(img, 0, 255).astype(np.uint8))
for name, base, fiber, mott in [('paper_cream', (243, 234, 216), 1.0, 0.035), ('paper_navy', (24, 30, 64), 0.5, 0.08),
                                ('paper_kraft', (206, 176, 132), 1.4, 0.05), ('paper_peach', (247, 214, 196), 0.9, 0.04),
                                ('paper_red', (178, 22, 40), 0.6, 0.07), ('paper_black', (22, 18, 20), 0.4, 0.1)]:
    paper(base, fiber, mott, seed=hash(name) % 1000).save(os.path.join(OUT, name + '.jpg'), quality=90)
    print('paper', name, flush=True)
json.dump(manifest, open(os.path.join(OUT, 'manifest.json'), 'w'), indent=1)
