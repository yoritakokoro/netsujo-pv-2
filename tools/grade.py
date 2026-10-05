# Film-style grading for the Open Images photos used in the video.
# filmic S-curve + matte black lift, split toning, channel mix, halation (red bloom around highlights).
# usage: python tools/grade.py <picked.json> <upscaled_dir> <src_img_dir> <out_dir>
import json, os, sys
import numpy as np
from PIL import Image
from scipy.ndimage import gaussian_filter

PRESETS = {
    #           sat   mix(r,g,b)          shadow tint            highlight tint         contrast lift  white  halation(th, r, tint, s)
    'night':   (0.85, (1.00, 0.98, 1.02), (0.02, 0.05, 0.16), (0.20, 0.10, -0.03), 0.40, 0.025, 0.97, (0.72, 22, (1.0, 0.45, 0.2), 0.40)),
    'cold':    (0.70, (0.96, 1.00, 1.06), (0.01, 0.05, 0.15), (0.02, 0.06, 0.12), 0.32, 0.035, 0.96, (0.78, 20, (0.65, 0.75, 1.0), 0.28)),
    'crimson': (1.10, (1.08, 0.90, 0.95), (0.10, 0.00, 0.035), (0.10, 0.03, 0.00), 0.45, 0.020, 0.97, (0.66, 22, (1.0, 0.30, 0.25), 0.45)),
    'ember':   (1.05, (1.04, 0.97, 0.90), (0.05, 0.01, 0.00), (0.14, 0.06, -0.04), 0.50, 0.010, 0.98, (0.62, 26, (1.0, 0.42, 0.10), 0.50)),
    'gold':    (0.95, (1.03, 1.00, 0.92), (0.04, 0.025, 0.05), (0.16, 0.11, 0.00), 0.36, 0.030, 0.97, (0.68, 24, (1.0, 0.70, 0.30), 0.40)),
    'dawn':    (0.85, (1.03, 0.99, 0.98), (0.09, 0.05, 0.14), (0.14, 0.07, 0.03), 0.22, 0.080, 0.96, (0.68, 26, (1.0, 0.60, 0.45), 0.40)),
    'dusk':    (0.80, (1.00, 0.97, 1.04), (0.07, 0.03, 0.16), (0.16, 0.07, 0.04), 0.36, 0.040, 0.96, (0.74, 22, (1.0, 0.50, 0.40), 0.35)),
    'daynight':(0.55, (0.50, 0.58, 0.80), (0.02, 0.04, 0.14), (0.10, 0.06, 0.02), 0.40, 0.020, 0.92, (0.80, 20, (1.0, 0.55, 0.35), 0.20)),
    'mono':    (0.15, (1.00, 1.00, 1.00), (0.035, 0.03, 0.045), (0.11, 0.075, 0.02), 0.45, 0.040, 0.96, (0.74, 20, (1.0, 0.60, 0.30), 0.30)),
}

def grade(rgb, preset):
    sat, mix, sh, hl, con, lift, white, (th, rad, htint, hs) = PRESETS[preset]
    x = rgb.astype(np.float32) / 255.0
    lum = (x * [0.299, 0.587, 0.114]).sum(2, keepdims=True)
    x = lum + (x - lum) * sat
    x = x * np.array(mix, np.float32)
    # filmic S-curve blended by contrast amount
    s = 1 / (1 + np.exp(-7 * (x - 0.5)))
    s = (s - 1 / (1 + np.exp(3.5))) / (1 / (1 + np.exp(-3.5)) - 1 / (1 + np.exp(3.5)))
    x = x * (1 - con) + s * con
    x = lift + x * (white - lift)
    lum = (x * [0.299, 0.587, 0.114]).sum(2, keepdims=True)
    x = x + np.array(sh, np.float32) * (1 - lum) ** 2 + np.array(hl, np.float32) * lum ** 2
    # halation on a downscaled copy (cheap, very soft)
    h, w = lum.shape[:2]
    small = Image.fromarray((np.clip(lum[..., 0], 0, 1) * 255).astype(np.uint8)).resize((w // 4, h // 4), Image.BILINEAR)
    hi = np.clip((np.asarray(small, np.float32) / 255 - th) / (1 - th), 0, 1)
    hi = gaussian_filter(hi, rad / 4)
    hi = np.asarray(Image.fromarray((hi * 255).astype(np.uint8)).resize((w, h), Image.BILINEAR), np.float32) / 255
    x = x + hi[..., None] * np.array(htint, np.float32) * hs
    return np.clip(x * 255 + 0.5, 0, 255).astype(np.uint8)

def main():
    picked, updir, srcdir, out = sys.argv[1:5]
    man = json.load(open(os.path.join(os.path.dirname(__file__), 'photo_manifest.json')))
    sel = json.load(open(picked))
    os.makedirs(out, exist_ok=True)
    only = set(sys.argv[5].split(',')) if len(sys.argv) > 5 else None
    for key, v in man.items():
        if key.startswith('_') or (only and key not in only):
            continue
        cat, idx, preset = v
        pid = sel[cat][idx]
        src = os.path.join(updir, pid + '.png')
        if not os.path.exists(src):
            src = os.path.join(srcdir, pid + '.jpg')
        try:
            im = Image.open(src).convert('RGB')
        except OSError:  # upscale still being written: fall back to the original
            im = Image.open(os.path.join(srcdir, pid + '.jpg')).convert('RGB')
        if im.width > 2048:
            im = im.resize((2048, round(im.height * 2048 / im.width)), Image.LANCZOS)
        g = grade(np.asarray(im), preset)
        Image.fromarray(g).save(os.path.join(out, key + '.jpg'), quality=92, subsampling=0)
        print(key, pid, preset, im.size, flush=True)

if __name__ == '__main__':
    main()
