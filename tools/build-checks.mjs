// Задачі на шах (складені й перевірені правилами chessops):
//  «Постав шах» фігурою — турою, слоном, ферзем, конем, пішаком: спершу 3 фігури, далі 4–5.
//  «Урятуйся від шаху» — білому королю шах: утечі, побий того, хто шахує, закрийся, і «різні»
//  (у «різних» рятує лише один хід). Запуск: node tools/build-checks.mjs chess-puzzles/puzzles.json
import fs from 'node:fs';
import { Chess, SquareSet, makeUci } from 'chessops';
import { makeFen, makeBoardFen } from 'chessops/fen';

const out = process.argv[2] || 'chess-puzzles/puzzles.json';
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
// Здебільшого — як у партії: король після рокіровки (b1 за пішаками a2 b2 c2 або g1/h1 за f2 g2 h2).
// Шахує найчастіше тура й слон, рідше кінь, ферзь і пішак. Після порятунку в чорних немає мату одним ходом,
// а фігура, що закрилася, захищена (королем чи іншою фігурою) — тобто це справжній гарний хід.
const Q_SIDE = [[8, 9, 10], [16, 9, 10], [8, 9, 18], [8, 17, 10], [9, 10], [8, 9]];  // a2 b2 c2 та варіанти
const K_SIDE = [[13, 14, 15], [13, 22, 15], [13, 14, 23], [14, 15], [13, 14], [13, 22, 23]]; // f2 g2 h2 та варіанти
const QUOTA = { rook: 18, bishop: 14, knight: 7, queen: 6, pawn: 5 };
const pickRole = () => { const r = Math.random() * 50; return r < 18 ? 'rook' : r < 32 ? 'bishop' : r < 39 ? 'knight' : r < 45 ? 'queen' : 'pawn'; };
const blackMatesNext = q => legal(q).some(m => after(q, m).isCheckmate());
function escapeUnique(type, want, nMin = 3, nMax = 9) {
  const res = [], perN = {}, perRole = {};
  for (let t = 0; t < 6e7 && res.length < want; t++) {
    const n = nMin + rnd(nMax - nMin + 3); // ставимо трохи більше — зайве прибереться
    const s = empty(), put = (sq, pc) => (s.board.get(sq) ? false : (s.board.set(sq, pc), true));
    let placed = 2, wk;
    const tpl = Math.random();
    if (tpl < 0.45) { wk = [1, 1, 1, 0, 2][rnd(5)]; for (const sq of Q_SIDE[rnd(Q_SIDE.length)]) if (put(sq, { role: 'pawn', color: 'white' })) placed++; }
    else if (tpl < 0.8) { wk = [6, 6, 7][rnd(3)]; for (const sq of K_SIDE[rnd(K_SIDE.length)]) if (put(sq, { role: 'pawn', color: 'white' })) placed++; }
    else wk = Math.random() < 0.5 ? rnd(8) : [0, 7][rnd(2)] + 8 * rnd(8);
    if (!put(wk, { role: 'king', color: 'white' })) continue;
    if (tpl < 0.8 && Math.random() < 0.35 && put(wk < 4 ? 3 : 5, { role: 'rook', color: 'white' })) placed++;
    put(rnd(64), { role: 'king', color: 'black' });
    // той, хто шахує; пішак — одразу навскоси перед королем
    // від коня й пішака закритися не можна — для «закрийся» шахують тура, слон і ферзь
    const quota = type === 'block' ? { rook: 22, bishop: 18, queen: 10 } : QUOTA;
    const role = type === 'block' ? ['rook', 'rook', 'bishop', 'bishop', 'queen'][rnd(5)] : pickRole();
    if ((perRole[role] || 0) >= (quota[role] || 0)) continue;
    const csq = role === 'pawn' ? wk + 8 + [-1, 1][rnd(2)] : rnd(64);
    if (role === 'pawn' && (csq < 8 || csq > 55 || Math.abs((csq & 7) - (wk & 7)) !== 1)) continue;
    if (!put(csq, { role, color: 'black' })) continue;
    placed++;
    while (placed < n) {
      const white = type === 'run' ? Math.random() < 0.35 : Math.random() < 0.6;
      const r2 = white ? ['rook', 'bishop', 'knight', 'queen', 'pawn', 'pawn'][rnd(6)] : ['pawn', 'knight', 'bishop', 'rook', 'queen'][rnd(5)];
      put(8 + rnd(48), { role: r2, color: white ? 'white' : 'black' }); placed++;
    }
    if (!noBadPawns(s)) continue;
    s.turn = 'white';
    const r = Chess.fromSetup(s); if (!r.isOk) continue;
    let p = r.unwrap(); if (!p.isCheck()) continue;
    const valid = q => {
      if (!q.isCheck() || q.ctx().checkers.size() !== 1) return false;
      const c = [...q.ctx().checkers][0]; if (q.board.get(c).role !== role) return false;
      const ms = legal(q); if (ms.length !== 1 || kind(q, ms[0], q.ctx().checkers) !== type) return false;
      const a = after(q, ms[0]);
      if (blackMatesNext(a)) return false; // урятувався — і одразу мат? так не годиться
      if (type === 'block' && a.kingAttackers(ms[0].to, 'white', a.board.occupied).isEmpty()) return false; // фігура, що закрила, захищена
      return true;
    };
    if (!valid(p)) continue;
    const sol = makeUci(legal(p)[0]);
    p = minimal(p, q => valid(q) && makeUci(legal(q)[0]) === sol); // лише фігури, що щось закривають або б'ють
    const m = count(p);
    if (m < nMin || (perN[m] || 0) >= Math.ceil(want / (nMax - nMin + 1)) + 3) continue;
    if (seen.has(shape(p))) continue; seen.add(shape(p));
    perN[m] = (perN[m] || 0) + 1; perRole[role] = (perRole[role] || 0) + 1;
    res.push([`es-${type}-${m}-${res.length}`, makeFen(p.toSetup()), sol, 450 + 60 * m, m]);
  }
  console.error(type, 'хто шахує:', JSON.stringify(perRole));
  return res.sort((x, y) => x[4] - y[4]);
}

// node tools/build-checks.mjs <puzzles.json> [chk | esc-run | esc-capture | esc-block | mix]
const mode = process.argv[3] || 'all';
const data = JSON.parse(fs.readFileSync(out, 'utf8'));
if (mode === 'all' || mode === 'chk') for (const role of ['rook', 'bishop', 'queen', 'knight', 'pawn'])
  data['chk_' + role] = giveCheck(role, { 3: 16, 4: 9, 5: 5 });
for (const type of ['run', 'capture', 'block']) if (mode === 'all' || mode === 'esc-' + type) data['esc_' + type] = escapeUnique(type, 50, type === 'run' ? 3 : 4, 9);
if (mode === 'all' || mode === 'mix') { // «різні» — ті самі задачі з трьох розділів, перемішані
  const all = [...data.esc_run, ...data.esc_capture, ...data.esc_block].map(z => [z[0].replace('es-', 'mx-'), ...z.slice(1)]);
  data.esc_mixed = all.sort(() => Math.random() - 0.5).slice(0, 50).sort((x, y) => x[4] - y[4]);
}
fs.writeFileSync(out, JSON.stringify(data));
for (const k of Object.keys(data).filter(k => /^(chk|esc)_/.test(k))) console.log(k.padEnd(12), data[k].length, JSON.stringify(data[k].map(z => z[4])));
