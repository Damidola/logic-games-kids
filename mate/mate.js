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
  ['Постав шах', [
    ['chk_rook', 'rook', 'Турою', 'Шах — це напад на короля'],
    ['chk_bishop', 'bishop', 'Слоном', 'Слон шахує навскоси'],
    ['chk_queen', 'queen', 'Ферзем', 'Ферзь шахує звідусіль'],
    ['chk_knight', 'knight', 'Конем', 'Кінь шахує стрибком'],
    ['chk_pawn', 'pawn', 'Пішаком', 'Пішак шахує навскоси вперед']]],
  ['Урятуйся від шаху', [
    ['esc_run', '🏃', 'Утечи королем', 'Відведи короля туди, де його не б’ють'],
    ['esc_capture', '⚔️', 'Побий того, хто шахує', 'Часто найкращий спосіб!'],
    ['esc_block', '🛡️', 'Закрийся', 'Постав фігуру між королем і нападником'],
    ['esc_mixed', '🎲', 'Різні', 'Утекти, побити чи закритися — здогадайся сам']]],
  ['Мат в 1 хід', [
    ['m1rook', 'rook', 'Турою', 'Найпростіші — тура й король'],
    ['m1bishop', 'bishop', 'Слоном', 'Слон ходить навскоси'],
    ['m1pawn', 'pawn', 'Пішаком', 'Хід пішаком або перетворення'],
    ['m1queen', 'queen', 'Ферзем', 'Ферзь — найсильніша фігура'],
    ['m1knight', 'knight', 'Конем', 'Кінь стрибає літерою «Г»'],
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
];
// Завдання під дошкою — щоб завжди було зрозуміло, що робити
const TASK = {
  chk_rook: 'Постав шах турою: напади на чорного короля.', chk_bishop: 'Постав шах слоном: напади на короля навскоси.',
  chk_queen: 'Постав шах ферзем.', chk_knight: 'Постав шах конем — стрибком літерою «Г».', chk_pawn: 'Постав шах пішаком: пішак б’є навскоси вперед.',
  esc_run: 'Твоєму королю шах! Відведи короля на єдину клітинку, яку ніхто не б’є.', esc_capture: 'Твоєму королю шах! Побий фігуру, що шахує.',
  esc_block: 'Твоєму королю шах! Закрийся: постав свою фігуру між королем і нападником.', esc_mixed: 'Твоєму королю шах! Урятуйся: утечи, побий або закрийся — один хід рятує.',
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
// Задачі на шах: правильний будь-який хід потрібного виду (не лише записаний)
const CHK_ROLE = { chk_rook: 'rook', chk_bishop: 'bishop', chk_queen: 'queen', chk_knight: 'knight', chk_pawn: 'pawn' };
const RU = { rook: 'турою', bishop: 'слоном', queen: 'ферзем', knight: 'конем', pawn: 'пішаком' };
function ruleCheck(p, m, test) {
  const role = p.board.get(m.from)?.role;
  if (CHK_ROLE[sec]) {
    if (!test.isCheck()) return [false, 'Це ще не шах: король не під ударом. Спробуй ще 🙂'];
    if (role !== CHK_ROLE[sec]) return [false, `Шах є, але треба ${RU[CHK_ROLE[sec]]}!`];
    return [true];
  }
  if (sec.startsWith('esc_') && sec !== 'esc_mixed') {
    const checker = p.ctx().checkers, capture = checker.has(m.to), king = role === 'king';
    const kindOf = king && !capture ? 'run' : capture ? 'capture' : 'block';
    const want = sec.slice(4);
    if (kindOf === want) return [true];
    const said = { run: 'королем утекти', capture: 'побити фігуру, що шахує', block: 'закритися' };
    return [false, `Так теж можна врятуватися, але тут треба ${said[want]} 🙂`];
  }
  return null;
}
// Практика закінчень відкривається з уроків («Як ходять фігури»), у меню задач її немає
const PRACTICE_ITEMS = [
  ['kqk', 'queen', 'Ферзь і король проти короля', 'Постав мат — ходів скільки завгодно'],
  ['krk', 'rook', 'Тура і король проти короля', 'Заганяй короля до краю дошки'],
  ['kbbk', 'bishop', 'Два слони і король проти короля', 'Слони разом — і король у куті'],
  ['kpk', 'pawn', 'Король і пішак проти короля', 'Проведи пішака у ферзі й постав мат']
];
const INFO = Object.fromEntries([...GROUPS.flatMap(([, list]) => list), ...PRACTICE_ITEMS].map(([k, ic, title, sub]) => [k, { ic, title, sub }]));
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
function say(text, ms = 1900) {
  $('task').textContent = text; $('task').classList.add('say');
  clearTimeout(flash); flash = setTimeout(() => { flash = 0; $('task').classList.remove('say'); paint(); }, ms);
}
// Як суперник рятується від шаху: король тікає, фігуру, що шахує, б'ють або закриваються
function escape(p) { return escapes(p)[0]; }
function escapes(p) {
  const list = [];
  for (const [from, dests] of p.allDests()) for (const to of dests) {
    const pc = p.board.get(from), victim = p.board.get(to);
    const m = { from, to, promotion: pc.role === 'pawn' && (to >> 3 === 0 || to >> 3 === 7) ? 'queen' : undefined };
    const uci = makeSquare(from) + makeSquare(to) + (m.promotion ? 'q' : '');
    if (pc.role === 'king' && victim && victim.color === pc.color) continue; // рокіровка
    list.push({ uci, rank: pc.role === 'king' ? (victim ? 1 : 0) : victim ? 2 : 3,
      text: pc.role === 'king' ? (victim ? 'Король збив фігуру — це не мат' : 'Король утік — туди ніхто не б’є') : victim ? 'Фігуру, що шахує, просто збили' : 'Від шаху закрилися іншою фігурою' });
  }
  list.sort((a, b) => a.rank - b.rank);
  return list;
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
  document.querySelectorAll('.lg-controls button:not(#prev)').forEach((b, i) => {
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
  if (PRACTICE.includes(k)) { mode = 'practice'; main.dataset.mode = 'practice'; setButtons([['🎓', 'Уроки'], ['💡', 'Підказка'], ['↩️', 'Назад'], ['🔄', 'Заново']]); startPractice(); }
  else {
    startExample();
  }
}
function startPuzzles() {
  mode = 'puzzle'; main.dataset.mode = 'puzzle'; setButtons([['📋', 'Розділи'], ['💡', 'Підказка'], ['👀', 'Розв’язок'], ['▶️', 'Далі']]);
  const list = DATA[sec], solved = solvedOf(sec);
  idx = list.findIndex(([id]) => !solved.has(id)); if (idx < 0) idx = 0;
  loadPuzzle();
}
window.addEventListener('hashchange', route);
$('list').addEventListener('click', () => { if (mode === 'practice') location.href = '../learn/index.html'; else location.hash = ''; });

// ---------- задачі Lichess ----------
function loadPuzzle() {
  const [, fen, moves] = DATA[sec][idx];
  pos = Chess.fromSetup(FEN.parseFen(fen).unwrap()).unwrap();
  line = moves.split(' '); step = 0; mistakes = 0; done = false; hintStage = 0;
  // у спрощених задачах першим ходить гравець; у задачах Lichess — спершу суперник
  const userFirst = line.length % 2 === 1;
  userColor = userFirst ? pos.turn : pos.turn === 'white' ? 'black' : 'white';
  wrap.classList.remove('solved');
  // у задачах на шах не підказуємо крапками, куди можна піти
  board.cg.set({ movable: { showDests: !/^(chk|esc)_/.test(sec) } });
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
  const rule = ruleCheck(pos, parseUci(from + to + promo), test);
  if (rule ? !rule[0] : !same(test, want) && !test.isCheckmate()) {
    if (rule) say(rule[1], 2200);
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
      const outs = escapes(test), r = outs[0];
      say('Шах, але не мат: ' + (outs.length > 1 ? 'ось як можна врятуватися 👇' : 'ось як урятуватися 👇'), 3600);
      // стрілки: усі способи врятуватися (куди тікає король, хто б'є, хто закриває)
      setTimeout(() => { if (t === token) board.shapes(outs.slice(0, 8).map(o => ({ orig: o.uci.slice(0, 2), dest: o.uci.slice(2, 4), brush: o.rank === 0 ? 'green' : o.rank === 3 ? 'blue' : 'red' }))); }, 350);
      setTimeout(() => {
        if (t !== token || !r) return;
        board.clearHint();
        const { q, lm } = playUci(test, r.uci); show(q, lm);
        say(r.text, 2200);
        setTimeout(back, 1800);
      }, 1900);
      return;
    }
    shake();
    if (!rule) say(MATE_SEC(sec) ? 'Це не мат — спробуй ще 🙂' : 'Не той хід — спробуй ще 🙂');
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
function prevPuzzle() {
  const n = DATA[sec].length;
  idx = (idx - 1 + n) % n;
  loadPuzzle();
}
function nextPuzzle() {
  const list = DATA[sec], s = solvedOf(sec);
  let n = list.findIndex(([id], i) => i > idx && !s.has(id));
  if (n < 0) n = list.findIndex(([id]) => !s.has(id));
  idx = n < 0 ? (idx + 1) % list.length : n;
  loadPuzzle();
}

// ---------- приклад на початку розділу: пояснення й розв'язок, що програється сам ----------
// Беремо задачу з глибини розділу (перші, найпростіші, не підказуємо) — з найкоротшим розв'язком
const EXPLAIN = {
  chk: r => `Шах — це напад на короля. Поставити шах ${r} часто можна по-різному.`,
  esc_run: 'Королю шах! Утекти можна лише туди, де короля ніхто не б’є.',
  esc_capture: 'Королю шах! Найкраще — побити фігуру, що шахує: і врятувався, і виграв фігуру.',
  esc_block: 'Королю шах! Можна закритися: поставити свою фігуру між королем і нападником.',
  esc_mixed: 'Від шаху рятують три способи: утекти, побити або закритися. Тут підходить лише один.',
  mate: 'Мат — це шах, від якого нікуди подітися: ні втекти, ні побити, ні закритися.',
  mate2: 'Мат за 2 ходи: спершу хід, після якого суперник не врятується, а потім — мат.',
  fork: 'Вилка — одна фігура нападає одразу на дві. Обидві не врятувати!',
  pin: 'Зв’язка — фігура суперника не може відійти: за нею стоїть цінніша.',
  skewer: 'Прострел — нападаємо на цінну фігуру; вона тікає, а ми беремо ту, що за нею.',
  discovered: 'Відкритий напад — одна фігура відходить і відкриває удар іншої.',
  deflection: 'Відволікання — відтягуємо захисника, і те, що він захищав, лишається без охорони.',
  attraction: 'Заманювання — змушуємо фігуру суперника стати на погану клітинку.',
  hanging: 'Незахищена фігура — її ніхто не охороняє. Забирай безкоштовно!',
  promotion: 'Пішак, що дійшов до останнього ряду, стає ферзем (або іншою фігурою).'
};
// Підписи до ходів прикладу: [перед першим ходом, після нього, відповідь суперника, фінал]
const CAP = {
  fork: ['Дивись: ця фігура нападе одразу на дві 👇', 'Вилка! Під ударом одразу дві фігури.', 'Суперник рятує одну…', 'Виграли фігуру! 🎉'],
  pin: ['Нападаємо на фігуру, за якою стоїть цінніша 👇', 'Зв’язка! Відійти не можна — пропаде та, що позаду.', 'Суперник відповідає…', 'Виграли матеріал! 🎉'],
  skewer: ['Нападаємо на цінну фігуру 👇', 'Прострел! Цінна фігура мусить тікати…', 'Вона відходить…', '…і ми беремо ту, що стояла за нею! 🎉'],
  discovered: ['Ця фігура відійде — і відкриє удар іншої 👇', 'Відкритий напад! Нападають одразу дві наші фігури.', 'Суперник рятує одне…', '…а інше забираємо! 🎉'],
  deflection: ['Відтягуємо захисника з важливої клітинки 👇', 'Захиснику доведеться відволіктися…', 'Суперник відповідає…', 'Захисника немає — забираємо! 🎉'],
  attraction: ['Заманюємо фігуру суперника 👇', 'Приманка! Суперник мусить піти сюди…', 'Суперник пішов на погану клітинку…', 'А тепер — удар! 🎉'],
  hanging: ['Шукаємо фігуру, яку ніхто не захищає 👇', 'Забрали! 🎉', 'Суперник відповідає…', 'Виграли фігуру! 🎉'],
  promotion: ['Ведемо пішака вперед 👇', 'Пішак іде до останнього ряду!', 'Суперник відповідає…', 'Пішак став ферзем! 👑'],
  mate: ['Шукаємо хід, після якого королю нікуди подітися 👇', 'Мат! Королю нікуди подітися 🎉'],
  mate2: ['Спершу — хід, після якого суперник не врятується 👇', 'Сильний хід!', 'Суперник відповідає…', 'І мат! 🎉']
};
const exKey = k => k.startsWith('chk_') ? 'chk' : k.startsWith('m1') ? 'mate' : k;
function exampleIndex(k) {
  const list = DATA[k], from = Math.min(k.startsWith('chk_') ? 15 : k.startsWith('esc_') ? 10 : 8, list.length - 1);
  let best = from, bs = 1e9;
  for (let i = from; i < Math.min(list.length, from + 15); i++) {
    const [, fen, moves] = list[i], ln = moves.split(' ');
    let s = ln.length;
    if (k === 'fork') { // вилка конем із шахом — найзрозуміліша
      const p = Chess.fromSetup(FEN.parseFen(fen).unwrap()).unwrap(), m = parseUci(ln[0]), q = p.clone(); q.play(m);
      if (p.board.get(m.from).role !== 'knight') s += 4;
      if (!q.isCheck()) s += 2;
    }
    if (k === 'promotion' && !ln.some(u => u.length === 5)) s += 10;
    if (k.startsWith('chk_')) { // більше різних шахів — цікавіше показати
      const p = Chess.fromSetup(FEN.parseFen(fen).unwrap()).unwrap();
      s -= checksBy(p, CHK_ROLE[k]).length;
    }
    if (s < bs) { bs = s; best = i; }
  }
  return best;
}
// Усі ходи фігурою role, що дають шах
function checksBy(p, role) {
  const res = [];
  for (const [from, ds] of p.allDests()) {
    if (p.board.get(from).role !== role) continue;
    for (const to of ds) {
      if (role === 'pawn' && (to >> 3 === 7 || to >> 3 === 0)) continue;
      const q = p.clone(); q.play({ from, to }); if (q.isCheck()) res.push([makeSquare(from), makeSquare(to)]);
    }
  }
  return res;
}
function cap(text) { clearTimeout(flash); flash = 0; $('task').classList.remove('say'); $('task').textContent = text; }
const wait = (ms, t) => new Promise((ok, stop) => setTimeout(() => (t === token ? ok() : stop('stop')), ms));
function startExample() {
  mode = 'example'; main.dataset.mode = 'example';
  setButtons([['📋', 'Розділи'], ['🔁', 'Ще раз'], ['👀', ''], ['▶️', 'Почати']]);
  runExample();
}
async function runExample() {
  const t = ++token;
  try { await exampleSteps(t); } catch (e) { if (e !== 'stop') throw e; }
}
async function exampleSteps(t) {
  const [, fen, moves] = DATA[sec][exampleIndex(sec)], ln = moves.split(' ');
  let p = Chess.fromSetup(FEN.parseFen(fen).unwrap()).unwrap();
  userColor = ln.length % 2 === 1 ? p.turn : p.turn === 'white' ? 'black' : 'white';
  const key = exKey(sec), c = CAP[key] || [], role = CHK_ROLE[sec];
  const goal = txt => { $('goal').innerHTML = `📖 ${txt}`; $('lives').textContent = ''; $('count').textContent = ''; };
  wrap.classList.remove('solved'); board.setMovable(null); board.clearHint();
  board.setOrientation(userColor); show(p, undefined, false);
  goal(`Приклад · ${INFO[sec].title}`);
  cap(key === 'chk' ? EXPLAIN.chk(RU[role]) : EXPLAIN[key]);
  await wait(3200, t);
  const play = uci => { const { q, lm } = playUci(p, uci); p = q; show(p, lm); };
  let n = 0; // скільки ходів уже зробили ми
  for (let i = 0; i < ln.length; i++) {
    const m = parseUci(ln[i]), from = makeSquare(m.from), to = makeSquare(m.to), last = i === ln.length - 1;
    if (p.turn !== userColor) { cap(!n ? 'Суперник походив…' : p.isCheck() ? 'Король мусить тікати від шаху…' : c[2] || 'Суперник відповідає…'); play(ln[i]); await wait(1700, t); continue; }
    if (role) { // «Постав шах»: показуємо всі шахи цією фігурою, потім робимо один
      const all = checksBy(p, role);
      board.shapes(all.map(([a, b]) => ({ orig: a, dest: b, brush: 'green' })));
      cap(all.length > 1 ? `Шах ${RU[role]} можна поставити ${all.length === 2 ? 'двома' : all.length === 3 ? 'трьома' : all.length} способами — ось вони 👇` : `Ось хід ${RU[role]}, що нападає на короля 👇`);
      await wait(3000, t);
      board.clearHint(); play(ln[i]);
      cap(all.length > 1 ? 'Обираємо будь-який — і шах! Король під ударом 🎉' : 'Шах! Король під ударом 🎉');
    } else if (sec.startsWith('esc_')) { // «Урятуйся»: хто шахує → як урятуватися
      const k = [...p.board.pieces(userColor, 'king')][0], chk = [...p.ctx().checkers];
      board.shapes(chk.map(s => ({ orig: makeSquare(s), dest: makeSquare(k), brush: 'yellow' })));
      cap(`Шах! ${({ rook: 'Тура', bishop: 'Слон', queen: 'Ферзь', knight: 'Кінь', pawn: 'Пішак' })[p.board.get(chk[0]).role]} нападає на короля (жовта стрілка).`);
      await wait(2600, t);
      const pc = p.board.get(m.from), kind = pc.role === 'king' && !chk.includes(m.to) ? 'run' : chk.includes(m.to) ? 'capture' : 'block';
      board.shapes([...chk.map(s => ({ orig: makeSquare(s), dest: makeSquare(k), brush: 'yellow' })), { orig: from, dest: to, brush: kind === 'run' ? 'green' : kind === 'capture' ? 'red' : 'blue' }]);
      cap({ run: 'Утікаємо: лише тут короля ніхто не б’є 👇', capture: 'Б’ємо фігуру, що шахує 👇', block: 'Закриваємося: ставимо фігуру на лінію удару — її захищають 👇' }[kind]);
      await wait(2800, t);
      board.clearHint(); play(ln[i]);
      cap(kind === 'capture' ? 'Король урятований — і ще виграли фігуру! 🎉' : 'Король урятований! 🎉');
    } else {
      board.shapes([{ orig: from, dest: to, brush: 'green' }]);
      cap(n === 0 ? c[0] || 'Ось хід 👇' : last ? (key === 'mate2' ? 'А тепер — мат 👇' : key === 'promotion' ? 'Пішак — у ферзі 👇' : key === 'fork' ? 'А другу фігуру — забираємо 👇' : 'Забираємо 👇') : 'Далі — ось так 👇');
      await wait(2600, t);
      board.clearHint(); play(ln[i]);
      const after = last ? (p.isCheckmate() ? 'Мат! Королю нікуди подітися 🎉' : c[3] || c[1] || 'Готово! 🎉')
        : n === 0 ? (key === 'fork' && p.isCheck() ? 'Вилка з шахом! Під ударом король і ще одна фігура.' : c[1] || '') : '';
      if (after) cap(after);
    }
    n++;
    await wait(last ? 600 : 2000, t);
  }
  wrap.classList.add('solved'); LG.play('win');
  goal('Тепер ти! Натисни «Почати ▶️»');
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
  board.cg.set({ movable: { showDests: true } });
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
  }, Math.max(0, 850 + Math.random() * 400 - (Date.now() - started))));
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
$('ex').addEventListener('click', () => { if (mode === 'puzzle') startExample(); });
function userMove(from, to) { if (mode === 'puzzle') puzzleMove(from, to); else if (mode === 'practice') practiceMove(from, to); }
$('hint').addEventListener('click', async () => {
  if (mode === 'example') return runExample();
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
$('prev').addEventListener('click', () => { if (mode === 'puzzle') prevPuzzle(); });
$('next').addEventListener('click', () => { if (mode === 'example') startPuzzles(); else if (mode === 'puzzle') nextPuzzle(); else if (mode === 'practice') startPractice(); });

LG.addSettings(() => LG.pieceSetPicker(() => { applyBoardLook(); board.redraw(); if (mode === 'menu') renderMenu(); }));
document.addEventListener('touchmove', e => { if (!e.target.closest('.lg-modal, .mt-menu')) e.preventDefault(); }, { passive: false });
route();
