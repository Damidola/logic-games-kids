/* Міні-урок «Шляху новачка» (chess-path/lesson.html#ключ): вступ → приклади (програються самі) і завдання по черзі.
   Уроки — у lessons.js; ходи перевіряє chessops. */
import { Chess, parseUci, makeUci, makeSquare, parseSquare, compat, fen as FEN } from 'https://cdn.jsdelivr.net/npm/chessops@0.15.1/+esm';
import { createBoard } from '../shared/board.js';
import { LESSONS } from './lessons.js';

const LG = window.LG, $ = id => document.getElementById(id), main = document.querySelector('main.cl');
const lesson = LESSONS[location.hash.slice(1)] || LESSONS.attack;
const items = lesson.items;
let idx = 0, pos, token = 0, done = false, lock = false;

const board = createBoard($('board'), { onMove: (o, d) => onMove(o, d) });
board.cg.set({ movable: { showDests: true } });
const pieces = p => { const m = new Map(); for (const [sq, pc] of p.board) m.set(makeSquare(sq), { role: pc.role, color: pc.color }); return m; };
const show = (p, lm) => board.setPosition(pieces(p), { lastMove: lm, check: p.isCheck() ? p.turn : false });
const parse = fen => Chess.fromSetup(FEN.parseFen(fen).unwrap()).unwrap();
const say = (t, cls = '') => { $('task').innerHTML = t; $('task').className = 'cl-task ' + cls; };
const wait = (ms, t) => new Promise((ok, stop) => setTimeout(() => (t === token ? ok() : stop('stop')), ms));
const shape = s => { const [u, brush = 'green'] = s.split(':'); return u.length === 2 ? { orig: u, brush } : { orig: u.slice(0, 2), dest: u.slice(2, 4), brush }; };
// Рокіровка: у chessops король «іде на туру» (e1h1), на дошці — на g1
function toMove(p, from, to) {
  const m = { from: parseSquare(from), to: parseSquare(to) }, pc = p.board.get(m.from);
  if (pc.role === 'king' && Math.abs((m.from & 7) - (m.to & 7)) === 2) m.to = (m.to & 7) > (m.from & 7) ? (m.from | 7) : (m.from & ~7);
  return m;
}
const isPromo = (p, m) => p.board.get(m.from)?.role === 'pawn' && (m.to >> 3 === 7 || m.to >> 3 === 0);
// Вибір фігури при перетворенні пішака, як на Lichess
function askPromotion(to) {
  return new Promise(done => {
    const f = 'abcdefgh'.indexOf(to[0]), el = document.createElement('div');
    el.className = 'cl-promo';
    el.innerHTML = ['queen', 'knight', 'rook', 'bishop'].map((r, i) =>
      `<button type="button" data-r="${r}" style="left:${f * 12.5}%;top:${i * 12.5}%"><mpiece class="${r} white"></mpiece></button>`).join('');
    el.addEventListener('click', e => { const b = e.target.closest('button'); el.remove(); done(b ? b.dataset.r : null); });
    $('wrap').appendChild(el);
  });
}
// Хід зі звуком; кінь — буквою «Г»: спершу дві клітинки прямо, потім одна вбік
async function play(p, m, t) {
  const pc = p.board.get(m.from), cap = !!p.board.get(m.to);
  const df = (m.to & 7) - (m.from & 7), dr = (m.to >> 3) - (m.from >> 3);
  if (pc.role === 'knight' && t !== undefined) {
    const mid = Math.abs(dr) === 2 ? m.from + 8 * dr : m.from + df; // довга частина «Г»
    const tmp = pieces(p); tmp.delete(makeSquare(m.from)); if (!p.board.has(mid)) tmp.set(makeSquare(mid), { role: 'knight', color: pc.color });
    if (!p.board.has(mid)) { board.setPosition(tmp, {}); await wait(260, t); }
  }
  const q = p.clone(); q.play(m); LG.play(cap ? 'capture' : 'move');
  show(q, [makeSquare(m.from), makeSquare(m.to)]);
  return q;
}

function load() {
  const it = items[idx]; token++; done = false; lock = false;
  $('wrap').classList.remove('solved'); board.clearHint(); board.setMovable(null);
  $('count').textContent = `${idx + 1} / ${items.length}`;
  $('next').querySelector('.lbl').textContent = idx < items.length - 1 ? 'Далі' : 'Готово';
  if (it.demo) { $('goal').textContent = '📖 Приклад'; main.dataset.kind = 'demo'; runDemo(it); }
  else {
    $('goal').textContent = '🧩 Завдання'; main.dataset.kind = 'task';
    pos = parse(it.task); show(pos); say(it.text);
    board.setMovable('white', compat.chessgroundDests(pos));
  }
}
async function runDemo(it) {
  const t = token;
  try {
    let p = parse(it.demo); show(p);
    say('Дивись…');
    await wait(500, t);
    for (const s of it.steps) {
      if (s.say) say(s.say);
      if (s.arrows) board.shapes(s.arrows.split(' ').map(shape)); else if (s.move) board.clearHint();
      if (s.move) { const m = parseUci(s.move); p = await play(p, m, t); if (p.isCheckmate()) $('wrap').classList.add('solved'); }
      await wait(s.wait ?? (s.move ? 1200 : 2200), t);
    }
    done = true; $('next').classList.add('ready');
  } catch (e) { if (e !== 'stop') throw e; }
}
function judge(p, m, it) {
  const q = p.clone(); q.play(m); const uci = makeUci(m);
  if (it.bad && it.bad[uci]) return [false, it.bad[uci]];
  if (it.role && p.board.get(m.from).role !== it.role) return [false, 'Можна й так, але спробуй виконати завдання точно 🙂'];
  const ok = it.ok;
  if (Array.isArray(ok)) return [ok.includes(uci) || (ok.includes('e1g1') && uci === 'e1h1'), 'Не той хід — спробуй ще 🙂'];
  if (ok === 'mate') return [q.isCheckmate(), q.isStalemate() ? 'Пат! Шаху немає, а ходів немає — нічия 😕' : q.isCheck() ? 'Шах є, але король утече — це не мат' : 'Це не мат — спробуй ще 🙂'];
  if (ok === 'attack') {
    const pc = q.board.get(m.to);
    for (const sq of q.board[q.turn]) { const v = q.board.get(sq); if (v.role !== 'king' && q.kingAttackers(sq, pc.color, q.board.occupied).has(m.to)) return [true]; }
    return [false, 'Звідси фігура ні на кого не нападає'];
  }
  if (ok === 'safe-attack') {
    const [a] = judge(p, m, { ok: 'attack' });
    if (!a) return [false, 'Звідси фігура ні на кого не нападає'];
    return [q.kingAttackers(m.to, q.turn, q.board.occupied).isEmpty(), 'Напад є, але твою фігуру тут поб’ють!'];
  }
  if (ok.startsWith('escape:')) {
    const sq = parseSquare(ok.slice(7));
    return [m.from === sq && q.kingAttackers(m.to, q.turn, q.board.occupied).isEmpty(), m.from !== sq ? 'Треба рятувати ферзя' : 'Тут ферзя теж поб’ють!'];
  }
  if (ok.startsWith('defend:')) {
    const sq = parseSquare(ok.slice(7));
    return [!!q.board.get(sq) && !q.kingAttackers(sq, p.turn, q.board.occupied).isEmpty(), 'Фігура досі без захисту'];
  }
  return [false, ''];
}
async function onMove(from, to) {
  const it = items[idx]; if (!it.task || done || lock) return;
  const m = toMove(pos, from, to), t = token;
  if (isPromo(pos, m)) {
    lock = true; m.promotion = await askPromotion(to); lock = false;
    if (t !== token) return;
    if (!m.promotion) { show(pos); return board.setMovable('white', compat.chessgroundDests(pos)); }
  }
  const [ok, why] = judge(pos, m, it);
  if (ok) {
    done = true; board.setMovable(null);
    pos = await play(pos, m).catch(() => pos);
    $('wrap').classList.add('solved'); say(pos.isCheckmate() ? 'Мат! 🎉' : 'Правильно! 🎉', 'ok'); $('next').classList.add('ready');
    setTimeout(() => { if (t === token) next(); }, 1500);
    return;
  }
  lock = true; LG.play('error'); say(why, 'bad');
  setTimeout(() => { if (t !== token) return; show(pos); board.setMovable('white', compat.chessgroundDests(pos)); lock = false; }, 900);
}
function next() {
  $('next').classList.remove('ready');
  if (idx < items.length - 1) { idx++; load(); return; }
  LG.store.set('lesson:' + location.hash.slice(1), true);
  LG.win(`Урок «${lesson.title}» пройдено!`, { reward: true, onAgain: () => { idx = 0; load(); } });
}

$('title').textContent = lesson.title;
$('intro-text').innerHTML = lesson.intro;
document.title = lesson.title;
$('go').addEventListener('click', () => { main.dataset.step = 'items'; board.redraw(); idx = 0; load(); });
$('again').addEventListener('click', () => load());
$('rules').addEventListener('click', () => { token++; main.dataset.step = 'intro'; });
$('next').addEventListener('click', () => next());
LG.addSettings(() => LG.pieceSetPicker(() => location.reload()));
window.addEventListener('hashchange', () => location.reload());
