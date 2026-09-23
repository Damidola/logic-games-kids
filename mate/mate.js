/* Мат в 1 хід: білі ходять і ставлять мат. Задачі — mate/puzzles.json (tools/gen-mate1.mjs).
   Неправильний хід повертається назад; після 3 помилок гра сама показує розв'язок. */
import { Chess, makeSquare, parseSquare, fen as FEN } from 'https://cdn.jsdelivr.net/npm/chessops@0.15.1/+esm';
import { createBoard } from '../shared/board.js';

const LG = window.LG, $ = id => document.getElementById(id);
const ROLE = { r: 'rook', b: 'bishop', q: 'queen', n: 'knight', p: 'pawn' };
const PIECES = [['any', '🎲'], ['r', 'rook'], ['b', 'bishop'], ['q', 'queen'], ['n', 'knight'], ['p', 'pawn']];
const DATA = await (await fetch(new URL('puzzles.json', import.meta.url))).json();

let level = LG.store.get('mate:level', 'few'), piece = LG.store.get('mate:piece', 'any');
let pos, puzzle, mistakes = 0, done = false, queue = [];
const solved = new Set(LG.store.get('mate:solved', []));

$('piece').innerHTML = PIECES.map(([k, r]) => `<button type="button" role="radio" data-p="${k}" title="${k === 'any' ? 'Будь-яка фігура' : ''}">${k === 'any' ? r : `<mpiece class="${r} white"></mpiece>`}</button>`).join('');
const paintSetup = () => {
  document.querySelectorAll('#level button').forEach(b => b.setAttribute('aria-checked', String(b.dataset.l === level)));
  document.querySelectorAll('#piece button').forEach(b => b.setAttribute('aria-checked', String(b.dataset.p === piece)));
};
$('level').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; level = b.dataset.l; LG.store.set('mate:level', level); queue = []; next(); });
$('piece').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; piece = b.dataset.p; LG.store.set('mate:piece', piece); queue = []; next(); });

const board = createBoard($('board'), { onMove: (o, d) => userMove(o, d) });

const mateMoves = p => {
  const out = [];
  for (const [from, dests] of p.allDests()) for (const to of dests) {
    const pc = p.board.get(from), promo = pc.role === 'pawn' && (to >> 3) === 7 ? 'queen' : undefined;
    const q = p.clone(); q.play({ from, to, promotion: promo });
    if (q.isCheckmate()) out.push({ from: makeSquare(from), to: makeSquare(to) });
  }
  return out;
};
function pieces(p) { const m = new Map(); for (const [sq, pc] of p.board) m.set(makeSquare(sq), { role: pc.role, color: pc.color }); return m; }
function dests(p) { const m = new Map(); for (const [from, ds] of p.allDests()) { const a = [...ds].map(makeSquare); if (a.length) m.set(makeSquare(from), a); } return m; }

function next() {
  paintSetup();
  if (!queue.length) {
    const list = DATA[level].filter(([, r]) => piece === 'any' || r === piece);
    // спершу — ще не розв'язані, у випадковому порядку
    queue = list.filter(([f]) => !solved.has(f)).sort(() => Math.random() - .5);
    if (!queue.length) queue = list.slice().sort(() => Math.random() - .5);
  }
  puzzle = queue.pop();
  pos = Chess.fromSetup(FEN.parseFen(puzzle[0]).unwrap()).unwrap();
  mistakes = 0; done = false;
  $('wrap').classList.remove('solved');
  board.setOrientation('white');
  board.setPosition(pieces(pos), { animate: false });
  board.setMovable('white', dests(pos));
  board.clearHint();
  paintStatus();
}
function paintStatus() {
  $('goal').textContent = done ? (mistakes >= 3 ? 'Ось як треба 👆' : 'Мат! 🎉') : 'Мат в 1 хід!';
  $('lives').textContent = '❤️'.repeat(Math.max(0, 3 - mistakes)) + '🤍'.repeat(Math.min(3, mistakes));
  $('count').textContent = '✅ ' + solved.size;
}

function userMove(from, to) {
  if (done) return;
  const p = pos.clone(), pc = p.board.get(parseSquare(from));
  p.play({ from: parseSquare(from), to: parseSquare(to), promotion: pc.role === 'pawn' && to[1] === '8' ? 'queen' : undefined });
  if (p.isCheckmate()) {
    done = true; pos = p;
    board.setPosition(pieces(p), { lastMove: [from, to], check: 'black' });
    board.setMovable(null, new Map());
    $('wrap').classList.add('solved');
    solved.add(puzzle[0]); LG.store.set('mate:solved', [...solved]);
    LG.play('win'); LG.confetti();
    paintStatus();
    setTimeout(() => { if (done) next(); }, 1800);
    return;
  }
  // не мат — фігура повертається назад
  mistakes++;
  LG.play('error');
  $('wrap').classList.remove('wrong'); void $('wrap').offsetWidth; $('wrap').classList.add('wrong');
  setTimeout(() => {
    board.setPosition(pieces(pos), {});
    board.setMovable('white', dests(pos));
    if (mistakes >= 3) showSolution();
    paintStatus();
  }, 450);
  paintStatus();
}

function showSolution() {
  if (done) return;
  const m = mateMoves(pos)[0];
  done = true; mistakes = Math.max(mistakes, 3);
  board.setMovable(null, new Map());
  board.hint(m.from, m.to);
  paintStatus();
  setTimeout(() => {
    const p = pos.clone(), pc = p.board.get(parseSquare(m.from));
    p.play({ from: parseSquare(m.from), to: parseSquare(m.to), promotion: pc.role === 'pawn' && m.to[1] === '8' ? 'queen' : undefined });
    board.setPosition(pieces(p), { lastMove: [m.from, m.to], check: 'black' });
  }, 1200);
}

$('hint').addEventListener('click', () => { // підказка: яка фігура ставить мат
  if (done) return;
  const m = mateMoves(pos)[0];
  board.shapes([{ orig: m.from, brush: 'hint' }]);
});
$('show').addEventListener('click', showSolution);
$('next').addEventListener('click', next);

LG.addSettings(() => LG.pieceSetPicker(() => { board.redraw(); }));
document.addEventListener('touchmove', e => { if (!e.target.closest('.lg-modal')) e.preventDefault(); }, { passive: false });
next();
