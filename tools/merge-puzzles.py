# Збирає chess-puzzles/puzzles.json: мати (tools/build-mates.mjs) + тактика (tools/build-tactics.mjs).
# Тактика: спершу найпростіші — менше фігур, потім нижчий рейтинг; не більше 40 у розділі.
import json, sys, glob
mates, tac_files, out = sys.argv[1], sys.argv[2], sys.argv[3]
res = json.load(open(mates))
KEYS = {'fork': 'fork', 'pin': 'pin', 'skewer': 'skewer', 'discoveredAttack': 'discovered', 'deflection': 'deflection',
        'attraction': 'attraction', 'hangingPiece': 'hanging', 'promotion': 'promotion'}
tac = {}
for f in glob.glob(tac_files):
    for k, v in json.load(open(f)).items(): tac.setdefault(k, []).extend(v)
used = set()
for theme, key in KEYS.items():
    lst = [z for z in sorted(tac.get(theme, []), key=lambda z: (z[4], z[3])) if z[0] not in used][:40]
    used |= {z[0] for z in lst}
    res[key] = lst
json.dump(res, open(out, 'w'), separators=(',', ':'), ensure_ascii=False)
for k, v in res.items():
    h = {}
    for z in v: h[z[4]] = h.get(z[4], 0) + 1
    print(k.ljust(11), len(v), dict(sorted(h.items())))
