# Vocal stem -> 16 kHz mono wav (for ASR) + 50 fps loudness envelope in dB (for alignment).
import numpy as np, soundfile as sf, librosa
v, sr = sf.read('audio/vocals.wav'); v = v.mean(1)
v16 = librosa.resample(v, orig_sr=sr, target_sr=16000)
sf.write('audio/vocals16k.wav', v16, 16000)
rms = librosa.feature.rms(y=v16, frame_length=1024, hop_length=320)[0]
np.save('audio/vdb.npy', 20 * np.log10(rms + 1e-6))
