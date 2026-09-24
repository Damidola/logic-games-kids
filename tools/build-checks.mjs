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
// Урятуйся від шаху: рятує рівно ОДИН хід, і він потрібного виду (утекти / побити / закритися).
// Половина позицій — «як у партії»: король після рокіровки в кутку за пішаками, шах від тури, ферзя, слона чи коня.
const SHIELDS = [[13, 14, 15], [13, 22, 15], [13, 14, 23], [14, 15], [13, 14], [13, 22, 23], [8, 9, 10], [9, 10]];
function escapeUnique(type, want, nMin = 3, nMax = 9) {
  const res = [], perN = {};
  for (let t = 0; t < 4e7 && res.length < want; t++) {
    const n = nMin + rnd(nMax - nMin + 1);
    if ((perN[n] || 0) >= Math.ceil(want / (nMax - nMin + 1)) + 4) continue;
    const s = empty(), put = (sq, pc) => (s.board.get(sq) ? false : (s.board.set(sq, pc), true));
    let placed = 2;
    if (Math.random() < 0.5) { // рокіровка: король g1 (або c1/b1) за пішаками
      const sh = SHIELDS[rnd(SHIELDS.length)], king = sh[0] <= 10 ? [1, 2][rnd(2)] : [6, 7][rnd(2)];
      put(king, { role: 'king', color: 'white' });
      for (const sq of sh) if (put(sq, { role: 'pawn', color: 'white' })) placed++;
      if (Math.random() < 0.4 && put(king < 4 ? 3 : 5, { role: 'rook', color: 'white' })) placed++;
    } else put(rnd(64), { role: 'king', color: 'white' });
    put(rnd(64), { role: 'king', color: 'black' });
    if (!put(rnd(64), { role: ROLES[rnd(4)], color: 'black' })) continue; // той, хто шахує
    placed++;
    let ok = placed <= n;
    while (ok && placed < n) {
      const white = type === 'run' ? Math.random() < 0.35 : Math.random() < 0.6;
      const role = white ? ['rook', 'bishop', 'knight', 'queen', 'pawn', 'pawn'][rnd(6)] : ['pawn', 'knight', 'bishop', 'rook', 'queen'][rnd(5)];
      ok = put(8 + rnd(48), { role, color: white ? 'white' : 'black' }); placed++;
    }
    if (!ok || !noBadPawns(s)) continue;
    s.turn = 'white';
    const r = Chess.fromSetup(s); if (!r.isOk) continue;
    const p = r.unwrap(); if (!p.isCheck() || count(p) !== n) continue;
    const checkers = p.ctx().checkers; if (checkers.size() !== 1) continue;
    const moves = legal(p);
    if (moves.length !== 1 || kind(p, moves[0], checkers) !== type) continue;
    if (seen.has(shape(p))) continue; seen.add(shape(p));
    perN[n] = (perN[n] || 0) + 1;
    res.push([`es-${type}-${n}-${res.length}`, makeFen(p.toSetup()), makeUci(moves[0]), 450 + 60 * n, n]);
  }
  // спершу найпростіші: менше фігур
  return res.sort((x, y) => x[4] - y[4]);
}

// node tools/build-checks.mjs <puzzles.json> [chk | esc-run | esc-capture | esc-block | mix]
const mode = process.argv[3] || 'all';
const data = JSON.parse(fs.readFileSync(out, 'utf8'));
const easyFirst = (f, key) => [...f(key, 3, 6), ...f(key, 4, 4), ...f(key, 5, 2)];
if (mode === 'all' || mode === 'chk') {
  data.chk_rook = easyFirst(giveCheck, 'rook');
  data.chk_bishop = easyFirst(giveCheck, 'bishop');
  data.chk_queen = easyFirst(giveCheck, 'queen');
  data.chk_knight = easyFirst(giveCheck, 'knight');
  data.chk_pawn = [...giveCheck('pawn', 3, 4), ...giveCheck('pawn', 4, 4), ...giveCheck('pawn', 5, 4)];
}
for (const type of ['run', 'capture', 'block']) if (mode === 'all' || mode === 'esc-' + type) data['esc_' + type] = escapeUnique(type, 50, type === 'run' ? 3 : 4, 9);
if (mode === 'all' || mode === 'mix') { // «різні» — ті самі задачі з трьох розділів, перемішані
  const all = [...data.esc_run, ...data.esc_capture, ...data.esc_block].map(z => [z[0].replace('es-', 'mx-'), ...z.slice(1)]);
  data.esc_mixed = all.sort(() => Math.random() - 0.5).slice(0, 50).sort((x, y) => x[4] - y[4]);
}
fs.writeFileSync(out, JSON.stringify(data));
for (const k of Object.keys(data).filter(k => /^(chk|esc)_/.test(k))) console.log(k.padEnd(12), data[k].length, JSON.stringify(data[k].map(z => z[4])));
