# Inject the singer part assignments (provided by the requester) into mv/data/timing.json.
# parts: list of [first char index, singers] — a line switches singer at that character.
import json
P = {0: 'yo', 1: 'na', 2: 'shi', 3: 'all', 4: 'to', 5: 'to', 6: 'ri', 7: 'ri', 8: 'shi', 9: 'shi', 10: 'yo', 11: 'yo',
     12: 'na', 13: 'all', 14: 'all', 15: 'all', 16: 'all', 17: 'all', 18: 'all', 19: [(0, 'to'), (5, 'na')],
     20: [(0, 'ri'), (5, 'yo')], 21: 'shi', 22: 'all', 23: 'na', 24: 'na', 25: 'yo', 26: 'yo', 27: 'to', 28: 'shi',
     29: 'ri', 30: 'all', 31: 'all', 32: 'all', 33: 'all', 34: 'all', 35: 'all', 36: [(0, 'shi'), (5, 'to')],
     37: [(0, 'na'), (5, 'ri')], 38: 'yo', 39: 'all', 40: 'na', 41: 'na', 42: 'yo', 43: 'yo', 44: 'to', 45: 'shi', 46: 'shi',
     47: 'all', 48: 'yo', 49: 'yo', 50: 'all', 51: 'na', 52: 'shi', 53: 'all', 54: 'all', 55: 'all', 56: 'all', 57: 'all',
     58: [(0, 'to'), (5, 'ri')], 59: [(0, 'to'), (5, 'ri')], 60: 'na', 61: [(0, 'to+ri'), (5, 'yo+na+shi')],
     62: [(0, 'to+ri'), (5, 'yo+na+shi')], 63: 'all', 64: 'all'}
p = 'mv/data/timing.json'
d = json.load(open(p))
for i, l in enumerate(d['lines']):
    v = P[i]
    parts = [(0, v)] if isinstance(v, str) else v
    l['parts'] = [{'from': a, 'who': (['yo', 'na', 'shi', 'to', 'ri'] if w == 'all' else w.split('+'))} for a, w in parts]
json.dump(d, open(p, 'w'), ensure_ascii=False, indent=1)
print('ok', sum(len(l['parts']) for l in d['lines']), 'parts')
