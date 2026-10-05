import numpy as np, soundfile as sf, librosa, onnxruntime as ort, sys
model, inp, out = sys.argv[1], sys.argv[2], sys.argv[3]
n_fft, hop, dim_f, dim_t = 7680, 1024, 3072, 256
chunk = hop * (dim_t - 1)
trim = n_fft // 2
gen = chunk - 2 * trim
mix, sr = sf.read(inp, always_2d=True)
mix = mix.T.astype(np.float32)
n = mix.shape[1]
pad = gen - n % gen
mixp = np.concatenate([np.zeros((2, trim), np.float32), mix, np.zeros((2, pad), np.float32), np.zeros((2, trim), np.float32)], 1)
so = ort.SessionOptions(); so.intra_op_num_threads = 4
sess = ort.InferenceSession(model, so, providers=['CPUExecutionProvider'])
outs = []
for i in range(0, n + pad, gen):
    w = mixp[:, i:i + chunk]
    specs = []
    for c in range(2):
        X = librosa.stft(w[c], n_fft=n_fft, hop_length=hop, window='hann', center=True, pad_mode='reflect')
        specs += [X.real[:dim_f], X.imag[:dim_f]]
    x = np.stack(specs)[None].astype(np.float32)
    y = sess.run(None, {'input': x})[0][0]
    res = []
    for c in range(2):
        Y = np.zeros((n_fft // 2 + 1, dim_t), np.complex64)
        Y[:dim_f] = y[2 * c] + 1j * y[2 * c + 1]
        res.append(librosa.istft(Y, hop_length=hop, n_fft=n_fft, window='hann', center=True, length=chunk))
    outs.append(np.stack(res)[:, trim:-trim])
    print(i // gen, end=' ', flush=True)
voc = np.concatenate(outs, 1)[:, :n] * 1.009
sf.write(out, voc.T, sr)
sf.write(out.replace('vocals', 'inst'), (mix - voc).T, sr)
print('done')
