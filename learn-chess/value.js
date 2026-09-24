/* Урок «Цінність фігур»: ціни фігур, приклад зі стрілками й 10 коротких завдань «побий найдорожчу».
   Ходити можна лише білими й лише взяттям; правильне взяття — фігура з найбільшою ціною. */
import { attacks, parseSquare, makeSquare, SquareSet } from 'https://cdn.jsdelivr.net/npm/chessops@0.15.1/+esm';
import { createBoard } from '../shared/board.js';

const LG = window.LG, $ = id => document.getElementById(id), main = document.querySelector('main.vl');
const ROLE = { P: 'pawn', N: 'knight', B: 'bishop', R: 'rook', Q: 'queen', K: 'king' };
const VALUE = { pawn: 1, knight: 3, bishop: 3, rook: 5, queen: 9 };
const NAME = { pawn: 'пішак', knight: 'кінь', bishop: 'слон', rook: 'тура', queen: 'ферзь' };
// [білі, чорні, пояснення]; перше — приклад зі стрілками
const TASKS = [
  ['Bd4', 'Pb6 Nb2 Rg7', 'Слон може побити пішака (1), коня (3) або туру (5). Найдорожча — тура. Бий її!'],
  ['Ra1', 'Pa6 Nf1', 'Тура б’є по прямій. Кого краще забрати?'],
  ['Bc1', 'Pa3 Rg5', 'Слон б’є навскоси.'],
  ['Nd4', 'Pe6 Bc6', 'Кінь стрибає літерою «Г».'],
  ['Pe4', 'Nd5 Qf5', 'Пішак б’є навскоси вперед.'],
  ['Qd1', 'Nd7 Rh5 Pa4', 'Ферзь може побити аж трьох. Кого?'],
  ['Re1', 'Be6 Qa1', 'Подивись уздовж ряду й уздовж лінії.'],
  ['Bb2', 'Rh8 Na3', 'Далеко — не значить погано!'],
  ['Nc3', 'Rb5 Qe4 Pa2', 'Кінь бачить три фігури.'],
  ['Nf3 Bc4', 'Pe5 Qd4 Rf7', 'Тут у тебе дві фігури. Знайди найдорожчу здобич!']
];
const parse = str => new Map(str.split(' ').map(t => [t.slice(1), ROLE[t[0]]]));
let idx = 0, done = false, lock = false;

const board = createBoard($('board'), { onMove: (o, d) => onMove(o, d) });
$('legend').innerHTML = Object.entries(VALUE).map(([r, v]) => `<span><mpiece class="${r} white"></mpiece>${v}</span>`).join('');

function position(t) {
  const m = new Map();
  for (const [sq, role] of parse(t[0])) m.set(sq, { role, color: 'white' });
  for (const [sq, role] of parse(t[1])) m.set(sq, { role, color: 'black' });
  return m;
}
// Куди може бити кожна біла фігура (лише взяття чорних)
function captures(pieces) {
  let o = SquareSet.empty();
  for (const k of pieces.keys()) o = o.with(parseSquare(k));
  const out = new Map();
  for (const [k, p] of pieces) {
    if (p.color !== 'white') continue;
    const list = [];
    for (const sq of attacks({ role: p.role, color: 'white' }, parseSquare(k), o)) {
      const t = pieces.get(makeSquare(sq));
      if (t && t.color === 'black') list.push(makeSquare(sq));
    }
    if (list.length) out.set(k, list);
  }
  return out;
}
function load() {
  const t = TASKS[idx], pcs = position(t), caps = captures(pcs);
  done = false; lock = false;
  $('wrap').classList.remove('solved');
  board.setPosition(pcs, { animate: false });
  board.setMovable('white', caps);
  $('count').textContent = `${idx + 1} / ${TASKS.length}`;
  $('goal').textContent = idx === 0 ? 'Приклад' : 'Побий найдорожчу фігуру';
  task(t[2]);
  // у прикладі — стрілки від фігури до всіх, кого можна побити, з ціною
  if (idx === 0) board.shapes([...caps].flatMap(([from, list]) => list.map(to => {
    const v = VALUE[pcs.get(to).role];
    return { orig: from, dest: to, brush: v === best(pcs, caps) ? 'green' : 'red', label: { text: String(v) } };
  })));
  else board.clearHint();
}
const best = (pcs, caps) => Math.max(...[...caps.values()].flat().map(k => VALUE[pcs.get(k).role]));
function task(text, cls = '') { $('task').textContent = text; $('task').className = 'vl-task ' + cls; }

function onMove(from, to) {
  if (done || lock) return;
  const t = TASKS[idx], pcs = position(t), caps = captures(pcs), got = pcs.get(to), v = VALUE[got.role], top = best(pcs, caps);
  if (v === top) {
    done = true; LG.play('capture'); $('wrap').classList.add('solved'); board.clearHint();
    task(`Так! ${NAME[got.role]} коштує ${v} — це найдорожча здобич 🎉`, 'ok');
    setTimeout(() => {
      if (idx < TASKS.length - 1) { idx++; load(); }
      else LG.win('Тепер ти знаєш, скільки коштують фігури!', { reward: true, onAgain: () => { idx = 0; load(); } });
    }, 1500);
    return;
  }
  lock = true; LG.play('error');
  const better = [...caps.values()].flat().map(k => pcs.get(k)).find(p => VALUE[p.role] === top);
  task(`Можна краще: ${NAME[got.role]} коштує ${v}, а ${NAME[better.role]} — ${top}!`, 'bad');
  setTimeout(() => { board.setPosition(pcs, {}); board.setMovable('white', caps); lock = false; }, 900);
}

$('go').addEventListener('click', () => { main.dataset.step = 'tasks'; board.redraw(); load(); });
$('intro').addEventListener('click', () => { main.dataset.step = 'intro'; });
$('skip').addEventListener('click', () => { if (idx < TASKS.length - 1) { idx++; load(); } });
$('back').addEventListener('click', () => { location.href = 'index.html'; });
LG.addSettings(() => LG.pieceSetPicker(() => location.reload()));
