// «Мат пішаком» (m1pawn): король і 2–4 пішаки ставлять мат — рівно ОДИН хід матує, і це хід пішаком.
// Спершу — мати ходом чи взяттям пішака (пішаки й король працюють разом, зайвих фігур немає),
// потім — перетворення, де треба вибрати, ким стане пішак (кінь, ферзь, тура чи слон — матує лише одна).
// Запуск: node tools/build-pawnmates.mjs mate/puzzles.json
import fs from 'node:fs';
import { Chess, SquareSet, makeUci } from 'chessops';
import { makeFen, makeBoardFen } from 'chessops/fen';

const out = process.argv[2] || 'mate/puzzles.json';
const rnd = n => Math.floor(Math.random() * n);
const PROMOS = ['queen', 'knight', 'rook', 'bishop'];
function legal(p) {
  const res = [];
  for (const [from, ds] of p.allDests()) {
    const pc = p.board.get(from);
    for (const to of ds) {
      if (pc.role === 'king' && p.board.get(to)?.color === pc.color) continue;
      if (pc.role === 'pawn' && (to >> 3 === 7 || to >> 3 === 0)) for (const r of PROMOS) res.push({ from, to, promotion: r });
      else res.push({ from, to });
    }
  }
  return res;
}
const after = (p, m) => { const q = p.clone(); q.play(m); return q; };
const mates = p => legal(p).filter(m => after(p, m).isCheckmate());
const empty = () => { const s = Chess.default().toSetup(); s.board = s.board.clone(); for (const sq of [...s.board.occupied]) s.board.take(sq); s.castlingRights = SquareSet.empty(); return s; };
function without(p, sq) {
  const s = p.toSetup(); s.board = s.board.clone(); s.board.take(sq); s.epSquare = undefined;
  const r = Chess.fromSetup(s); return r.isOk ? r.unwrap() : null;
}
function minimal(p, valid) {
  for (let changed = true; changed;) {
    changed = false;
    for (const sq of [...p.board.occupied]) {
      if (p.board.get(sq).role === 'king') continue;
      const q = without(p, sq);
      if (q && valid(q)) { p = q; changed = true; break; }
    }
  }
  return p;
}
const count = p => p.board.occupied.size();
const whitePawns = p => p.board.pieces('white', 'pawn').size();
const onlyKP = p => [...p.board.occupied].every(sq => { const pc = p.board.get(sq); return pc.color === 'black' || pc.role === 'king' || pc.role === 'pawn'; });
const seen = new Set();

// promo: false — мат ходом пішака без перетворення; або роль, у яку треба перетворити
function generate(want, promo, perN) {
  const res = [], got = {};
  for (let t = 0; t < 2e7 && res.length < want; t++) {
    if (t % 200000 === 0) console.error(promo || 'pawn', t, res.length, JSON.stringify(got));
    const s = empty(), put = (sq, pc) => (sq < 0 || sq > 63 || s.board.get(sq) ? false : (s.board.set(sq, pc), true));
    const near = (c, d) => { const f = (c & 7) + rnd(2 * d + 1) - d, r = (c >> 3) + rnd(2 * d + 1) - d; return f < 0 || f > 7 || r < 0 || r > 7 ? -1 : r * 8 + f; };
    // чорний король — біля краю (пішаки йдуть угору)
    const bk = promo ? 56 + rnd(8) - (Math.random() < 0.3 ? 8 : 0) : (Math.random() < 0.6 ? 7 : 3 + rnd(5)) * 8 + (Math.random() < 0.4 ? [0, 7][rnd(2)] : rnd(8));
    put(bk, { role: 'king', color: 'black' });
    if (!put(near(bk, 2), { role: 'king', color: 'white' })) continue;
    if (promo && !put(48 + (bk & 7) + rnd(5) - 2, { role: 'pawn', color: 'white' })) continue;
    const np = 2 + rnd(3) - (promo ? 1 : 0);
    for (let k = 0; k < np; k++) { const sq = near(bk, 3); if (sq >= 8 && sq < 56) put(sq, { role: 'pawn', color: 'white' }); }
    const nb = promo ? 2 + rnd(4) : rnd(4);
    for (let k = 0; k < nb; k++) {
      const sq = near(bk, 1 + rnd(2));
      const role = Math.random() < (promo ? 0.45 : 0.65) ? 'pawn' : ['knight', 'bishop', 'rook', 'queen'][rnd(4)];
      if (role === 'pawn' && (sq < 8 || sq >= 56)) continue;
      put(sq, { role, color: 'black' });
    }
    s.turn = 'white';
    const r = Chess.fromSetup(s); if (!r.isOk) continue;
    let p = r.unwrap(); if (p.isCheck()) continue;
    const valid = q => {
      if (q.isCheck() || !onlyKP(q)) return false;
      const ms = mates(q); if (ms.length !== 1) return false;
      const m = ms[0]; if (q.board.get(m.from).role !== 'pawn') return false;
      return promo ? m.promotion === promo : !m.promotion;
    };
    if (!valid(p)) continue;
    const sol = makeUci(mates(p)[0]);
    p = minimal(p, q => valid(q) && makeUci(mates(q)[0]) === sol);
    if (!promo && whitePawns(p) < 2) continue; // пішаки працюють разом
    const n = count(p);
    if ((got[n] || 0) >= (perN[n] ?? 0)) continue;
    const shape = makeBoardFen(p.board); if (seen.has(shape)) continue; seen.add(shape);
    got[n] = (got[n] || 0) + 1;
    res.push([`pm-${promo || 'p'}-${n}-${res.length}`, makeFen(p.toSetup()), sol, 500 + 60 * n, n]);
  }
  console.error(promo || 'pawn', res.length, JSON.stringify(got));
  return res.sort((x, y) => x[4] - y[4]);
}

// node tools/build-pawnmates.mjs mate/puzzles.json [plain | knight | queen | merge] — частини зберігаються в tools/.pawnmates-*.json
const MODE = process.argv[3] || 'all';
const part = k => new URL(`.pawnmates-${k}.json`, import.meta.url);
const PLAN = {
  plain: () => generate(28, false, { 4: 9, 5: 9, 6: 8, 7: 4, 8: 2 }),
  // тура чи слон матують — тоді матує й ферзь, тож «лише один хід» буває тільки з конем або ферзем
  knight: () => generate(7, 'knight', { 3: 1, 4: 2, 5: 3, 6: 3, 7: 2, 8: 2 }),
  queen: () => generate(5, 'queen', { 4: 2, 5: 2, 6: 2, 7: 1, 8: 1 }),
};
for (const k of Object.keys(PLAN)) if (MODE === 'all' || MODE === k) fs.writeFileSync(part(k), JSON.stringify(PLAN[k]()));
if (MODE === 'all' || MODE === 'merge') {
  const data = JSON.parse(fs.readFileSync(out, 'utf8'));
  const get = k => JSON.parse(fs.readFileSync(part(k), 'utf8'));
  data.m1pawn = [...get('plain'), ...[...get('knight'), ...get('queen')].sort((x, y) => x[4] - y[4])];
  fs.writeFileSync(out, JSON.stringify(data));
  for (const z of data.m1pawn) console.log(z[0].padEnd(16), z[1].split(' ')[0].padEnd(30), z[2]);
}
