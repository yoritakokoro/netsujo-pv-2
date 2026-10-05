# 熱情エナモラル — Lyric MV (fan-made)

A flamenco-themed, typography-driven lyric video for **熱情エナモラル**
(依田芳乃・村上巴・佐藤心・夢見りあむ・久川凪 / THE IDOLM@STER CINDERELLA MASTER *Passion jewelries! 004*).

Every frame is drawn by a deterministic HTML Canvas renderer (`mv/`) and captured with headless
Chromium, then encoded with ffmpeg. The only character art used is the CD cover and the card
illustrations supplied for this song. All other imagery is CC BY 2.0 photography from the Open Images
Dataset, filtered by its human-verified labels to exclude any image containing people, then hand-picked,
upscaled and graded — see [CREDITS.md](CREDITS.md).

## Art direction (v4)

A flamenco night told in **shot sizes and camera moves**: wide establishing shots, two-shots,
close-ups and object inserts, with a parallax camera (push-ins, pull-backs, pans, tilts, dutch angles).
The standing art is used at the size each shot needs — full figure only where it means something
(the dance-break shadow play, the bell tower), otherwise framed on the face.

* **Outfits come in sets**: stage costumes with stage costumes (chants, choruses, call-and-response
  splits, roll call, line-up), private clothes with private clothes (verse 2 polaroids, B2, bridge, credits).
* **Official colours**: 依田芳乃 #C4BCB7 · 久川凪 #F8A4BD · 佐藤心 #F04E98 · 村上巴 #AB192C · 夢見りあむ #E89CDC.
  No singer labels on the lyrics.
* **Spanish decorative art from The Met (public domain)**: Valencian lustreware dishes turn as halos behind
  heads, azulejo / cuerda-seca tiles and silk damasks feed the kaleidoscopes and tile walls, real fans open
  on the beat, mantillas, Spanish earrings, Baroque guitars, pocket watches, ironwork, Alhambra photographs
  and a painted sky ceiling. A fringe valance and lace borders frame the stage.
* **Collage / polaroids** for memory: the title, the B1 vanity, the guitar table (interlude), verse 2
  summer polaroids that develop, the final "Lleno de amor" polaroid and the credits wall.
* Chibis where the mood is playful: interlude table, beach strip, dance-break stage, end card.

## Reproduce

```bash
npm i                       # playwright (uses the preinstalled Chromium)
tools/fetch_fonts.sh        # OFL fonts from google/fonts
# put the media in place (not committed):
#   mv/assets/audio/song.mp3
#   mv/assets/img/{cover.jpg,yoshino_cut.png,yoshino_night.png,nagi_cut.png,nagi_shin_alhambra.png}
# optional 2x waifu2x upscales -> mv/assets/img/up/ (see tools/w2x.py)
python3 tools/fetch_photos.py [--upscale <waifu2x swin_unet/photo/noise1_scale2x.onnx>]   # photos -> mv/assets/photos/
# v3: character stickers / halftones / papers (chars = the uploaded IMG_62xx files)
python3 tools/prepare_v3.py <waifu2x swin_unet/art/noise1_scale2x.onnx> <chars dir>
python3 tools/cutout_objects.py <rembg isnet-general-use.onnx> mv/assets/v3 c2_guitar d_rose ...   # object cut-outs
# v4: The Met open access (metmuseum/openaccess MetObjects.csv; images from the gcs-public-data--met bucket)
python3 tools/met_assets.py <isnet-general-use.onnx> <met image dir> tools/met_pick.json mv/assets/met && python3 tools/met_lace.py
# v4 standing art: waifu2x 2x again on the v3 upscales -> mv/assets/v4/*.png, cover -> mv/assets/v4/cover4x.jpg
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
6c. `python tools/singers.py` — singer part assignments per line
7. `python tools/wh.py a:b c:d …` — Whisper spot-checks

Models: `Kim_Vocal_2.onnx` (TRvlvr/model_repo releases), `sherpa-onnx-zipformer-ja-reazonspeech-2024-08-01`
and `sherpa-onnx-whisper-turbo` (k2-fsa/sherpa-onnx releases), waifu2x `swin_unet/art` (nagadomi/nunif releases).

Unofficial fan work; song and character art © their respective rights holders.
