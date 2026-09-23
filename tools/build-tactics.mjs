// Тактичні задачі Lichess (CC0), спрощені: прибираємо фігури, без яких задача лишається тією самою.
// Кожне видалення перевіряє Stockfish: хід із рішення має лишатися єдиним найкращим, відповіді
// суперника — його найкращими ходами, а в кінці гравець має вигравати матеріал.
// Запуск: node tools/build-tactics.mjs <puzzles.jsonl> <out.json> <stockfish.js> <теми через кому>
import fs from 'node:fs';
import { spawn } from 'node:child_process';
import { Chess, SquareSet, parseUci, makeUci } from 'chessops';
import { parseFen, makeFen, makeBoardFen } from 'chessops/fen';

const [src, out, sfPath, themesArg, perTheme = '70'] = process.argv.slice(2);
const THEMES = themesArg.split(',');

// ---------- Stockfish ----------
const sf = spawn('node', [sfPath], { cwd: new URL('.', 'file://' + sfPath).pathname });
let buf = '', waiting = null;
sf.stdout.on('data', d => {
  buf += d; let i;
  while ((i = buf.indexOf('\n')) >= 0) { const l = buf.slice(0, i).trim(); buf = buf.slice(i + 1); if (waiting) waiting(l); }
});
const send = c => sf.stdin.write(c + '\n');
function until(pred) { return new Promise(res => { waiting = l => { if (pred(l)) { waiting = null; res(l); } }; }); }
async function analyse(fen, depth, multipv) {
  const lines = {};
  send(`setoption name MultiPV value ${multipv}`); send(`position fen ${fen}`); send(`go depth ${depth}`);
  await new Promise(res => {
    waiting = l => {
      if (l.startsWith('info') && l.includes(' pv ') && l.includes(` depth ${depth} `)) {
        const k = +(l.match(/multipv (\d+)/) || [0, 1])[1];
        const m = l.match(/score (cp|mate) (-?\d+)/);
        lines[k] = { move: l.split(' pv ')[1].split(' ')[0], v: m[1] === 'mate' ? (m[2] > 0 ? 1e5 - +m[2] : -1e5 - +m[2]) : +m[2] };
      }
      if (l.startsWith('bestmove')) { waiting = null; if (!lines[1]) { const b = l.split(' ')[1]; if (b && b !== '(none)') lines[1] = { move: b, v: 0 }; } res(); }
    };
  });
  return Object.keys(lines).sort().map(k => lines[k]);
}

// ---------- шахи ----------
const load = fen => { const r = Chess.fromSetup(parseFen(fen).unwrap()); return r.isOk ? r.unwrap() : null; };
const fenOf = p => makeFen(p.toSetup());
const count = p => p.board.occupied.size();
const dist = (a, b) => Math.max(Math.abs((a & 7) - (b & 7)), Math.abs((a >> 3) - (b >> 3)));
const same = (a, b) => a === b || (a.length === 4 && b === a + 'q') || (b.length === 4 && a === b + 'q');
function without(p, sq) {
  const s = p.toSetup(); s.board = s.board.clone(); s.board.take(sq);
  s.castlingRights = SquareSet.empty(); s.epSquare = undefined;
  const r = Chess.fromSetup(s); return r.isOk ? r.unwrap() : null;
}
function asWhite(p, line) {
  if (p.turn === 'white') return [p, line];
  const s = p.toSetup(), b = s.board, nb = b.clone();
  for (const sq of b.occupied) nb.take(sq);
  for (const [sq, pc] of b) nb.set(sq ^ 56, { role: pc.role, color: pc.color === 'white' ? 'black' : 'white' });
  s.board = nb; s.turn = 'white'; s.castlingRights = SquareSet.empty(); s.epSquare = undefined;
  const flip = u => { const m = parseUci(u); return makeUci({ ...m, from: m.from ^ 56, to: m.to ^ 56 }); };
  return [Chess.fromSetup(s).unwrap(), line.map(flip)];
}

// Задача все ще «та сама»?
async function valid(p, line) {
  let q = p.clone();
  for (let i = 0; i < line.length; i++) {
    const m = parseUci(line[i]);
    if (!q.isLegal(m)) return false;
    if (i % 2 === 0) {
      const a = await analyse(fenOf(q), 11, 2);
      if (!a[0] || !same(a[0].move, line[i])) return false;
      if (a[1] && a[0].v - a[1].v < 150 && !(a[0].v > 5e4)) return false; // рішення має бути єдиним
    } else {
      const a = await analyse(fenOf(q), 10, 1);
      if (!a[0] || !same(a[0].move, line[i])) return false;
    }
    q.play(m);
  }
  if (q.isCheckmate()) return true;
  const a = await analyse(fenOf(q), 10, 1);
  // після рішення хід суперника; оцінка з його боку має бути погана
  return !!a[0] && -a[0].v >= 150;
}

const all = fs.readFileSync(src, 'utf8').trim().split('\n').map(l => JSON.parse(l));
const res = {};
send('uci'); await until(l => l === 'uciok'); send('isready'); await until(l => l === 'readyok');
for (const theme of THEMES) {
  const cand = all.filter(z => { const th = z.Themes.split(' '); return th.includes(theme) && !th.some(t => t.startsWith('mate')) && +z.Rating <= 1600; })
    .map(z => ({ z, n: load(z.FEN)?.board.occupied.size() ?? 99 })).filter(x => x.n <= 14).sort((a, b) => a.n - b.n || +a.z.Rating - +b.z.Rating)
    .slice(0, +perTheme * 3);
  const got = [], seen = new Set();
  for (const { z } of cand) {
    if (got.length >= +perTheme) break;
    let p = load(z.FEN); if (!p) continue;
    const mv = z.Moves.split(' '); p.play(parseUci(mv[0]));
    let line = mv.slice(1);
    const s0 = p.toSetup(); s0.castlingRights = SquareSet.empty(); s0.epSquare = undefined; p = Chess.fromSetup(s0).unwrap();
    if (!(await valid(p, line))) continue;
    // фігури, що ходять або яких б'ють у рішенні, не чіпаємо
    const keep = new Set(line.flatMap(u => { const m = parseUci(u); return [m.from, m.to]; }));
    let changed = true;
    while (changed) {
      changed = false;
      const k = p.board.kingOf(p.turn === 'white' ? 'black' : 'white');
      const sqs = [...p.board.occupied].filter(sq => p.board.get(sq).role !== 'king' && !keep.has(sq)).sort((a, b) => dist(b, k) - dist(a, k));
      for (const sq of sqs) {
        const q = without(p, sq);
        if (q && await valid(q, line)) { p = q; changed = true; break; }
      }
    }
    [p, line] = asWhite(p, line);
    const key = makeBoardFen(p.board); if (seen.has(key)) continue; seen.add(key);
    got.push([z.PuzzleId, fenOf(p), line.join(' '), +z.Rating, count(p)]);
    process.stderr.write(`${theme} ${got.length}: ${z.PuzzleId} ${count(p)} фігур\n`);
  }
  res[theme] = got;
  fs.writeFileSync(out, JSON.stringify(res));
}
sf.kill();
