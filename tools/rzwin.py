import sherpa_onnx, soundfile as sf, numpy as np, json, sys
m = 'models/sherpa-onnx-zipformer-ja-reazonspeech-2024-08-01/'
rec = sherpa_onnx.OfflineRecognizer.from_transducer(encoder=m+'encoder-epoch-99-avg-1.onnx', decoder=m+'decoder-epoch-99-avg-1.onnx', joiner=m+'joiner-epoch-99-avg-1.onnx', tokens=m+'tokens.txt', num_threads=4, decoding_method='modified_beam_search', max_active_paths=8)
src = sys.argv[1]
a, sr = sf.read(src)
if a.ndim > 1: a = a.mean(1)
if sr != 16000:
    import librosa; a = librosa.resample(a, orig_sr=sr, target_sr=16000); sr = 16000
toks = []
for (S0, E0) in [(15.5, 71), (79.5, 135), (166.5, 240), (240, 262)]:
    for win, hop in [(8, 4), (12, 6), (6, 3)]:
        for s in np.arange(S0, E0 - 1, hop):
            e = min(s + win, E0)
            st = rec.create_stream(); st.accept_waveform(16000, a[int(s*16000):int(e*16000)].astype(np.float32)); rec.decode_stream(st)
            r = st.result
            for t, ts in zip(r.tokens, r.timestamps):
                toks.append((float(s + ts), t, win))
    print(S0, len(toks), flush=True)
json.dump(toks, open(sys.argv[2], 'w'), ensure_ascii=False)
