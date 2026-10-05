# Percussion + loudness features on the 124 BPM 16th-note grid, for beat-reactive motion.
# HPSS -> band onset flux (kick / snare+snap / hat) -> local normalisation -> max per 16th cell.
#   python3 tools/drums.py      (writes mv/data/drums.json)
import json, numpy as np, librosa
from scipy.ndimage import uniform_filter1d, maximum_filter1d

y, sr = librosa.load('mv/assets/audio/song.mp3', sr=44100, mono=True)
HOP, NFFT = 256, 2048
S = np.abs(librosa.stft(y, n_fft=NFFT, hop_length=HOP)) ** 2
H, P = librosa.decompose.hpss(S, kernel_size=(17, 17))
freqs = librosa.fft_frequencies(sr=sr, n_fft=NFFT); dt = HOP / sr
LP = np.log1p(1e3 * P / P.max())

def flux(lo, hi):
    e = LP[(freqs >= lo) & (freqs < hi)].T
    mx = maximum_filter1d(e, 3, axis=1)
    f = np.clip(e[2:] - mx[:-2], 0, None).sum(1)
    return np.concatenate([[0, 0], f])

E = {'kick': flux(35, 130), 'snare': flux(150, 350) / 1 + 0, 'snap': flux(1200, 5000), 'hat': flux(7000, 16000)}
E['snare'] = E['snare'] / (np.percentile(E['snare'], 99) + 1e-9) + E['snap'] / (np.percentile(E['snap'], 99) + 1e-9)
rms = librosa.feature.rms(S=np.sqrt(S), frame_length=NFFT, hop_length=HOP)[0]

BPM, T0 = 124.0, 0.075
step = 60 / BPM / 4
n = int((len(y) / sr - T0) / step)
tk = T0 + np.arange(n) * step
out = {'step': step, 't0': T0}
for k in ['kick', 'snare', 'hat']:
    e = E[k] - uniform_filter1d(E[k], int(0.15 / dt)); e = np.clip(e, 0, None)
    loc = np.sqrt(uniform_filter1d(e ** 2, int(6.0 / dt))) + 1e-9
    en = e / loc
    v = np.zeros(n)
    for i in range(n):
        c = (tk[i] + 0.01) / dt; a, b = int(c - 0.03 / dt), int(c + 0.03 / dt) + 1
        v[i] = en[max(a, 0):b].max() if b > 0 else 0
    v = np.clip(v / (np.percentile(v, 98) + 1e-9), 0, 1)
    out[k] = [round(float(x), 2) for x in v]
loud = np.array([rms[max(0, int((t - step / 2) / dt)):int((t + step / 2) / dt) + 1].mean() for t in tk])
loud = uniform_filter1d(loud, 8)
loud = (loud - np.percentile(loud, 5)) / (np.percentile(loud, 99) - np.percentile(loud, 5) + 1e-9)
out['loud'] = [round(float(x), 2) for x in np.clip(loud, 0, 1)]
json.dump(out, open('mv/data/drums.json', 'w'))
print('cells', n, 'kick>0.5', int((np.array(out['kick']) > 0.5).sum()), 'snare>0.5', int((np.array(out['snare']) > 0.5).sum()))
# per-bar summary for planning the intensity curve
bars = n // 16
for b in range(0, bars, 1):
    s = slice(b * 16, b * 16 + 16)
    k = ''.join('K' if x > 0.55 else ('k' if x > 0.3 else '.') for x in out['kick'][s])
    sn = ''.join('S' if x > 0.55 else ('s' if x > 0.3 else '.') for x in out['snare'][s])
    print(f"bar {b:3d} {T0 + b * 16 * step:7.2f}s loud {np.mean(out['loud'][s]):.2f}  kick {k}  snare {sn}")
