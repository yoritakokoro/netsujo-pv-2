# Manual corrections after cross-checking the aligner against Whisper and the vocal envelope.
# - starts: lines whose first syllable the aligner placed late/early (checked by transcribing
#   windows that begin at the aligned start vs. the corrected start)
# - hold: lines that end on a sustained note; the vocal keeps going after the last aligned unit
import json, sys
p = sys.argv[1] if len(sys.argv) > 1 else 'mv/data/timing.json'
d = json.load(open(p))
START = {4: 16.20, 6: 23.65, 8: 30.35, 16: 52.00, 22: 67.00}
HOLD = {22: 70.40, 30: 111.50, 39: 134.20, 46: 191.20, 52: 208.20, 64: 238.80}
for i, l in enumerate(d['lines']):
    if i in START:
        s0, e = l['start'], l['end']; s1 = START[i]
        l['chars'] = [round(s1 + (c - s0) * (e - s1) / (e - s0), 3) for c in l['chars']]
        if i > 0 and d['lines'][i - 1]['end'] > s1:
            prev = d['lines'][i - 1]
            ps = prev['start']; prev['chars'] = [round(ps + (c - ps) * (s1 - 0.05 - ps) / (prev['end'] - ps), 3) for c in prev['chars']]
            prev['end'] = round(s1 - 0.05, 3)
        l['start'] = s1
    if i in HOLD:
        l['hold'] = HOLD[i]
json.dump(d, open(p, 'w'), ensure_ascii=False, indent=1)
print('fixed', len(START), 'starts,', len(HOLD), 'holds')
