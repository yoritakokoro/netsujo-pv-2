# Download the Open Images photos used by the video, upscale (optional) and grade them.
# usage: python tools/fetch_photos.py [--upscale path/to/waifu2x_swin_unet_photo_noise1_scale2x.onnx]
import json, os, subprocess, sys, urllib.request
here = os.path.dirname(os.path.abspath(__file__)); root = os.path.dirname(here)
ids = json.load(open(os.path.join(here, 'photo_ids.json')))
raw = os.path.join(root, 'work', 'photos_raw'); up = os.path.join(root, 'work', 'photos_up'); out = os.path.join(root, 'mv', 'assets', 'photos')
for d in (raw, up, out): os.makedirs(d, exist_ok=True)
for k, v in ids.items():
    p = os.path.join(raw, v['id'] + '.jpg')
    if not os.path.exists(p): urllib.request.urlretrieve(v['url'], p)
if '--upscale' in sys.argv:
    model = sys.argv[sys.argv.index('--upscale') + 1]
    todo = [os.path.join(raw, v['id'] + '.jpg') for v in ids.values() if not os.path.exists(os.path.join(up, v['id'] + '.png'))]
    if todo: subprocess.run([sys.executable, os.path.join(here, 'w2x.py'), model, up, *todo], check=True)
# picked.json-compatible mapping for grade.py
pk = {}; man = {}
for k, v in ids.items():
    pk.setdefault('all', []).append(v['id']); man[k] = ['all', len(pk['all']) - 1, v['grade']]
tmp = os.path.join(root, 'work', 'picked_all.json'); json.dump(pk, open(tmp, 'w'))
mp = os.path.join(here, 'photo_manifest.json'); keep = open(mp).read()
try:
    json.dump(man, open(mp, 'w'), indent=1)
    subprocess.run([sys.executable, os.path.join(here, 'grade.py'), tmp, up, raw, out], check=True)
finally:
    open(mp, 'w').write(keep)
