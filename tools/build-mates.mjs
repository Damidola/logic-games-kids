// Задачі «мат в 1» і «мат в 2» з бази Lichess (CC0), спрощені для дітей:
// прибираємо з дошки фігури, які нічого не вирішують (після видалення рішення все одно ставить мат),
// повертаємо позицію так, щоб ходили білі, і сортуємо: спершу 3–5 фігур.
// Запуск: node tools/build-mates.mjs puzzles.jsonl mates.json  (потрібен пакет chessops), далі tools/merge-puzzles.py
import fs from 'node:fs';
import { Chess, SquareSet, parseUci, makeUci } from 'chessops';
import { parseFen, makeFen, makeBoardFen } from 'chessops/fen';

const [src = '/tmp/puz50k.jsonl', out = 'mate/mates.json'] = process.argv.slice(2);
const ROLES = ['queen', 'rook', 'bishop', 'knight'];
const PROMO = { queen: 'q', rook: 'r', bishop: 'b', knight: 'n' };

const load = fen => { const r = Chess.fromSetup(parseFen(fen).unwrap()); return r.isOk ? r.unwrap() : null; };
function legalMoves(p) {
  const out = [];
  for (const [from, dests] of p.allDests()) {
    const pc = p.board.get(from);
    for (const to of dests) {
      if (pc.role === 'pawn' && (to >> 3 === 7 || to >> 3 === 0)) for (const r of ROLES) out.push({ from, to, promotion: r });
      else out.push({ from, to });
    }
  }
  return out;
}
const after = (p, m) => { const q = p.clone(); q.play(m); return q; };
const mates = (p, m) => p.isLegal(m) && after(p, m).isCheckmate();
const mateIn1Moves = p => legalMoves(p).filter(m => mates(p, m));
function forcedMate2(p, u1) {
  const q = after(p, u1);
  if (!p.isLegal(u1) || q.isEnd()) return false;
  return legalMoves(q).every(r => mateIn1Moves(after(q, r)).length > 0);
}
// Без фігури на клітинці sq; позиція має лишитися можливою
function without(p, sq) {
  const s = p.toSetup(); s.board = s.board.clone(); s.board.take(sq);
  s.castlingRights = s.castlingRights.intersect(s.board.occupied); s.epSquare = undefined;
  const r = Chess.fromSetup(s);
  return r.isOk ? r.unwrap() : null;
}
const count = p => p.board.occupied.size();
// Жадібно прибираємо фігури, поки умова виконується
function prune(p, ok) {
  let changed = true;
  while (changed) {
    changed = false;
    const sqs = [...p.board.occupied].filter(sq => p.board.get(sq).role !== 'king');
    // спершу — фігури, що стоять найдалі від чорного короля
    const k = p.board.kingOf(p.turn === 'white' ? 'black' : 'white');
    sqs.sort((a, b) => dist(b, k) - dist(a, k));
    for (const sq of sqs) {
      const q = without(p, sq);
      if (q && ok(q)) { p = q; changed = true; break; }
    }
  }
  return p;
}
const dist = (a, b) => Math.max(Math.abs((a & 7) - (b & 7)), Math.abs((a >> 3) - (b >> 3)));
// Дзеркалимо так, щоб ходили білі
function asWhite(p) {
  if (p.turn === 'white') return p;
  const s = p.toSetup(), b = s.board.clone(), nb = b.clone();
  for (const sq of b.occupied) nb.take(sq);
  for (const [sq, pc] of b) nb.set(sq ^ 56, { role: pc.role, color: pc.color === 'white' ? 'black' : 'white', promoted: pc.promoted });
  s.board = nb; s.turn = 'white'; s.castlingRights = SquareSet.empty(); s.epSquare = undefined;
  return Chess.fromSetup(s).unwrap();
}
const flipMove = m => ({ ...m, from: m.from ^ 56, to: m.to ^ 56 });
const clean = p => { const s = p.toSetup(); s.castlingRights = SquareSet.empty(); s.epSquare = undefined; s.halfmoves = 0; s.fullmoves = 1; const r = Chess.fromSetup(s); return r.isOk ? r.unwrap() : null; };

const lines = fs.readFileSync(src, 'utf8').trim().split('\n').map(l => JSON.parse(l));
const seen = new Set(), m1 = [], m2 = [];
for (const z of lines) {
  const th = z.Themes.split(' ');
  if (!th.includes('mateIn1') && !th.includes('mateIn2')) continue;
  let p = load(z.FEN); if (!p) continue;
  const mv = z.Moves.split(' ');
  p.play(parseUci(mv[0]));
  p = clean(p); if (!p) continue;
  let sol = parseUci(mv[1]);
  if (p.turn === 'black') { p = asWhite(p); sol = flipMove(sol); }
  if (th.includes('mateIn1')) {
    if (!mates(p, sol)) continue;
    const role = sol.promotion ? 'pawn' : p.board.get(sol.from).role;
    const q = prune(p, x => { const pc = x.board.get(sol.from); return pc && mates(x, sol); });
    const key = makeBoardFen(q.board);
    if (seen.has(key)) continue; seen.add(key);
    m1.push({ id: z.PuzzleId, fen: makeFen(q.toSetup()), sol: makeUci(sol), role, promo: sol.promotion || '', n: count(q), rating: +z.Rating });
  } else {
    // мат в 2: перший хід гравця + будь-яка відповідь → мат
    if (mv.length !== 4) continue;
    let o1 = parseUci(mv[2]), u2 = parseUci(mv[3]);
    if (z.FEN.split(' ')[1] === 'w') { o1 = flipMove(o1); u2 = flipMove(u2); } // перший хід Lichess — чорних, тож гравець грав чорними
    if (!forcedMate2(p, sol) || mateIn1Moves(p).length) continue;
    const q = prune(p, x => { const pc = x.board.get(sol.from); return pc && !mateIn1Moves(x).length && forcedMate2(x, sol); });
    const key = makeBoardFen(q.board);
    if (seen.has(key)) continue; seen.add(key);
    // відповідь суперника: та, що в Lichess, якщо вона ще можлива, інакше будь-яка
    const a = after(q, sol), replies = legalMoves(a);
    const r = replies.find(x => x.from === o1.from && x.to === o1.to) || replies[0];
    const fin = mateIn1Moves(after(a, r))[0];
    m2.push({ id: z.PuzzleId, fen: makeFen(q.toSetup()), line: [sol, r, fin].map(makeUci).join(' '), n: count(q), rating: +z.Rating });
  }
}

// Перетворення пішака в коня / туру / слона: беремо мат цією фігурою на останній ряд
// і ставимо замість неї пішака на передостанній ряд — ферзем мату бути не повинно
const under = [];
for (const z of m1) {
  if (!['knight', 'rook', 'bishop'].includes(z.role)) continue;
  const p = load(z.fen), m = parseUci(z.sol);
  if (m.to >> 3 !== 7) continue;
  for (const from of [m.to - 8, m.to - 9, m.to - 7]) {
    if (from < 48 || from > 55 || Math.abs((from & 7) - (m.to & 7)) > 1) continue;
    if ((from & 7) === (m.to & 7) && p.board.get(m.to)) continue; // прямо — лише на порожню
    if ((from & 7) !== (m.to & 7) && !p.board.get(m.to)) continue; // навскоси — лише взяття
    const s = p.toSetup(); s.board = s.board.clone(); s.board.take(m.from);
    if (s.board.get(from)) continue;
    s.board.set(from, { role: 'pawn', color: 'white' });
    const r = Chess.fromSetup(s); if (!r.isOk) continue;
    const q = r.unwrap(), mv = { from, to: m.to, promotion: z.role };
    if (!mates(q, mv) || mates(q, { from, to: m.to, promotion: 'queen' })) continue;
    const key = makeBoardFen(q.board); if (seen.has(key)) continue; seen.add(key);
    under.push({ id: z.id + '-' + PROMO[z.role], fen: makeFen(q.toSetup()), sol: makeUci(mv), role: 'pawn', promo: z.role, n: count(q), rating: z.rating });
  }
}

const easy = (a, b) => a.n - b.n || a.rating - b.rating;
// Однакові малюнки (дзеркальні по вертикалі) — лише один раз
const shape = fen => { const rows = fen.split(' ')[0].split('/'); const m = rows.map(r => [...r.replace(/\d/g, d => '.'.repeat(d))].reverse().join('')); return [rows.join('/'), m.join('/')].sort()[0]; };
// Поступово складніше: спершу 3–5 фігур, далі 6–8, наприкінці трохи більших
function progress(list, plan) {
  const out = [], shapes = new Set();
  for (const [lo, hi, n] of plan) {
    const part = list.filter(z => z.n >= lo && z.n <= hi && !shapes.has(shape(z.fen))).sort(easy);
    // рівномірно по рейтингу, щоб не було 15 однакових
    const step = Math.max(1, part.length / n);
    for (let i = 0; i < part.length && out.length < plan.slice(0, plan.indexOf(plan.find(x => x[0] === lo)) + 1).reduce((s, x) => s + x[2], 0); i += step) {
      const z = part[Math.floor(i)]; const sh = shape(z.fen);
      if (shapes.has(sh)) continue; shapes.add(sh); out.push(z);
    }
  }
  return out;
}
const PLAN = [[3, 5, 16], [6, 8, 10], [9, 12, 4]];
const byRole = r => m1.filter(z => z.role === r);
const pawnPush = m1.filter(z => z.role === 'pawn' && !z.promo);
const pawnQueen = m1.filter(z => z.role === 'pawn' && z.promo === 'queen');

// Мат перетворенням у коня (ферзем — не мат): перебираємо прості позиції
const rnd = n => Math.floor(Math.random() * n);
const NJ = [[1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]];
const onBoard = (f, r) => f >= 0 && f < 8 && r >= 0 && r < 8;
for (let t = 0; t < 300000 && under.length < 16; t++) {
  const s = Chess.default().toSetup(); s.board = s.board.clone(); for (const sq of [...s.board.occupied]) s.board.take(sq);
  const put = (sq, pc) => { if (sq < 0 || s.board.get(sq)) return false; s.board.set(sq, pc); return true; };
  const pf = rnd(8), from = 48 + pf, df = [-1, 0, 0, 0, 1][rnd(5)], tf = pf + df;
  if (tf < 0 || tf > 7) continue;
  const to = 56 + tf;
  put(from, { role: 'pawn', color: 'white' });
  if (df && !put(to, { role: ['rook', 'bishop', 'knight'][rnd(3)], color: 'black' })) continue;
  // чорний король — під ударом нового коня
  const j = NJ[rnd(8)], bf = tf + j[0], br = 7 + j[1];
  if (!onBoard(bf, br) || !put(br * 8 + bf, { role: 'king', color: 'black' })) continue;
  // сусідні клітинки короля частково зайняті своїми фігурами
  for (const [dx, dy] of [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]]) {
    const f = bf + dx, r = br + dy;
    if (onBoard(f, r) && Math.random() < 0.45) put(r * 8 + f, { role: r === 0 || r === 7 ? ['rook', 'bishop', 'queen'][rnd(3)] : ['pawn', 'pawn', 'rook', 'bishop'][rnd(4)], color: 'black' });
  }
  if (!put(rnd(64), { role: 'king', color: 'white' })) continue;
  s.turn = 'white'; s.castlingRights = SquareSet.empty();
  const r = Chess.fromSetup(s); if (!r.isOk) continue;
  const q = r.unwrap(); if (q.isCheck()) continue;
  if ([...q.board.occupied].some(sq => q.board.get(sq).role === 'pawn' && (sq >> 3 === 0 || sq >> 3 === 7))) continue;
  const mv = { from, to, promotion: 'knight' };
  if (!mates(q, mv) || mates(q, { from, to, promotion: 'queen' }) || mateIn1Moves(q).length !== 1) continue;
  const pr = prune(q, x => mates(x, mv) && !mates(x, { from, to, promotion: 'queen' }) && mateIn1Moves(x).length === 1);
  const key = makeBoardFen(pr.board); if (seen.has(key)) continue; seen.add(key);
  under.push({ id: 'n' + under.length, fen: makeFen(pr.toSetup()), sol: makeUci(mv), role: 'pawn', promo: 'knight', n: count(pr), rating: 900 });
}

const res = {
  m1rook: progress(byRole('rook'), PLAN), m1bishop: progress(byRole('bishop'), PLAN), m1queen: progress(byRole('queen'), PLAN), m1knight: progress(byRole('knight'), PLAN),
  m1pawn: [...progress(pawnPush, [[3, 5, 10], [6, 8, 6]]), ...progress(under, [[3, 9, 10]]), ...progress(pawnQueen, [[3, 8, 6]])].sort(easy),
};
const used = new Set(Object.values(res).flat().map(z => z.id));
res.m1mix = progress(m1.filter(z => !used.has(z.id)), [[4, 5, 10], [6, 8, 20], [9, 14, 10]]).sort(() => Math.random() - .5);
res.mate2 = progress(m2, [[3, 5, 40], [6, 8, 45], [9, 14, 15]]);
const pack = z => [z.id, z.fen, z.sol || z.line, z.rating, z.n];
const json = Object.fromEntries(Object.entries(res).map(([k, v]) => [k, v.map(pack)]));
fs.writeFileSync(out, JSON.stringify(json));
for (const [k, v] of Object.entries(res)) {
  const h = {}; v.forEach(z => { h[z.n] = (h[z.n] || 0) + 1; });
  console.log(k.padEnd(9), v.length, 'фігур:', JSON.stringify(h), k === 'm1pawn' ? `(хід пішаком ${pawnPush.length}, у ферзя ${pawnQueen.length}, у коня/туру/слона ${under.length})` : '');
}
console.log('m1 total', m1.length, 'm2 total', m2.length);
