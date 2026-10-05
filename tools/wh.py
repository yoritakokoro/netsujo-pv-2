import sherpa_onnx, soundfile as sf, numpy as np, sys
m = 'models/sherpa-onnx-whisper-turbo/'
rec = sherpa_onnx.OfflineRecognizer.from_whisper(encoder=m+'turbo-encoder.int8.onnx', decoder=m+'turbo-decoder.int8.onnx', tokens=m+'turbo-tokens.txt', language='ja', task='transcribe', num_threads=4, tail_paddings=1000)
a, sr = sf.read(sys.argv[1] if sys.argv[1].endswith('.wav') else 'audio/vocals16k.wav')
args = sys.argv[2:] if sys.argv[1].endswith('.wav') else sys.argv[1:]
for s, e in [(float(x.split(':')[0]), float(x.split(':')[1])) for x in args]:
    st = rec.create_stream(); st.accept_waveform(16000, a[int(s*16000):int(e*16000)].astype(np.float32)); rec.decode_stream(st)
    print(f'[{s:.2f}-{e:.2f}]', st.result.text, flush=True)
