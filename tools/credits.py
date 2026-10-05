# Write CREDITS.md for the Open Images photographs used (CC BY 2.0 attribution).
import csv, json, sys, os
picked, oidir, out = sys.argv[1:4]
man = json.load(open(os.path.join(os.path.dirname(__file__), 'photo_manifest.json')))
sel = json.load(open(picked))
ids = {}
for k, v in man.items():
    if k.startswith('_'): continue
    ids.setdefault(sel[v[0]][v[1]], []).append(k)
meta = {}
for f in ['validation-images-with-rotation.csv', 'test-images-with-rotation.csv', 'train-images-boxable-with-rotation.csv']:
    p = os.path.join(oidir, f)
    if not os.path.exists(p): continue
    for r in csv.DictReader(open(p, encoding='utf-8')):
        if r['ImageID'] in ids: meta[r['ImageID']] = r
lines = ['# Credits', '', 'Song: 熱情エナモラル — 依田芳乃(CV.高田憂希)・村上巴(CV.花井美春)・佐藤心(CV.花守ゆみり)・夢見りあむ(CV.星希成奏)・久川凪(CV.立花日菜),',
         'THE IDOLM@STER CINDERELLA MASTER Passion jewelries! 004. Character art: CD jacket and card illustrations supplied by the requester. © Bandai Namco Entertainment.', '',
         '## Photographs', '', 'From the [Open Images Dataset](https://storage.googleapis.com/openimages/web/index.html), each licensed',
         '[CC BY 2.0](https://creativecommons.org/licenses/by/2.0/) by its author. Images were selected to contain no people, then upscaled',
         '(waifu2x) and colour-graded / composited for the video.', '', '| Used as | Title | Author | Source |', '|---|---|---|---|']
for pid, keys in sorted(ids.items(), key=lambda x: x[1][0]):
    m = meta.get(pid)
    if m:
        title = (m['Title'] or '(untitled)').replace('|', '/')
        lines.append(f"| {', '.join(keys)} | {title} | [{m['Author'] or 'unknown'}]({m['AuthorProfileURL']}) | [{pid}]({m['OriginalLandingURL']}) |")
    else:
        lines.append(f"| {', '.join(keys)} | — | — | Open Images {pid} |")
lines += ['', 'Fonts (SIL OFL): Shippori Mincho B1, Zen Old Mincho, Zen Kaku Gothic New, Cormorant Garamond, Playfair Display, Bodoni Moda, Pinyon Script, Cinzel.']
open(out, 'w').write('\n'.join(lines) + '\n')
print(len(ids), 'photos,', len(meta), 'with metadata')
