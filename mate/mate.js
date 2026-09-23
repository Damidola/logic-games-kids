/* Шахові задачі: список розділів → задача або практика.
   Задачі — справжні задачі Lichess (mate/puzzles.json, tools/pick-puzzles.py): спершу сам робиться хід
   суперника, далі дитина знаходить хід (або кілька ходів), суперник відповідає за рішенням Lichess.
   Неправильний хід повертається назад; після 3 помилок гра показує розв'язок. Мат будь-яким ходом — теж правильно.
   Практика — закінчення проти робота без обмеження ходів: поставити мат (або провести пішака й поставити мат). */
import { Chess, makeSquare, parseSquare, parseUci, compat, fen as FEN } from 'https://cdn.jsdelivr.net/npm/chessops@0.15.1/+esm';
import { createBoard, applyBoardLook } from '../shared/board.js';
import { createRules } from '../chess/rules.js';
import { hintMove } from '../shared/ai.js';

const LG = window.LG, $ = id => document.getElementById(id);
const main = document.querySelector('main.mt'), wrap = $('wrap');
const DATA = await (await fetch(new URL('puzzles.json', import.meta.url))).json();

const GROUPS = [
  ['Мат в 1 хід', [
    ['m1rook', 'rook', 'Турою', 'Найпростіші — тура й король'],
    ['m1queen', 'queen', 'Ферзем', 'Ферзь — найсильніша фігура'],
    ['m1bishop', 'bishop', 'Слоном', 'Слон ходить навскоси'],
    ['m1knight', 'knight', 'Конем', 'Кінь стрибає літерою «Г»'],
    ['m1pawn', 'pawn', 'Пішаком', 'Хід пішаком або перетворення'],
    ['m1mix', '🎲', 'Різні', 'Будь-якою фігурою']]],
  ['Мат в 2 ходи', [
    ['mate2', '🏆', 'Мат в 2 ходи', 'Хід, відповідь суперника — і мат']]],
  ['Тактичні прийоми', [
    ['fork', '🍴', 'Вилка', 'Одна фігура нападає одразу на дві'],
    ['pin', '📌', 'Зв’язка', 'Фігура не може піти: за нею стоїть цінніша'],
    ['skewer', '🏹', 'Прострел', 'Напад на цінну фігуру — вона тікає, і ти береш ту, що за нею'],
    ['discovered', '💥', 'Відкритий напад', 'Відійди фігурою — і відкрий удар іншої'],
    ['deflection', '🎣', 'Відволікання', 'Відтягни захисника з важливої клітинки'],
    ['attraction', '🧲', 'Заманювання', 'Заманюй фігуру суперника на погану клітинку'],
    ['hanging', '🎁', 'Незахищена фігура', 'Забери фігуру, яку ніхто не захищає'],
    ['promotion', '👑', 'Пішак у ферзі', 'Проведи пішака до останнього ряду']]],
  ['Практика', [
    ['kqk', 'queen', 'Ферзь і король проти короля', 'Постав мат — ходів скільки завгодно'],
    ['krk', 'rook', 'Тура і король проти короля', 'Заганяй короля до краю дошки'],
    ['kbbk', 'bishop', 'Два слони і король проти короля', 'Слони разом — і король у куті'],
    ['kpk', 'pawn', 'Король і пішак проти короля', 'Проведи пішака у ферзі й постав мат']]]
];
// Завдання під дошкою — щоб завжди було зрозуміло, що робити
const TASK = {
  m1rook: 'Постав мат турою одним ходом.', m1queen: 'Постав мат ферзем одним ходом.', m1bishop: 'Постав мат слоном одним ходом.',
  m1knight: 'Постав мат конем одним ходом.', m1pawn: 'Постав мат пішаком. Дійшов до кінця — обери, ким він стане!',
  m1mix: 'Постав мат одним ходом.', mate2: 'Постав мат за 2 ходи: твій хід, відповідь суперника — і мат.',
  fork: 'Зроби вилку: напади однією фігурою на дві — і забери одну.', pin: 'Зв’яжи фігуру суперника — і виграй матеріал.',
  skewer: 'Напади на цінну фігуру: вона відійде — і ти забереш ту, що за нею.', discovered: 'Відійди фігурою так, щоб відкрився удар іншої, — і виграй матеріал.',
  deflection: 'Відтягни захисника — і виграй фігуру.', attraction: 'Заманюй фігуру суперника на погану клітинку — і виграй.',
  hanging: 'Знайди фігуру, яку ніхто не захищає, — і забери її.', promotion: 'Проведи пішака в ферзі так, щоб його не з’їли.',
  kqk: 'Постав мат ферзем і королем. Ходів — скільки завгодно.', krk: 'Постав мат турою й королем: заганяй короля до краю.',
  kbbk: 'Постав мат двома слонами: заганяй короля в кут.', kpk: 'Проведи пішака в ферзі — і постав мат.'
};
const MATE_SEC = k => k.startsWith('m1') || k === 'mate2';
const INFO = Object.fromEntries(GROUPS.flatMap(([, list]) => list.map(([k, ic, title, sub]) => [k, { ic, title, sub }])));
const PRACTICE = ['kqk', 'krk', 'kbbk', 'kpk'];
const icon = ic => /^[a-z]+$/.test(ic) ? `<mpiece class="${ic} white"></mpiece>` : ic;

const board = createBoard($('board'), { onMove: (o, d) => userMove(o, d) });
const solvedOf = k => new Set(LG.store.get('puz:' + k, []));

let mode = 'menu', sec = null, idx = 0, pos = null, line = [], step = 0, userColor = 'white';
let mistakes = 0, done = false, hintStage = 0, lastMove, token = 0, history = [];

// ---------- дрібниці ----------
const pieces = p => { const m = new Map(); for (const [sq, pc] of p.board) m.set(makeSquare(sq), { role: pc.role, color: pc.color }); return m; };
const show = (p, lm, animate) => { lastMove = lm; board.setPosition(pieces(p), { lastMove: lm, check: p.isCheck() ? p.turn : false, animate }); };
const same = (a, b) => FEN.makeBoardFen(a.board) === FEN.makeBoardFen(b.board) && a.turn === b.turn;
const sound = (p, m) => LG.play(p.board.get(m.to) ? 'capture' : 'move');
function playUci(p, uci) { const m = parseUci(uci), q = p.clone(); sound(p, m); q.play(m); return { q, lm: [makeSquare(m.from), makeSquare(m.to)] }; }
const promoFor = (p, from, to) => p.board.get(parseSquare(from))?.role === 'pawn' && (to[1] === '8' || to[1] === '1');
const allowMoves = () => board.setMovable(userColor, compat.chessgroundDests(pos));
const shake = () => { wrap.classList.remove('wrong'); void wrap.offsetWidth; wrap.classList.add('wrong'); };

// Тимчасовий напис під дошкою
let flash = 0;
function say(text) {
  $('task').textContent = text; $('task').classList.add('say');
  clearTimeout(flash); flash = setTimeout(() => { flash = 0; $('task').classList.remove('say'); paint(); }, 1900);
}
// Як суперник рятується від шаху: король тікає, фігуру, що шахує, б'ють або закриваються
function escape(p) {
  const list = [];
  for (const [from, dests] of p.allDests()) for (const to of dests) {
    const pc = p.board.get(from), victim = p.board.get(to);
    const m = { from, to, promotion: pc.role === 'pawn' && (to >> 3 === 0 || to >> 3 === 7) ? 'queen' : undefined };
    const uci = makeSquare(from) + makeSquare(to) + (m.promotion ? 'q' : '');
    if (pc.role === 'king' && victim && victim.color === pc.color) continue; // рокіровка
    list.push({ uci, rank: pc.role === 'king' ? (victim ? 1 : 0) : victim ? 2 : 3,
      text: pc.role === 'king' ? (victim ? 'Король збив фігуру — це не мат' : 'Король утік — це ще не мат') : victim ? 'Фігуру, що шахує, збили — це не мат' : 'Від шаху закрилися — це не мат' });
  }
  list.sort((a, b) => a.rank - b.rank);
  return list[0];
}
// Вибір фігури для перетворення пішака, як на Lichess
function askPromotion(to, color) {
  return new Promise(done => {
    const white = board.cg.state.orientation === 'white', f = 'abcdefgh'.indexOf(to[0]);
    const col = white ? f : 7 - f, top = (to[1] === '8') === white;
    const el = document.createElement('div');
    el.className = 'mt-promo';
    el.innerHTML = ['queen', 'knight', 'rook', 'bishop'].map((r, i) =>
      `<button type="button" data-r="${r}" style="left:${col * 12.5}%;${top ? 'top' : 'bottom'}:${i * 12.5}%"><mpiece class="${r} ${color}"></mpiece></button>`).join('');
    const finish = r => { el.remove(); done(r ? { queen: 'q', knight: 'n', rook: 'r', bishop: 'b' }[r] : ''); };
    el.addEventListener('click', e => { const b = e.target.closest('button'); finish(b && b.dataset.r); });
    wrap.appendChild(el);
  });
}

function setButtons(list) {
  document.querySelectorAll('.lg-controls button').forEach((b, i) => {
    const [ico, lbl] = list[i]; b.querySelector('.ico').textContent = ico; b.querySelector('.lbl').textContent = lbl;
  });
}

// ---------- список розділів ----------
function renderMenu() {
  $('menu').innerHTML = GROUPS.map(([title, list]) => `<h2>${title}</h2><div class="mt-list">${list.map(([k, ic, name, sub]) => {
    let pr = '';
    if (DATA[k]) { const n = solvedOf(k).size, t = DATA[k].length; pr = `<span class="pr${n >= t ? ' all' : ''}">✅ ${n}/${t}</span>`; }
    else { const w = LG.store.get('prac:' + k, 0); pr = w ? `<span class="pr all">🏆 ${w}</span>` : ''; }
    return `<button type="button" class="mt-card" data-k="${k}"><span class="ic">${icon(ic)}</span><b>${name}</b><small>${sub}</small>${pr}</button>`;
  }).join('')}</div>`).join('');
}
$('menu').addEventListener('click', e => { const b = e.target.closest('.mt-card'); if (b) { history.length = 0; location.hash = b.dataset.k; } });
function route() {
  const k = decodeURIComponent(location.hash.slice(1));
  token++;
  if (!INFO[k]) { mode = 'menu'; main.dataset.mode = 'menu'; board.setMovable(null); renderMenu(); return; }
  sec = k;
  if (PRACTICE.includes(k)) { mode = 'practice'; main.dataset.mode = 'practice'; setButtons([['📋', 'Розділи'], ['💡', 'Підказка'], ['↩️', 'Назад'], ['🔄', 'Заново']]); startPractice(); }
  else {
    mode = 'puzzle'; main.dataset.mode = 'puzzle'; setButtons([['📋', 'Розділи'], ['💡', 'Підказка'], ['👀', 'Розв’язок'], ['▶️', 'Далі']]);
    const list = DATA[k], solved = solvedOf(k);
    idx = list.findIndex(([id]) => !solved.has(id)); if (idx < 0) idx = 0;
    loadPuzzle();
  }
}
window.addEventListener('hashchange', route);
$('list').addEventListener('click', () => { location.hash = ''; });

// ---------- задачі Lichess ----------
function loadPuzzle() {
  const [, fen, moves] = DATA[sec][idx];
  pos = Chess.fromSetup(FEN.parseFen(fen).unwrap()).unwrap();
  line = moves.split(' '); step = 0; mistakes = 0; done = false; hintStage = 0;
  // у спрощених задачах першим ходить гравець; у задачах Lichess — спершу суперник
  const userFirst = line.length % 2 === 1;
  userColor = userFirst ? pos.turn : pos.turn === 'white' ? 'black' : 'white';
  wrap.classList.remove('solved');
  board.setOrientation(userColor); board.clearHint(); board.setMovable(null);
  show(pos, undefined, false); paint();
  const t = ++token;
  if (userFirst) allowMoves();
  else setTimeout(() => { if (t === token) opponent(); }, 700);
}
function opponent() { // хід суперника з рішення Lichess
  const { q, lm } = playUci(pos, line[step]);
  pos = q; step++;
  show(pos, lm); allowMoves(); paint();
}
function paint() {
  const info = INFO[sec];
  if (!flash) $('task').textContent = TASK[sec] || '';
  if (mode === 'practice') {
    $('goal').innerHTML = `${icon(info.ic)} ${info.title}`;
    $('lives').textContent = ''; $('count').textContent = '🏆 ' + LG.store.get('prac:' + sec, 0);
    return;
  }
  const side = userColor === 'white' ? '<span class="mt-side"></span> ходять білі' : '<span class="mt-side b"></span> ходять чорні';
  $('goal').innerHTML = done ? (mistakes >= 3 ? 'Ось як треба 👆' : 'Правильно! 🎉') : `${info.title} · ${side}`;
  $('lives').textContent = '❤️'.repeat(Math.max(0, 3 - mistakes)) + '🤍'.repeat(Math.min(3, mistakes));
  $('count').textContent = `${idx + 1} / ${DATA[sec].length} · ✅ ${solvedOf(sec).size}`;
}
async function puzzleMove(from, to) {
  if (done || pos.turn !== userColor) return;
  const exp = line[step];
  let promo = '';
  if (promoFor(pos, from, to)) {
    const t0 = token;
    promo = await askPromotion(to, userColor);
    if (t0 !== token) return;
    if (!promo) { show(pos, lastMove); return allowMoves(); }
  }
  const test = pos.clone(); test.play(parseUci(from + to + promo));
  const want = pos.clone(); want.play(parseUci(exp));
  if (!same(test, want) && !test.isCheckmate()) {
    mistakes++; LG.play('error'); paint();
    const t = token;
    const back = () => {
      if (t !== token) return;
      show(pos, lastMove); allowMoves();
      if (mistakes >= 3) showSolution(); else paint();
    };
    board.setMovable(null);
    // Шах, але не мат: показуємо, як суперник рятується, — і повертаємо назад
    if (MATE_SEC(sec) && test.isCheck()) {
      show(test, [from, to]);
      const r = escape(test);
      setTimeout(() => {
        if (t !== token || !r) return;
        const { q, lm } = playUci(test, r.uci); show(q, lm);
        say(r.text);
        setTimeout(back, 1500);
      }, 650);
      return;
    }
    shake();
    say(MATE_SEC(sec) ? 'Це не мат — спробуй ще 🙂' : 'Не той хід — спробуй ще 🙂');
    setTimeout(back, 450);
    return;
  }
  const { q, lm } = playUci(pos, from + to + promo);
  pos = q; step++; hintStage = 0; board.clearHint();
  show(pos, lm);
  if (step >= line.length || pos.isCheckmate()) return solved();
  board.setMovable(null);
  const t = token;
  setTimeout(() => { if (t === token) opponent(); }, 500);
}
function solved() {
  done = true; board.setMovable(null); wrap.classList.add('solved');
  const s = solvedOf(sec), first = !s.has(DATA[sec][idx][0]);
  if (mistakes < 3) { s.add(DATA[sec][idx][0]); LG.store.set('puz:' + sec, [...s]); }
  paint();
  if (mistakes < 3 && first && s.size === DATA[sec].length) {
    return LG.win(`Усі задачі «${INFO[sec].title}» розв’язано!`, { reward: true, onAgain: () => nextPuzzle() });
  }
  LG.play('win'); LG.confetti();
  const t = token;
  setTimeout(() => { if (t === token && done) nextPuzzle(); }, 1700);
}
function showSolution() {
  if (done || mode !== 'puzzle') return;
  done = true; mistakes = Math.max(mistakes, 3); board.setMovable(null); paint();
  const t = token;
  const stepOne = () => {
    if (t !== token || step >= line.length) return;
    const m = parseUci(line[step]);
    if (pos.turn === userColor) board.hint(makeSquare(m.from), makeSquare(m.to));
    setTimeout(() => {
      if (t !== token) return;
      board.clearHint();
      const { q, lm } = playUci(pos, line[step]); pos = q; step++; show(pos, lm);
      setTimeout(stepOne, 700);
    }, pos.turn === userColor ? 900 : 300);
  };
  stepOne();
}
function nextPuzzle() {
  const list = DATA[sec], s = solvedOf(sec);
  let n = list.findIndex(([id], i) => i > idx && !s.has(id));
  if (n < 0) n = list.findIndex(([id]) => !s.has(id));
  idx = n < 0 ? (idx + 1) % list.length : n;
  loadPuzzle();
}

// ---------- практика: закінчення проти робота ----------
const VAL = { pawn: 100, knight: 300, bishop: 320, rook: 500, queen: 900, king: 0 };
const base = createRules();
const dist = (a, b) => Math.max(Math.abs((a & 7) - (b & 7)), Math.abs((a >> 3) - (b >> 3)));
const edge = s => Math.max(3 - (s & 7), (s & 7) - 4) + Math.max(3 - (s >> 3), (s >> 3) - 4);
// Оцінка «заганяй короля»: чорний король — ближче до краю, білий король — ближче до нього; пішак — вперед
const rules = {
  ...base,
  evaluate(p, s) {
    let v = 0, wk = -1, bk = -1, pawn = -1;
    for (const [sq, pc] of p.board) {
      if (pc.role === 'king') { if (pc.color === 'white') wk = sq; else bk = sq; continue; }
      v += (pc.color === 'white' ? 1 : -1) * VAL[pc.role];
      if (pc.role === 'pawn' && pc.color === 'white') { pawn = sq; v += 30 * (sq >> 3); }
    }
    if (pawn >= 0) v += 12 * dist(bk, pawn) - 12 * dist(wk, pawn) + 8 * dist(bk, (pawn & 7) + 56);
    else v += 20 * edge(bk) - 6 * dist(wk, bk);
    return s === 'w' ? v : -v;
  },
  aiDepth: [2, 3, 3]
};
const rnd = n => Math.floor(Math.random() * n);
// Stockfish 10 (stockfish.js, GPL) у фоновому потоці: робот захищається й дає підказки, як на Lichess.
// Якщо рушій не запустився — простий власний пошук (shared/ai.js).
let sf = null, sfQueue = Promise.resolve();
function engine() {
  if (sf !== null) return sf;
  try {
    const w = new Worker(new URL('../shared/vendor/stockfish/stockfish.js', import.meta.url));
    let wait = null;
    w.onmessage = e => { const t = String(e.data); if (wait && t.startsWith(wait.prefix)) { const f = wait.done; wait = null; f(t); } };
    w.onerror = () => { sf = false; if (wait) { const f = wait.done; wait = null; f(''); } };
    const ask = (cmds, prefix, ms) => new Promise(done => {
      wait = { prefix, done };
      cmds.forEach(c => w.postMessage(c));
      setTimeout(() => { if (wait && wait.done === done) { wait = null; done(''); } }, ms);
    });
    sf = { ask, ready: ask(['uci', 'isready'], 'readyok', 8000).then(t => { if (!t) sf = false; return !!t; }) };
  } catch (e) { sf = false; }
  return sf;
}
// Найкращий хід: { from, to, promo } або null
function bestMove(p, ms) {
  const run = async () => {
    const e = engine();
    if (e && await e.ready && sf) {
      const t = await sf.ask([`position fen ${FEN.makeFen(p.toSetup())}`, `go movetime ${ms}`], 'bestmove', ms + 4000);
      const u = t.split(' ')[1];
      if (u && u !== '(none)') return { from: u.slice(0, 2), to: u.slice(2, 4), promo: u[4] || '' };
    }
    const m = hintMove(rules, p);
    return m && { from: m.from, to: m.to, promo: '' };
  };
  return (sfQueue = sfQueue.then(run, run));
}
function makePos(put) {
  const rows = [];
  for (let r = 7; r >= 0; r--) {
    let row = '', empty = 0;
    for (let f = 0; f < 8; f++) { const c = put[r * 8 + f]; if (c) { if (empty) row += empty; empty = 0; row += c; } else empty++; }
    rows.push(row + (empty || ''));
  }
  const res = Chess.fromSetup(FEN.parseFen(rows.join('/') + ' w - - 0 1').unwrap());
  return res.isOk ? res.unwrap() : null;
}
function genPosition(k) {
  for (let t = 0; t < 20000; t++) {
    const put = {}, free = s => s >= 0 && s < 64 && !put[s];
    const bk = k === 'kpk' ? rnd(64) : (2 + rnd(4)) + 8 * (2 + rnd(4)); // у практиці мату — король у центрі
    put[bk] = 'k';
    let wk, extra = [];
    if (k === 'kpk') {
      const pf = 1 + rnd(6), pr = 1 + rnd(3), ps = pr * 8 + pf; // пішак b–g, 2–4 ряд
      wk = (pr + 2) * 8 + pf - 1 + rnd(3); // король на «ключовому полі» — виграш є завжди
      if (!free(ps) || !free(wk) || dist(bk, ps) < 3) continue;
      put[ps] = 'P'; extra = [ps];
    } else {
      wk = rnd(64); if (!free(wk)) continue;
      put[wk] = 'K';
      const pcs = { kqk: ['Q'], krk: ['R'], kbbk: ['B', 'B'] }[k];
      let ok = true;
      for (const c of pcs) { const s = rnd(64); if (!free(s)) { ok = false; break; } put[s] = c; extra.push(s); }
      if (!ok) continue;
      if (k === 'kbbk' && ((extra[0] & 7) + (extra[0] >> 3)) % 2 === ((extra[1] & 7) + (extra[1] >> 3)) % 2) continue;
    }
    put[wk] = 'K';
    if (dist(wk, bk) < 2 || extra.some(s => dist(s, bk) < 2)) continue;
    const p = makePos(put);
    if (!p || p.isCheck() || p.isEnd()) continue;
    return p;
  }
}
function startPractice() {
  engine();
  pos = genPosition(sec); history = [pos]; userColor = 'white'; done = false; hintStage = 0; token++;
  wrap.classList.remove('solved'); board.setOrientation('white'); board.clearHint();
  show(pos, undefined, false); allowMoves(); paint();
}
async function practiceMove(from, to) {
  if (done || pos.turn !== 'white') return;
  let promo = '';
  if (promoFor(pos, from, to)) {
    const t0 = token;
    promo = await askPromotion(to, 'white');
    if (t0 !== token) return;
    if (!promo) { show(pos, lastMove); return allowMoves(); }
  }
  const { q, lm } = playUci(pos, from + to + promo);
  pos = q; history.push(pos); board.clearHint(); show(pos, lm);
  if (practiceEnd()) return;
  board.setMovable(null);
  const t = token, started = Date.now();
  bestMove(pos, 350).then(m => setTimeout(() => {
    if (t !== token || !m) return;
    const { q: r, lm: l } = playUci(pos, m.from + m.to + m.promo);
    pos = r; history.push(pos); show(pos, l);
    if (!practiceEnd()) allowMoves();
  }, Math.max(0, 450 - (Date.now() - started))));
}
function practiceEnd() {
  const again = () => { location.hash === '#' + sec ? startPractice() : null; };
  if (pos.isCheckmate()) {
    done = true; board.setMovable(null); wrap.classList.add('solved');
    LG.store.set('prac:' + sec, LG.store.get('prac:' + sec, 0) + 1); paint();
    LG.win('Мат! Чудово зіграно!', { reward: true, onAgain: again });
    return true;
  }
  if (pos.isStalemate()) { done = true; board.setMovable(null); LG.draw('Пат: королю нікуди піти, але шаху немає. Лиши йому клітинку!', { onAgain: again }); return true; }
  if (pos.isInsufficientMaterial()) { done = true; board.setMovable(null); LG.draw('Фігуру забрали — мат тепер не поставити. Стеж, щоб її захищав король!', { onAgain: again }); return true; }
  return false;
}

// ---------- кнопки ----------
function userMove(from, to) { if (mode === 'puzzle') puzzleMove(from, to); else if (mode === 'practice') practiceMove(from, to); }
$('hint').addEventListener('click', async () => {
  if (done) return;
  let from, to;
  if (mode === 'puzzle') { if (pos.turn !== userColor) return; const m = parseUci(line[step]); from = makeSquare(m.from); to = makeSquare(m.to); }
  else if (mode === 'practice') {
    if (pos.turn !== 'white') return;
    const at = pos, t = token, m = await bestMove(pos, 700);
    if (!m || at !== pos || t !== token) return;
    from = m.from; to = m.to;
  } else return;
  // перший раз — яка фігура ходить, другий — куди
  if (hintStage === 0) { board.shapes([{ orig: from, brush: 'hint' }]); hintStage = 1; }
  else board.hint(from, to);
});
$('show').addEventListener('click', () => {
  if (mode === 'puzzle') return showSolution();
  if (mode !== 'practice' || done || history.length < 3 || pos.turn !== 'white') return LG.play('error');
  history.splice(-2); pos = history[history.length - 1]; board.clearHint(); show(pos); allowMoves();
});
$('next').addEventListener('click', () => { if (mode === 'puzzle') nextPuzzle(); else if (mode === 'practice') startPractice(); });

LG.addSettings(() => LG.pieceSetPicker(() => { applyBoardLook(); board.redraw(); if (mode === 'menu') renderMenu(); }));
document.addEventListener('touchmove', e => { if (!e.target.closest('.lg-modal, .mt-menu')) e.preventDefault(); }, { passive: false });
route();
