# Задачі з бази Lichess (CC0): https://database.lichess.org/#puzzles
# Джерело вибірки: github.com/mcognetta/lichess-combined-puzzle-game-db (перші 50 000 задач бази, CC0).
# Беремо лише прості: менше 10 фігур на дошці, популярні, рейтинг до 1500, найлегші першими.
import json, sys
SRC = sys.argv[1] if len(sys.argv) > 1 else '/tmp/puz50k.jsonl'
P = [json.loads(l) for l in open(SRC)]
pieces = lambda f: sum(c.isalpha() for c in f.split()[0])
SECTIONS = [  # ключ, тема Lichess, скільки взяти, виключити теми
  ('mate1', 'mateIn1', 100, []), ('mate2', 'mateIn2', 100, []),
  ('fork', 'fork', 60, ['mate']), ('pin', 'pin', 60, ['mate']), ('skewer', 'skewer', 60, ['mate']),
  ('discovered', 'discoveredAttack', 60, ['mate']), ('deflection', 'deflection', 60, ['mate']),
  ('hanging', 'hangingPiece', 60, ['mate']), ('promotion', 'promotion', 60, ['mate']),
]
out, used = {}, set()
for key, theme, n, excl in SECTIONS:
    c = [p for p in P if theme in p['Themes'].split() and not set(excl) & set(p['Themes'].split())
         and pieces(p['FEN']) < 10 and int(p['Popularity']) >= 60 and int(p['Rating']) <= 1500 and p['PuzzleId'] not in used]
    c.sort(key=lambda p: (pieces(p['FEN']) >= 10, int(p['Rating'])))
    c = c[:n]
    c.sort(key=lambda p: int(p['Rating']))
    used |= {p['PuzzleId'] for p in c}
    out[key] = [[p['PuzzleId'], p['FEN'], p['Moves'], int(p['Rating'])] for p in c]
    print(key, len(out[key]), 'rating', out[key][0][3], '-', out[key][-1][3], 'max pieces', max(pieces(x[1]) for x in out[key]), file=sys.stderr)
json.dump(out, open(sys.argv[2] if len(sys.argv) > 2 else 'puzzles.json', 'w'), separators=(',', ':'))
