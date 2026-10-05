# waifu2x swin_unet/art 2x (noise1) upscaling with tiling; alpha upscaled with Lanczos after colour bleeding
import onnxruntime as ort, numpy as np, sys, os
from PIL import Image
from scipy.ndimage import gaussian_filter
M = sys.argv[1]; so = ort.SessionOptions(); so.intra_op_num_threads = 4
sess = ort.InferenceSession(M, so, providers=['CPUExecutionProvider'])
OFF, TILE = 8, 256
def up_rgb(rgb):
    h, w, _ = rgb.shape
    step = TILE - 2 * OFF
    H2 = ((h + step - 1) // step) * step; W2 = ((w + step - 1) // step) * step
    pad = np.pad(rgb, ((OFF, OFF + H2 - h), (OFF, OFF + W2 - w), (0, 0)), mode='edge')
    out = np.zeros((H2 * 2, W2 * 2, 3), np.float32)
    for y in range(0, H2, step):
        for x in range(0, W2, step):
            tile = pad[y:y + TILE, x:x + TILE].transpose(2, 0, 1)[None]
            r = sess.run(None, {'x': tile.astype(np.float32)})[0][0].transpose(1, 2, 0)
            out[y * 2:y * 2 + step * 2, x * 2:x * 2 + step * 2] = r
    return np.clip(out[:h * 2, :w * 2], 0, 1)
for src in sys.argv[3:]:
    im = Image.open(src); name = os.path.splitext(os.path.basename(src))[0]
    a = None
    if im.mode == 'RGBA':
        arr = np.asarray(im).astype(np.float32) / 255
        rgb, a = arr[..., :3], arr[..., 3]
        # bleed colours into transparent area to avoid dark fringes
        filled = rgb.copy()
        for sig in [2, 6, 16, 40]:
            pm = gaussian_filter(rgb * a[..., None], (sig, sig, 0)); wa = gaussian_filter(a, sig)[..., None]
            est = pm / np.maximum(wa, 1e-4)
            m = (a < 0.999)[..., None] & (wa > 1e-3)
            filled = np.where((a[..., None] < 0.5) & m, est, filled)
        rgb = np.where(a[..., None] > 0.999, rgb, filled * (1 - a[..., None]) + rgb * a[..., None])
    else:
        rgb = np.asarray(im.convert('RGB')).astype(np.float32) / 255
    out = up_rgb(rgb)
    res = Image.fromarray((out * 255 + 0.5).astype(np.uint8))
    if a is not None:
        A2 = Image.fromarray((a * 255).astype(np.uint8)).resize(res.size, Image.LANCZOS)
        res.putalpha(A2)
    os.makedirs(sys.argv[2], exist_ok=True)
    res.save(os.path.join(sys.argv[2], name + '.png'), optimize=True)
    print(name, im.size, '->', res.size, flush=True)
