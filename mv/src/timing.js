// Song clock: 124 BPM grid fitted to the instrumental, plus aligned lyric timings.
export const T = { bpm: 124, offset: 0.075, beat: 60 / 124, bar: 240 / 124, lines: [], end: 266 };

export async function loadTiming(url) {
  const d = await (await fetch(url)).json();
  Object.assign(T, { bpm: d.bpm, offset: d.offset, beat: d.beat, bar: d.bar, lines: d.lines });
  // display window for each line: until the next line starts (bounded)
  T.lines.forEach((l, i) => {
    const nx = T.lines[i + 1];
    l.next = nx ? nx.start : l.end + 4;
  });
  return T;
}

export const beatF = t => (t - T.offset) / T.beat;          // fractional beat index
export const barF = t => (t - T.offset) / T.bar;            // fractional bar index
export const barT = k => T.offset + k * T.bar;              // time of bar k
export const beatT = k => T.offset + k * T.beat;
// decaying pulse on every beat (1 at the hit, -> 0)
export function pulse(t, decay = 6, every = 1) {
  const b = beatF(t) / every;
  if (b < 0) return 0;
  const f = (b - Math.floor(b)) * T.beat * every;
  return Math.exp(-f * decay);
}
// rumba/tresillo accents (3+3+2 eighths) inside each bar
export function tresillo(t, decay = 8) {
  const bf = barF(t);
  if (bf < 0) return 0;
  const x = (bf - Math.floor(bf)) * 8; // eighths into bar
  const hits = [0, 3, 6];
  let best = 99;
  for (const h of hits) if (x >= h) best = Math.min(best, x - h);
  return Math.exp(-best * (T.beat / 2) * decay);
}
