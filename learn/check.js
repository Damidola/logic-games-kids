/* Урок «Шах»: що таке шах, три способи врятуватися (утекти, побити, закритися) — приклад зі стрілками,
   потім прості завдання: 2 — «постав шах», по 3 — на кожен спосіб. Задачі — перші (найпростіші)
   з «Шахових задач» (mate/puzzles.json, розділи chk_* та esc_*). Ходи перевіряються правилами chessops. */
import { Chess, parseUci, parseSquare, makeSquare, compat, fen as FEN } from 'https://cdn.jsdelivr.net/npm/chessops@0.15.1/+esm';
import { createBoard } from '../shared/board.js';

const LG = window.LG, $ = id => document.getElementById(id), main = document.querySelector('main.vl');
const DATA = await (await fetch(new URL('../mate/puzzles.json', import.meta.url))).json();

// Приклад: чорна тура шахує; можна втекти, побити слоном або закритися турою — найкраще побити
const DEMO = { fen: '4r2k/8/8/1B6/R7/8/8/4K3 w - - 0 1', kind: 'capture',
  text: 'Чорна тура шахує короля. Зелені стрілки — куди втекти, синя — як закритися, червона — побити. Найкраще тут — побити туру слоном!' };
const TASKS = [
  { ...DEMO, title: 'Приклад' },
  ...DATA.chk_rook.slice(0, 1).map(z => ({ fen: z[1], kind: 'give', role: 'rook', title: 'Постав шах', text: 'Тепер ти: постав шах турою чорному королю.' })),
  ...DATA.chk_bishop.slice(0, 1).map(z => ({ fen: z[1], kind: 'give', role: 'bishop', title: 'Постав шах', text: 'Постав шах слоном — навскоси.' })),
  ...DATA.esc_run.slice(0, 3).map(z => ({ fen: z[1], kind: 'run', title: 'Утечи 🏃', text: 'Твоєму королю шах! Відведи короля туди, де його не б’ють.' })),
  ...DATA.esc_capture.slice(0, 3).map(z => ({ fen: z[1], kind: 'capture', title: 'Побий ⚔️', text: 'Шах! Побий фігуру, що шахує.' })),
  ...DATA.esc_block.slice(0, 3).map(z => ({ fen: z[1], kind: 'block', title: 'Закрийся 🛡️', text: 'Шах! Закрийся: постав свою фігуру між королем і нападником.' }))
];
const WAY = { run: 'утекти королем', capture: 'побити фігуру, що шахує', block: 'закритися' };
const RU = { rook: 'турою', bishop: 'слоном', queen: 'ферзем', knight: 'конем', pawn: 'пішаком' };
let idx = 0, pos, done = false, lock = false;

const board = createBoard($('board'), { onMove: (o, d) => onMove(o, d) });
const pieces = p => { const m = new Map(); for (const [sq, pc] of p.board) m.set(makeSquare(sq), { role: pc.role, color: pc.color }); return m; };
const show = (p, lm) => board.setPosition(pieces(p), { lastMove: lm, check: p.isCheck() ? p.turn : false, animate: !!lm });
const kindOf = (p, m) => { const king = p.board.get(m.from).role === 'king', cap = p.ctx().checkers.has(m.to); return king && !cap ? 'run' : cap ? 'capture' : 'block'; };
function task(text, cls = '') { $('task').textContent = text; $('task').className = 'vl-task ' + cls; }

function load() {
  const t = TASKS[idx];
  pos = Chess.fromSetup(FEN.parseFen(t.fen).unwrap()).unwrap();
  done = false; lock = false;
  $('wrap').classList.remove('solved');
  show(pos); board.setMovable('white', compat.chessgroundDests(pos));
  $('count').textContent = `${idx + 1} / ${TASKS.length}`;
  $('goal').textContent = t.title;
  task(t.text);
  if (idx === 0) arrows(); else board.clearHint();
}
// Стрілки всіх способів порятунку (для прикладу)
function arrows() {
  const shapes = [], k = [...pos.board.pieces('white', 'king')][0];
  for (const c of pos.ctx().checkers) shapes.push({ orig: makeSquare(c), dest: makeSquare(k), brush: 'yellow' });
  for (const [from, ds] of compat.chessgroundDests(pos)) for (const to of ds) {
    const kind = kindOf(pos, { from: parseSquare(from), to: parseSquare(to) });
    shapes.push({ orig: from, dest: to, brush: kind === 'run' ? 'green' : kind === 'capture' ? 'red' : 'blue' });
  }
  board.shapes(shapes);
}
function onMove(from, to) {
  if (done || lock) return;
  const t = TASKS[idx], m = { from: parseSquare(from), to: parseSquare(to) };
  const pc = pos.board.get(m.from);
  if (pc.role === 'pawn' && (to[1] === '8' || to[1] === '1')) m.promotion = 'queen';
  const q = pos.clone(); q.play(m);
  let ok, why;
  if (t.kind === 'give') { ok = q.isCheck() && pc.role === t.role; why = !q.isCheck() ? 'Це ще не шах — король не під ударом.' : `Шах є, але треба ${RU[t.role]}!`; }
  else { const k = kindOf(pos, m); ok = k === t.kind; why = `Так теж можна врятуватися, але тут треба ${WAY[t.kind]}.`; }
  LG.play(pos.board.get(m.to) ? 'capture' : 'move');
  if (ok) {
    done = true; pos = q; show(pos, [from, to]); board.setMovable(null); board.clearHint(); $('wrap').classList.add('solved');
    task(t.kind === 'give' ? 'Шах! Король під ударом 🎉' : t.kind === 'capture' ? 'Побив — і ще й виграв фігуру! 🎉' : 'Король урятований! 🎉', 'ok');
    setTimeout(() => {
      if (idx < TASKS.length - 1) { idx++; load(); }
      else LG.win('Ти знаєш, що таке шах і як від нього врятуватися!', { reward: true, onAgain: () => { idx = 0; load(); } });
    }, 1500);
    return;
  }
  lock = true; LG.play('error'); task(why, 'bad');
  setTimeout(() => { show(pos); board.setMovable('white', compat.chessgroundDests(pos)); if (idx === 0) arrows(); lock = false; }, 1100);
}

$('go').addEventListener('click', () => { main.dataset.step = 'tasks'; board.redraw(); load(); });
$('intro').addEventListener('click', () => { main.dataset.step = 'intro'; });
$('skip').addEventListener('click', () => { if (idx < TASKS.length - 1) { idx++; load(); } });
$('back').addEventListener('click', () => { location.href = 'index.html'; });
LG.addSettings(() => LG.pieceSetPicker(() => location.reload()));
