import json, pykakasi, re
kks = pykakasi.kakasi()
L = json.load(open('mv/data/lyrics.json'))
A = {int(k): v for k, v in json.load(open('audio/align_voc.json')).items()}
SMALL = set('ゃゅょぁぃぅぇぉゎー')
def units(k):
    out = []
    for ch in k:
        if (ch in SMALL or ch == 'っ') and out: out[-1] += ch
        else: out.append(ch)
    return out
# manual fixes: (line, new_start)
fix = {23: 80.15, 40: 167.20}
for li, ns in fix.items():
    us = A[li]; os_, oe = us[0][1], us[-1][2]
    m = lambda t: ns + (t - os_) * (oe - ns) / (oe - os_)
    A[li] = [(u, m(s), m(e)) for u, s, e in us]
intro = {0: (1.88, 2.85), 1: (3.82, 4.70), 2: (5.74, 6.60), 3: (7.74, 8.50)}
out = []
for i, l in enumerate(L):
    text = l['text']
    if i in intro:
        s, e = intro[i]
        vis = [c for c in text]
        n = len(vis)
        ct = [s + (e - s) * j / n for j in range(n)]
        out.append(dict(i=i, sec=l['sec'], text=text, start=s, end=e, chars=[round(x, 3) for x in ct], echo=l.get('echo')))
        continue
    us = A[i]
    s, e = us[0][1], us[-1][2]
    if re.match(r'^[A-Za-z¡]', text):
        # latin: distribute characters over unit times proportionally
        n = len(text); m = len(us)
        ct = [us[min(m - 1, int(j * m / n))][1] for j in range(n)]
    else:
        # map display chars -> kana units via pykakasi segmentation
        segs = kks.convert(text)
        unit_times = [u[1] for u in us]
        ui = 0; ct = []
        for sg in segs:
            orig, hira = sg['orig'], sg['hira']
            if not re.search(r'[ぁ-んァ-ヶ一-龯々ー]', orig):
                for c in orig: ct.append(unit_times[min(ui, len(unit_times) - 1)])
                continue
            nu = len(units(hira.replace('　', '').replace(' ', '')))
            for j, c in enumerate(orig):
                if c in '　 「」、':
                    ct.append(unit_times[min(ui, len(unit_times) - 1)]); continue
                k = ui + int(j * nu / max(1, len(orig)))
                ct.append(unit_times[min(k, len(unit_times) - 1)])
            ui += nu
        if ui != len(us): print('unit mismatch', i, text, ui, len(us))
    out.append(dict(i=i, sec=l['sec'], text=text, start=round(s, 3), end=round(e, 3), chars=[round(x, 3) for x in ct], echo=l.get('echo')))
beat = 60 / 124.0
json.dump(dict(bpm=124.0, offset=0.075, beat=beat, bar=beat * 4, duration=269.0, lines=out), open('mv/data/timing.json', 'w'), ensure_ascii=False, indent=1)
for o in out: print(o['i'], o['start'], o['end'], o['text'], o['echo'] or '')
