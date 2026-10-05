# 熱情エナモラル — Lyric MV (fan-made)

A flamenco-themed, typography-driven lyric video for **熱情エナモラル**
(依田芳乃・村上巴・佐藤心・夢見りあむ・久川凪 / THE IDOLM@STER CINDERELLA MASTER *Passion jewelries! 004*).

Every frame is drawn by a deterministic HTML Canvas renderer (`mv/`) and captured with headless
Chromium, then encoded with ffmpeg. The only character art used is the CD cover and the card
illustrations supplied for this song. All other imagery is CC BY 2.0 photography from the Open Images
Dataset, filtered by its human-verified labels to exclude any image containing people, then hand-picked,
upscaled and graded — see [CREDITS.md](CREDITS.md).

## Art direction (v2)

One Andalusian night, from the first star to dawn. Real photographs (no people) carry the
imagery; the character art appears inside that world rather than on flat graphic backgrounds.
The candle lit in the prologue is the night's love: it becomes fire in the choruses and is blown
out at 「かわたれに目を閉じて」 as the sun takes over.

| Section | Time | Images |
|---|---|---|
| Prólogo | 0:00 | a single candle → rose / wine by candlelight / guitar / bonfire under each Spanish chant |
| Title | 0:09 | flame on black, title typography |
| I Noche | 0:16 | star field (with glints) → two candles (躊躇う吐息 重なる手と手) → cold blue sea (凍える身体) → palms warming (熱帯夜) |
| II Carmín | 0:30 | lipstick, a handwritten note, red velvet curtain (纏う深紅), Yoshino's night card (濃紺の宵) |
| III Calor | 0:38 | Yoshino by candlelight with a faint double (「らしくない」私), embers building to the chorus |
| IV Enamorar | 0:48 | fire-burn reveal of the cover, fountain of light, member crops, roses, burning cover |
| Intermedio | 1:09 | guitar macros |
| V Mar | 1:19 | lighthouse, blurred harbour lights, a necklace (揃いのピアス), seaside card |
| VI Beso | 1:34 | dew on a rose, a corridor of light (「連れ去って」) |
| VII Campanas | 1:42 | bell tower, defocused lights, spires against dusk |
| VIII Lucero | 1:52 | Alhambra card with the morning star, sinking moon, clock & pocket watch (時は過ぎ行く), fizz (うたかた) |
| IX Baile | 2:13 | Nagi dancing in front of a fire-lit Nasrid tile wall with her shadow thrown across it; one shot per bar |
| X Aurora | 2:46 | sunrise over the lake, palms at dawn, Yoshino in the morning mist |
| XI Especial | 3:11 | editorial spread: crimson satin, portraits changing per line, 熱情 |
| XII Amanecer | 3:29 | dawn clouds through the cover, roses on the beat (繚乱), the candle goes out (かわたれ) |
| Fin | 3:58 | morning-after still lifes with the cast credits, end card |

Finishing: per-photo film grade (S-curve, split toning, halation), bloom, gate weave, grain,
letterbox during verses that opens on the choruses. Transitions: defocus, dissolve, whip-pan,
exposure flash and a fire-burn matte made from a fire photograph.

Lyrics: each line fades in as a phrase ~0.35 s before it is sung; a quiet highlight follows the
aligned vocal; lines hold until the sung (including sustained) note ends. Verses use vertical
columns or a rolling two-line stack; choruses alternate left/right with gold rules.

## Reproduce

```bash
npm i                       # playwright (uses the preinstalled Chromium)
tools/fetch_fonts.sh        # OFL fonts from google/fonts
# put the media in place (not committed):
#   mv/assets/audio/song.mp3
#   mv/assets/img/{cover.jpg,yoshino_cut.png,yoshino_night.png,nagi_cut.png,nagi_shin_alhambra.png}
# optional 2x waifu2x upscales -> mv/assets/img/up/ (see tools/w2x.py)
python3 tools/fetch_photos.py [--upscale <waifu2x swin_unet/photo/noise1_scale2x.onnx>]   # photos -> mv/assets/photos/
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
6b. `python tools/fix_timing.py` — manual start/hold corrections verified with Whisper
7. `python tools/wh.py a:b c:d …` — Whisper spot-checks

Models: `Kim_Vocal_2.onnx` (TRvlvr/model_repo releases), `sherpa-onnx-zipformer-ja-reazonspeech-2024-08-01`
and `sherpa-onnx-whisper-turbo` (k2-fsa/sherpa-onnx releases), waifu2x `swin_unet/art` (nagadomi/nunif releases).

Unofficial fan work; song and character art © their respective rights holders.
