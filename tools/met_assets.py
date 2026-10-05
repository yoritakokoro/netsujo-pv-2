# Prepare The Met open-access (public domain) objects used in v4.
# 1) object cut-outs (isnet-general-use) for dishes, fans, shawls, jewels, guitars, watches, ironwork
# 2) trimmed textures for tiles / textiles / lace / photos
# usage: python tools/met_assets.py <isnet-general-use.onnx> <met image dir> <pick json> <out dir>
import sys, os, json, numpy as np, onnxruntime as ort
from PIL import Image
from scipy.ndimage import gaussian_filter, binary_fill_holes, label, binary_erosion
model, src, pick, out = sys.argv[1:5]
os.makedirs(out, exist_ok=True)
P = json.load(open(pick))
so = ort.SessionOptions(); so.intra_op_num_threads = 4
sess = ort.InferenceSession(model, so, providers=['CPUExecutionProvider'])
CUT = {'dish', 'jar', 'fan', 'shawl', 'jewel', 'guitar', 'watch', 'iron', 'rose_obj'}
def load(i, maxs=1800):
    im = Image.open(os.path.join(src, i + '.jpg')).convert('RGB')
    im.thumbnail((maxs, maxs), Image.LANCZOS); return im
def segment(im):
    x = np.asarray(im.resize((1024, 1024), Image.BILINEAR), np.float32) / 255.0
    x = (x - 0.5).transpose(2, 0, 1)[None].astype(np.float32)
    m = sess.run(None, {sess.get_inputs()[0].name: x})[0][0, 0]
    m = (m - m.min()) / (m.max() - m.min() + 1e-6)
    m = np.asarray(Image.fromarray((m * 255).astype(np.uint8)).resize(im.size, Image.BILINEAR), np.float32) / 255
    hard = m > 0.5
    lab, n = label(hard)
    if n > 1:
        sz = np.bincount(lab.ravel()); sz[0] = 0; hard = (sz >= sz.max() * 0.06)[lab]
    hard = binary_fill_holes(hard)
    soft = np.clip(gaussian_filter(hard.astype(np.float32), 1.2), 0, 1)
    a = np.where(hard, np.maximum(soft, m), soft * m)
    return np.clip(a, 0, 1)
def trim(im, thr=18):
    a = np.asarray(im, np.float32)
    bg = np.median(np.concatenate([a[:6].reshape(-1, 3), a[-6:].reshape(-1, 3), a[:, :6].reshape(-1, 3), a[:, -6:].reshape(-1, 3)]), 0)
    diff = np.abs(a - bg).sum(2) > thr * 3
    ys, xs = np.nonzero(diff)
    if len(ys) < 100: return im
    y0, y1 = np.percentile(ys, 1.5), np.percentile(ys, 98.5); x0, x1 = np.percentile(xs, 1.5), np.percentile(xs, 98.5)
    pad_x, pad_y = (x1 - x0) * 0.04, (y1 - y0) * 0.04   # inset to drop frames / colour charts
    return im.crop((int(x0 + pad_x), int(y0 + pad_y), int(x1 - pad_x), int(y1 - pad_y)))
man = {}
for cat, ids in P.items():
    for i in ids:
        im = load(i)
        key = f'{cat}_{i}'
        if cat in CUT:
            a = segment(im)
            ys, xs = np.nonzero(a > 0.05)
            pad = 10
            y0, y1, x0, x1 = max(0, ys.min() - pad), min(im.height, ys.max() + pad), max(0, xs.min() - pad), min(im.width, xs.max() + pad)
            rgba = np.dstack([np.asarray(im), (a * 255).astype(np.uint8)])[y0:y1, x0:x1]
            Image.fromarray(rgba, 'RGBA').save(os.path.join(out, key + '.png'), optimize=True)
            man[key] = {'cat': cat, 'id': i, 'w': int(x1 - x0), 'h': int(y1 - y0), 'cut': True, 'cover': float((a > 0.5).mean())}
        else:
            t = trim(im) if cat in ('tile', 'textile', 'lace', 'rose') else im
            t.save(os.path.join(out, key + '.jpg'), quality=90)
            man[key] = {'cat': cat, 'id': i, 'w': t.width, 'h': t.height, 'cut': False}
        print(key, man[key]['w'], man[key]['h'], flush=True)
json.dump(man, open(os.path.join(out, 'met_manifest.json'), 'w'), indent=1)
