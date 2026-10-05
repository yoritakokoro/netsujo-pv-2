# Cut objects out of the (people-free) Open Images photos with isnet-general-use, for collage pieces.
# usage: python tools/cutout_objects.py model.onnx out_dir key1 key2 ...   (keys from mv/assets/photos)
import sys, os, numpy as np, onnxruntime as ort
from PIL import Image
from scipy.ndimage import gaussian_filter, binary_fill_holes, label
model, out = sys.argv[1], sys.argv[2]
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
so = ort.SessionOptions(); so.intra_op_num_threads = 3
sess = ort.InferenceSession(model, so, providers=['CPUExecutionProvider'])
inp = sess.get_inputs()[0].name
os.makedirs(out, exist_ok=True)
MEAN, STD = np.array([0.5, 0.5, 0.5]), np.array([1.0, 1.0, 1.0])
for key in sys.argv[3:]:
    im = Image.open(os.path.join(root, 'mv', 'assets', 'photos', key + '.jpg')).convert('RGB')
    x = np.asarray(im.resize((1024, 1024), Image.BILINEAR), np.float32) / 255.0
    x = ((x - MEAN) / STD).transpose(2, 0, 1)[None].astype(np.float32)
    m = sess.run(None, {inp: x})[0][0, 0]
    m = (m - m.min()) / (m.max() - m.min() + 1e-6)
    m = np.asarray(Image.fromarray((m * 255).astype(np.uint8)).resize(im.size, Image.BILINEAR), np.float32) / 255
    hard = m > 0.5
    lab, n = label(hard)
    if n > 1:
        sizes = np.bincount(lab.ravel()); sizes[0] = 0
        hard = (sizes >= sizes.max() * 0.08)[lab]
    hard = binary_fill_holes(hard)
    a = np.clip(gaussian_filter(hard.astype(np.float32), 1.0), 0, 1)
    ys, xs = np.nonzero(a > 0.02)
    if len(ys) == 0: print(key, 'empty'); continue
    pad = 12
    y0, y1, x0, x1 = max(0, ys.min() - pad), min(im.height, ys.max() + pad), max(0, xs.min() - pad), min(im.width, xs.max() + pad)
    rgba = np.dstack([np.asarray(im), (a * 255).astype(np.uint8)])[y0:y1, x0:x1]
    Image.fromarray(rgba, 'RGBA').save(os.path.join(out, 'obj_' + key + '.png'), optimize=True)
    print(key, im.size, '-> crop', (x1 - x0, y1 - y0), 'cover %.2f' % hard.mean(), flush=True)
