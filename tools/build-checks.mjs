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
const noBadPawns = s => ![...s.board.occupied].some(sq => s.board.get(sq).role === 'pawn' && (sq >> 3 === 0 || sq >> 3 === 7));

// ---------- «Постав шах» ----------
function giveCheck(role, n, want) {
  const res = [];
  for (let t = 0; t < 2e6 && res.length < want; t++) {
    const s = empty(), put = (sq, pc) => (s.board.get(sq) ? false : (s.board.set(sq, pc), true));
    put(rnd(64), { role: 'king', color: 'black' }); put(rnd(64), { role: 'king', color: 'white' });
    if (!put(role === 'pawn' ? 8 + rnd(40) : rnd(64), { role, color: 'white' })) continue;
    let ok = true;
    for (let k = 3; k < n && ok; k++) ok = put(8 + rnd(48), { role: ['pawn', 'pawn', 'knight', 'bishop', 'rook'][rnd(5)], color: Math.random() < 0.6 ? 'black' : 'white' });
    if (!ok || !noBadPawns(s)) continue;
    s.turn = 'white';
    const r = Chess.fromSetup(s); if (!r.isOk) continue;
    const p = r.unwrap(); if (p.isCheck() || p.isCheckmate() || p.isStalemate() || count(p) !== n) continue;
    const moves = legal(p), checks = moves.filter(m => after(p, m).isCheck());
    const good = checks.filter(m => p.board.get(m.from).role === role && !m.promotion);
    // шах цією фігурою є, але не забагато (щоб було що шукати); мату немає — це задача саме на шах
    if (!good.length || good.length > 3 || checks.some(m => after(p, m).isCheckmate())) continue;
    if (shape(p) && seen.has(shape(p))) continue; seen.add(shape(p));
    res.push([`ch-${role}-${n}-${res.length}`, makeFen(p.toSetup()), makeUci(good[0]), 400 + 60 * n, n]);
  }
  return res;
}

// ---------- «Урятуйся від шаху» (ходять білі, білому королю шах) ----------
const kind = (p, m, checkers) => {
  const pc = p.board.get(m.from);
  if (pc.role === 'king') return checkers.has(m.to) ? 'capture' : 'run';
  if (checkers.has(m.to)) return 'capture';
  return 'block';
};
function escape(type, n, want) {
  const res = [];
  for (let t = 0; t < 3e6 && res.length < want; t++) {
    const s = empty(), put = (sq, pc) => (s.board.get(sq) ? false : (s.board.set(sq, pc), true));
    const wk = rnd(64); put(wk, { role: 'king', color: 'white' }); put(rnd(64), { role: 'king', color: 'black' });
    // хто шахує: тура, слон, ферзь або кінь чорних
    if (!put(rnd(64), { role: ROLES[rnd(4)], color: 'black' })) continue;
    let ok = true;
    for (let k = 4; k <= n && ok; k++) {
      const white = type === 'run' ? Math.random() < 0.3 : Math.random() < 0.7;
      ok = put(8 + rnd(48), { role: white ? ['rook', 'bishop', 'knight', 'queen', 'pawn'][rnd(5)] : ['pawn', 'knight', 'bishop', 'rook'][rnd(4)], color: white ? 'white' : 'black' });
    }
    if (!ok || !noBadPawns(s)) continue;
    s.turn = 'white';
    const r = Chess.fromSetup(s); if (!r.isOk) continue;
    const p = r.unwrap(); if (!p.isCheck() || p.isCheckmate() || count(p) !== n) continue;
    const checkers = p.ctx().checkers; if (checkers.size() !== 1) continue;
    const moves = legal(p), kinds = moves.map(m => kind(p, m, checkers));
    const of = k => moves.filter((_, i) => kinds[i] === k);
    let sol;
    if (type === 'mixed') { if (moves.length !== 1) continue; sol = moves[0]; }
    else {
      const good = of(type);
      if (!good.length) continue;
      if (type === 'run' && (of('capture').length || of('block').length)) continue;   // лише втекти
      if (type === 'capture' && good.length > 2) continue;
      if (type === 'block' && (!good.length || of('capture').length)) continue;      // побити не можна — закривайся
      sol = good[0];
    }
    if (seen.has(shape(p))) continue; seen.add(shape(p));
    res.push([`es-${type}-${n}-${res.length}`, makeFen(p.toSetup()), makeUci(sol), 450 + 60 * n, n]);
  }
  return res;
}

const data = JSON.parse(fs.readFileSync(out, 'utf8'));
const easyFirst = (f, key) => [...f(key, 3, 6), ...f(key, 4, 4), ...f(key, 5, 2)];
data.chk_rook = easyFirst(giveCheck, 'rook');
data.chk_bishop = easyFirst(giveCheck, 'bishop');
data.chk_queen = easyFirst(giveCheck, 'queen');
data.chk_knight = easyFirst(giveCheck, 'knight');
data.chk_pawn = [...giveCheck('pawn', 3, 4), ...giveCheck('pawn', 4, 4), ...giveCheck('pawn', 5, 4)];
data.esc_run = [...escape('run', 3, 6), ...escape('run', 4, 6)];
data.esc_capture = [...escape('capture', 4, 6), ...escape('capture', 5, 6)];
data.esc_block = [...escape('block', 4, 6), ...escape('block', 5, 6)];
data.esc_mixed = [...escape('mixed', 4, 6), ...escape('mixed', 5, 7)];
fs.writeFileSync(out, JSON.stringify(data));
for (const k of Object.keys(data).filter(k => /^(chk|esc)_/.test(k))) console.log(k.padEnd(12), data[k].length, JSON.stringify(data[k].map(z => z[4])));
