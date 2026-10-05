import json, numpy as np, pykakasi, sys
kks = pykakasi.kakasi()
FR = 20  # frames per second
L = json.load(open('mv/data/lyrics.json'))
toks = json.load(open(sys.argv[1]))
db = np.load('audio/vdb.npy')  # 50 fps
T = int(270 * FR)
dbf = np.interp(np.arange(T) / FR, np.arange(len(db)) / 50, db)
act = 1 / (1 + np.exp(-(dbf + 26) / 3))  # soft vocal activity

def hira(s):
    return ''.join(x['hira'] for x in kks.convert(s))
SMALL = set('ゃゅょぁぃぅぇぉゎー')
def units(k):
    out = []
    for ch in k:
        if (ch in SMALL or ch == 'っ') and out: out[-1] += ch
        else: out.append(ch)
    return out
VOW = {}
for row, v in [('あかさたなはまやらわがざだばぱぁゃ', 'a'), ('いきしちにひみりぎじぢびぴぃ', 'i'), ('うくすつぬふむゆるぐずづぶぷぅゅ', 'u'), ('えけせてねへめれげぜでべぺぇ', 'e'), ('おこそとのほもよろをごぞどぼぽぉょ', 'o'), ('ん', 'n')]:
    for c in row: VOW[c] = v
def vowel(u):
    for c in reversed(u):
        if c in VOW: return VOW[c]
    return 'a'
def head(u): return u[0]

# evidence
kanaset = {}
E = {}
V = {v: np.zeros(T) for v in 'aiueon'}
tg = np.arange(T) / FR
def addg(arr, t, w, sig=0.10):
    i0, i1 = max(0, int((t - 4*sig) * FR)), min(T, int((t + 4*sig) * FR) + 1)
    arr[i0:i1] += w * np.exp(-0.5 * ((tg[i0:i1] - t) / sig) ** 2)
for t, tok, win in toks:
    h = hira(tok)
    us = units(h) if h else []
    for i, u in enumerate(us):
        tt = t + i * 0.13
        c = head(u)
        E.setdefault(c, np.zeros(T)); addg(E[c], tt, 1.0)
        addg(V[vowel(u)], tt, 1.0)
for k in E: E[k] = np.minimum(E[k] / 3, 1.5)
for k in V: V[k] = np.minimum(V[k] / 3, 1.5)
ZERO = np.zeros(T)

def align(lines, t0, t1):
    f0, f1 = int(t0 * FR), int(t1 * FR)
    n = f1 - f0
    # unit list: ('gap',) or ('k', unit, lineidx, last)
    U = [('gap', -1)]
    for li in lines:
        us = units(L[li]['kana'])
        for j, u in enumerate(us): U.append(('k', u, li, j == len(us) - 1))
        U.append(('gap', li))
    m = len(U)
    S = np.zeros((m, n))
    for j, u in enumerate(U):
        if u[0] == 'gap':
            S[j] = 0.55 * (1 - act[f0:f1]) - 0.15
        else:
            S[j] = 1.0 * E.get(head(u[1]), ZERO)[f0:f1] + 0.35 * V[vowel(u[1])][f0:f1] + 0.25 * act[f0:f1] - 0.35
    C = np.concatenate([np.zeros((m, 1)), np.cumsum(S, 1)], 1)  # C[j, f] = sum S[j, :f]
    NEG = -1e9
    D = np.full((m + 1, n + 1), NEG); D[0, 0] = 0
    B = np.zeros((m + 1, n + 1), dtype=np.int32)
    for j, u in enumerate(U):
        if u[0] == 'gap':
            dmin, dmax = 0, int(12 * FR)
            pen = lambda d: np.zeros_like(d, dtype=float)
        else:
            dmin, dmax = 1, int((3.0 if u[3] else 1.6) * FR)
            lim = 16 if u[3] else 9
            pen = lambda d, lim=lim: -0.06 * np.maximum(0, d - lim)
        best = np.full(n + 1, NEG); bd = np.zeros(n + 1, dtype=np.int32)
        for d in range(dmin, dmax + 1):
            f = np.arange(d, n + 1)
            cand = D[j, f - d] + (C[j, f] - C[j, f - d]) + pen(np.array(d))
            better = cand > best[f]
            best[f] = np.where(better, cand, best[f]); bd[f] = np.where(better, d, bd[f])
        D[j + 1] = best; B[j + 1] = bd
    # backtrack
    f = n; spans = []
    for j in range(m, 0, -1):
        d = B[j, f]; spans.append((j - 1, f - d, f)); f -= d
    spans.reverse()
    res = {}
    for j, a, b in spans:
        u = U[j]
        if u[0] == 'k':
            res.setdefault(u[2], []).append((u[1], (f0 + a) / FR, (f0 + b) / FR))
    return res

regions = [(range(4, 23), 15.5, 71.0), (range(23, 40), 79.5, 135.0), (range(40, 65), 166.5, 240.0)]
out = {}
for lines, a, b in regions:
    out.update(align(list(lines), a, b))
json.dump({str(k): v for k, v in out.items()}, open(sys.argv[2], 'w'), ensure_ascii=False)
for li in sorted(out):
    us = out[li]
    print(f"{li:2d} {us[0][1]:7.2f}-{us[-1][2]:7.2f}  {L[li]['text']}  |", ' '.join(f"{u}{s:.1f}" for u, s, e in us[:6]))
