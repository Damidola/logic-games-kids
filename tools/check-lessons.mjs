// Перевірка міні-уроків «Шляху новачка»: позиції можливі, ходи прикладів legal, у кожного завдання є розв'язок
import { Chess, parseUci, makeUci } from 'chessops';
import { parseFen } from 'chessops/fen';
import { LESSONS } from '../chess-path/lessons.js';
const pos = fen => { const r = Chess.fromSetup(parseFen(fen).unwrap()); if (r.isErr) throw new Error('bad fen ' + fen + ' ' + r.error); return r.unwrap(); };
const moves = p => { const r = []; for (const [f, ds] of p.allDests()) for (const t of ds) { if (p.board.get(f).role === 'pawn' && (t >> 3 === 7 || t >> 3 === 0)) for (const pr of ['queen', 'knight', 'rook', 'bishop']) r.push({ from: f, to: t, promotion: pr }); else r.push({ from: f, to: t }); } return r; };
export function judge(p, m, ok) {
  const q = p.clone(); q.play(m);
  if (Array.isArray(ok)) return ok.includes(makeUci(m)) || (ok.includes('e1h1') && makeUci(m) === 'e1g1');
  if (ok === 'mate') return q.isCheckmate();
  if (ok === 'attack') { const pc = q.board.get(m.to); for (const t of [...q.board[q.turn]]) { const v = q.board.get(t); if (v.role !== 'king' && q.kingAttackers(t, pc.color, q.board.occupied).has(m.to)) return true; } return false; }
  if (ok === 'safe-attack') return judge(p, m, 'attack') && q.kingAttackers(m.to, q.turn, q.board.occupied).isEmpty();
  if (ok.startsWith('escape:')) { const sq = 'abcdefgh'.indexOf(ok[7]) + 8 * (+ok[8] - 1); return m.from === sq && q.kingAttackers(m.to, q.turn, q.board.occupied).isEmpty(); }
  if (ok.startsWith('defend:')) { const sq = ['abcdefgh'.indexOf(ok[7]) + 8 * (+ok[8] - 1)][0]; return !!q.board.get(sq) && !q.kingAttackers(sq, p.turn, q.board.occupied).isEmpty(); }
}
let bad = 0;
for (const [k, l] of Object.entries(LESSONS)) for (const [i, it] of l.items.entries()) {
  try {
    if (it.demo) { let p = pos(it.demo); for (const s of it.steps) if (s.move) { const m = parseUci(s.move); if (!moves(p).some(x => x.from === m.from && x.to === m.to)) throw new Error('illegal ' + s.move + ' in ' + k + '#' + i); p.play(m); } console.log(k, i, 'demo ok', p.isCheckmate() ? '(mate)' : ''); }
    else { const p = pos(it.task); const sols = moves(p).filter(m => judge(p, m, it.ok)).map(makeUci); const stale = moves(p).filter(m => { const q = p.clone(); q.play(m); return q.isStalemate(); }).map(makeUci); if (!sols.length) throw new Error('no solution ' + k + '#' + i); console.log(k, i, 'task', sols.join(' '), stale.length ? '| пат: ' + stale.join(' ') : ''); }
  } catch (e) { bad++; console.log('ERR', e.message); }
}
process.exit(bad ? 1 : 0);
