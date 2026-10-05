# 熱情エナモラル — Lyric MV (fan-made)

A flamenco-themed, typography-driven lyric video for **熱情エナモラル**
(依田芳乃・村上巴・佐藤心・夢見りあむ・久川凪 / THE IDOLM@STER CINDERELLA MASTER *Passion jewelries! 004*).

Every frame is drawn by a deterministic HTML Canvas renderer (`mv/`) and captured with headless
Chromium, then encoded with ffmpeg. The only character art used is the CD cover and the card
illustrations supplied for this song; every other visual (fans, roses, petals, lace, Nasrid tiles,
Córdoba arches, stars, moon, sea, silk, embers) is generated procedurally in `mv/src/fx.js`,
so no stock imagery and no other people appear.

## Art direction

| Section | Time | Concept |
|---|---|---|
| Prólogo | 0:00 | "Vamos a bailar / Te quiero mucho / ¡Olé!" — each chant opens on a folding-fan wipe; crimson, ink, polka-dot ivory, sunburst |
| Title | 0:09 | Cover art inside a Córdoba horseshoe arch with red/ivory voussoirs |
| I Noche estrellada | 0:16 | Starry sky, constellation drawn line by line, lantern-lit Andalusian arcade; vertical 縦書き lyric columns |
| II Carmín | 0:30 | Rouge brush strokes, crimson silk flood for 纏う深紅, the navy evening card for 濃紺の宵に靡いてく |
| III Calor | 0:38 | Heat build: a giant fan unfolds over the pre-chorus, embers, heartbeat rings |
| IV Enamorar | 0:48 | Chorus: cover as a rising sun disc, skewed member panels, full art with petals |
| Interludio | 1:09 | Vintage *cartel* poster with the dancer cut-out |
| V–VII | 1:19 | Moonlit sea → seaside card, blooming rose (kiss), bell rings fading to "ふたり" |
| VIII Lucero del alba | 1:52 | Alhambra card, morning star, clock ring, bubble (うたかた), guitar strings |
| IX Baile | 2:13 | Dance break: Nasrid tile kaleidoscope, marquee, one composition per bar |
| X Aurora | 2:46 | Sunrise over the sea, Yoshino cut-out for 抱きしめて |
| XI Especial | 3:10 | Split polka-dot poster, 熱情 stamp, member portraits |
| XII Amanecer | 3:29 | Final chorus: dawn gold, rose field 繚乱, arcade of member arches, pale かわたれ fade |
| Fin | 3:58 | Polaroid gallery → end card with credits |

Lyrics are timed per character: the vocal stem was separated (UVR MDX-Net), recognised with a
Japanese transducer model, force-aligned to the known lyrics with a semi-Markov DP, and each line was
cross-checked with Whisper. Beats are on a fitted 124 BPM grid.

## Reproduce

```bash
npm i                       # playwright (uses the preinstalled Chromium)
tools/fetch_fonts.sh        # OFL fonts from google/fonts
# put the media in place (not committed):
#   mv/assets/audio/song.mp3
#   mv/assets/img/{cover.jpg,yoshino_cut.png,yoshino_night.png,nagi_cut.png,nagi_shin_alhambra.png}
# optional 2x waifu2x upscales -> mv/assets/img/up/ (see tools/w2x.py)
node render/stills.cjs out/stills 12.5 50 90      # review frames
node render/render.cjs out/netsujo_enamoral_lyric_mv.mp4 --workers 4 --crf 20
```

Preview in a browser: serve `mv/` and open `index.html?play` (click to start audio) or `index.html?t=48.5` for a still.

### Timing pipeline (`tools/`, run from a work dir containing `audio/` and `models/`)

1. `ffmpeg -i song.mp3 -ar 44100 audio/song.wav`
2. `python tools/mdx.py models/Kim_Vocal_2.onnx audio/song.wav audio/vocals.wav` — vocal stem
3. `python tools/vocal_env.py` — 16 kHz vocal + loudness envelope
4. `python tools/rzwin.py audio/vocals16k.wav audio/rz_voc.json` — sherpa-onnx ReazonSpeech, overlapping windows
5. `python tools/align.py audio/rz_voc.json audio/align_voc.json` — forced alignment to `mv/data/lyrics.json`
6. `python tools/build_timing.py` — writes `mv/data/timing.json` (per-line and per-character times)
7. `python tools/wh.py a:b c:d …` — Whisper spot-checks

Models: `Kim_Vocal_2.onnx` (TRvlvr/model_repo releases), `sherpa-onnx-zipformer-ja-reazonspeech-2024-08-01`
and `sherpa-onnx-whisper-turbo` (k2-fsa/sherpa-onnx releases), waifu2x `swin_unet/art` (nagadomi/nunif releases).

Unofficial fan work; song and character art © their respective rights holders.
