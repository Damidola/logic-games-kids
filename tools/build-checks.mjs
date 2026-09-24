// Задачі на шах (складені й перевірені правилами chessops):
//  «Постав шах» фігурою — турою, слоном, ферзем, конем, пішаком: спершу 3 фігури, далі 4–5.
//  «Урятуйся від шаху» — білому королю шах: утечі, побий того, хто шахує, закрийся, і «різні»
//  (у «різних» рятує лише один хід). Запуск: node tools/build-checks.mjs mate/puzzles.json
import fs from 'node:fs';
import { Chess, SquareSet, makeUci } from 'chessops';
import { makeFen, makeBoardFen } from 'chessops/fen';

const out = process.argv[2] || 'mate/puzzles.json';
const rnd = n => Math.floor(Math.random() * n);
const ROLES = ['queen', 'rook', 'bishop', 'knight'];
function legal(p) {
  const res = [];
  for (const [from, ds] of p.allDests()) {
    const pc = p.board.get(from);
    for (const to of ds) {
      if (pc.role === 'king' && p.board.get(to)?.color === pc.color) continue; // рокіровка не потрібна
      if (pc.role === 'pawn' && (to >> 3 === 7 || to >> 3 === 0)) res.push({ from, to, promotion: 'queen' });
      else res.push({ from, to });
    }
  }
  return res;
}
const after = (p, m) => { const q = p.clone(); q.play(m); return q; };
const empty = () => { const s = Chess.default().toSetup(); s.board = s.board.clone(); for (const sq of [...s.board.occupied]) s.board.take(sq); s.castlingRights = SquareSet.empty(); return s; };
const seen = new Set();
const shape = p => makeBoardFen(p.board);
const count = p => p.board.occupied.size();
// Без фігури на клітинці sq (позиція має лишитися можливою)
function without(p, sq) {
  const s = p.toSetup(); s.board = s.board.clone(); s.board.take(sq); s.epSquare = undefined;
  const r = Chess.fromSetup(s); return r.isOk ? r.unwrap() : null;
}
// Прибираємо зайві фігури: кожна фігура, що лишилась, щось робить (без неї задача вже інша)
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
const noBadPawns = s => ![...s.board.occupied].some(sq => s.board.get(sq).role === 'pawn' && (sq >> 3 === 0 || sq >> 3 === 7));

// ---------- «Постав шах» ----------
// Шах цією фігурою є (1–3 способи), мату немає; зайві фігури прибрано — лишаються лише ті,
// що закривають лінії чи клітинки (без них шахи були б інші)
function giveCheck(role, plan) {
  const res = [], want = Object.values(plan).reduce((a, b) => a + b, 0), got = {};
  const goods = p => legal(p).filter(m => p.board.get(m.from).role === role && !m.promotion && after(p, m).isCheck());
  const okPos = p => !p.isCheck() && !p.isCheckmate() && !p.isStalemate();
  for (let t = 0; t < 3e6 && res.length < want; t++) {
    const s = empty(), put = (sq, pc) => (s.board.get(sq) ? false : (s.board.set(sq, pc), true));
    put(rnd(64), { role: 'king', color: 'black' }); put(rnd(64), { role: 'king', color: 'white' });
    if (!put(role === 'pawn' ? 8 + rnd(40) : rnd(64), { role, color: 'white' })) continue;
    const extra = rnd(4);
    for (let k = 0; k < extra; k++) put(8 + rnd(48), { role: ['pawn', 'pawn', 'knight', 'bishop', 'rook'][rnd(5)], color: Math.random() < 0.6 ? 'black' : 'white' });
    if (!noBadPawns(s)) continue;
    s.turn = 'white';
    const r = Chess.fromSetup(s); if (!r.isOk) continue;
    let p = r.unwrap(); if (!okPos(p)) continue;
    const g = goods(p);
    if (!g.length || g.length > 3 || legal(p).some(m => after(p, m).isCheckmate())) continue;
    const sig = g.map(makeUci).sort().join();
    p = minimal(p, q => okPos(q) && goods(q).map(makeUci).sort().join() === sig && !legal(q).some(m => after(q, m).isCheckmate()));
    const n = count(p);
    if ((got[n] || 0) >= (plan[n] || 0)) continue;
    if (seen.has(shape(p))) continue; seen.add(shape(p));
    got[n] = (got[n] || 0) + 1;
    res.push([`ch-${role}-${n}-${res.length}`, makeFen(p.toSetup()), makeUci(goods(p)[0]), 400 + 60 * n, n]);
  }
  return res.sort((x, y) => x[4] - y[4]);
}

// ---------- «Урятуйся від шаху» (ходять білі, білому королю шах) ----------
const kind = (p, m, checkers) => {
  const pc = p.board.get(m.from);
  if (pc.role === 'king') return checkers.has(m.to) ? 'capture' : 'run';
  if (checkers.has(m.to)) return 'capture';
  return 'block';
};
// Урятуйся від шаху: рятує рівно ОДИН хід, і він потрібного виду (утекти / побити / закритися).
// Половина позицій — «як у партії»: король після рокіровки в кутку за пішаками, шах від тури, ферзя, слона чи коня.
const SHIELDS = [[13, 14, 15], [13, 22, 15], [13, 14, 23], [14, 15], [13, 14], [13, 22, 23], [8, 9, 10], [9, 10]];
function escapeUnique(type, want, nMin = 3, nMax = 9) {
  const res = [], perN = {};
  for (let t = 0; t < 4e7 && res.length < want; t++) {
    const n = nMin + rnd(nMax - nMin + 3); // ставимо трохи більше — зайве прибереться
    const s = empty(), put = (sq, pc) => (s.board.get(sq) ? false : (s.board.set(sq, pc), true));
    let placed = 2;
    if (Math.random() < 0.5) { // рокіровка: король g1 (або c1/b1) за пішаками
      const sh = SHIELDS[rnd(SHIELDS.length)], king = sh[0] <= 10 ? [1, 2][rnd(2)] : [6, 7][rnd(2)];
      put(king, { role: 'king', color: 'white' });
      for (const sq of sh) if (put(sq, { role: 'pawn', color: 'white' })) placed++;
      if (Math.random() < 0.4 && put(king < 4 ? 3 : 5, { role: 'rook', color: 'white' })) placed++;
    } else { // інакше король здебільшого теж біля краю дошки
      const f = rnd(8), rr = rnd(8), edge = Math.random() < 0.6;
      put(edge ? (Math.random() < 0.5 ? f : [0, 7][rnd(2)] + 8 * rr) : rnd(64), { role: 'king', color: 'white' });
    }
    put(rnd(64), { role: 'king', color: 'black' });
    if (!put(rnd(64), { role: ROLES[rnd(4)], color: 'black' })) continue; // той, хто шахує
    placed++;
    let ok = true;
    while (ok && placed < n) {
      const white = type === 'run' ? Math.random() < 0.35 : Math.random() < 0.6;
      const role = white ? ['rook', 'bishop', 'knight', 'queen', 'pawn', 'pawn'][rnd(6)] : ['pawn', 'knight', 'bishop', 'rook', 'queen'][rnd(5)];
      ok = put(8 + rnd(48), { role, color: white ? 'white' : 'black' }); placed++;
    }
    if (!noBadPawns(s)) continue;
    s.turn = 'white';
    const r = Chess.fromSetup(s); if (!r.isOk) continue;
    let p = r.unwrap(); if (!p.isCheck()) continue;
    const valid = q => { if (!q.isCheck() || q.ctx().checkers.size() !== 1) return false; const ms = legal(q); return ms.length === 1 && kind(q, ms[0], q.ctx().checkers) === type; };
    if (!valid(p)) continue;
    const sol = makeUci(legal(p)[0]);
    p = minimal(p, q => valid(q) && makeUci(legal(q)[0]) === sol); // лише фігури, що щось закривають або б'ють
    const m = count(p);
    if (m < nMin || (perN[m] || 0) >= Math.ceil(want / (nMax - nMin + 1)) + 3) continue;
    if (seen.has(shape(p))) continue; seen.add(shape(p));
    perN[m] = (perN[m] || 0) + 1;
    res.push([`es-${type}-${m}-${res.length}`, makeFen(p.toSetup()), sol, 450 + 60 * m, m]);
  }
  // спершу найпростіші: менше фігур
  return res.sort((x, y) => x[4] - y[4]);
}

// node tools/build-checks.mjs <puzzles.json> [chk | esc-run | esc-capture | esc-block | mix]
const mode = process.argv[3] || 'all';
const data = JSON.parse(fs.readFileSync(out, 'utf8'));
if (mode === 'all' || mode === 'chk') for (const role of ['rook', 'bishop', 'queen', 'knight', 'pawn'])
  data['chk_' + role] = giveCheck(role, { 3: 6, 4: 4, 5: 2 });
for (const type of ['run', 'capture', 'block']) if (mode === 'all' || mode === 'esc-' + type) data['esc_' + type] = escapeUnique(type, 50, type === 'run' ? 3 : 4, 9);
if (mode === 'all' || mode === 'mix') { // «різні» — ті самі задачі з трьох розділів, перемішані
  const all = [...data.esc_run, ...data.esc_capture, ...data.esc_block].map(z => [z[0].replace('es-', 'mx-'), ...z.slice(1)]);
  data.esc_mixed = all.sort(() => Math.random() - 0.5).slice(0, 50).sort((x, y) => x[4] - y[4]);
}
fs.writeFileSync(out, JSON.stringify(data));
for (const k of Object.keys(data).filter(k => /^(chk|esc)_/.test(k))) console.log(k.padEnd(12), data[k].length, JSON.stringify(data[k].map(z => z[4])));
