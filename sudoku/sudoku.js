/* Звірячі судоку: генератор з єдиним розв'язком, підказки, скасування ходу.
   Спершу береш звірятко внизу (тап) і ставиш тапом у клітинки — або тягнеш звірятко пальцем у клітинку.
   Туди, де воно вже є в рядку, стовпчику чи блоці, звірятко не ставиться (звук «ой»). */
(function () {
  'use strict';

  const ANIMALS = ['🐶', '🐱', '🐰', '🦊', '🐻', '🐼', '🐸', '🐵', '🐷'];
  // [рядків, стовпчиків] у блоці; 3×3 і 5×5 — без блоків (лише рядки й стовпчики)
  const BOX = { 3: null, 4: [2, 2], 5: null, 6: [2, 3], 9: [3, 3] };
  // Скільки клітинок прибрати на рівнях 1–5
  const HOLES = { 3: [2, 3, 4, 5, 5], 4: [4, 6, 8, 9, 10], 5: [6, 9, 12, 14, 16], 6: [10, 14, 18, 21, 24], 9: [30, 38, 46, 51, 56] };
  const LEVEL_NAMES = ['дуже легко', 'легко', 'середньо', 'складно', 'дуже складно'];
  const ERASE = -1;
  // Спільні для всіх ігор ліміти підказок і ходів назад (за замовчуванням по 3)
  const limit = key => Number(LG.store.get(key, '3'));

  const $ = id => document.getElementById(id);
  const main = document.querySelector('.sd');
  const boardEl = $('board');
  const paletteEl = $('palette');

  const opts = {
    digits: LG.store.get('sudoku:digits', false),
    mistakes: LG.store.get('sudoku:mistakes', true),
    same: LG.store.get('sudoku:same', true)
  };

  let state = null;   // { n, level, solution[], given[], cells[], hinted[], hints, undos, mistakes, seconds, done }
  let armed = 0;      // звірятко «в руці» (або ERASE — гумка)
  let history = [];
  let future = [];    // скасовані ходи для «Вперед»
  let timerId = null;

  // ---------- генератор ----------
  function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function boxOf(n, i) {
    if (!BOX[n]) return -1;
    const [br, bc] = BOX[n];
    const r = (i / n) | 0, c = i % n;
    return ((r / br) | 0) * (n / bc) + ((c / bc) | 0);
  }

  function peersOf(n) {
    const peers = [];
    for (let i = 0; i < n * n; i++) {
      const set = new Set();
      const r = (i / n) | 0, c = i % n, b = boxOf(n, i);
      for (let j = 0; j < n * n; j++) {
        if (j === i) continue;
        if (((j / n) | 0) === r || j % n === c || (b >= 0 && boxOf(n, j) === b)) set.add(j);
      }
      peers.push([...set]);
    }
    return peers;
  }
  const PEERS = {};
  for (const n of Object.keys(BOX)) PEERS[n] = peersOf(+n);

  function candidates(n, grid, i) {
    const used = new Set();
    for (const p of PEERS[n][i]) if (grid[p]) used.add(grid[p]);
    const out = [];
    for (let v = 1; v <= n; v++) if (!used.has(v)) out.push(v);
    return out;
  }

  // Заповнює grid на місці; повертає кількість розв'язків (не більше limit)
  function solve(n, grid, limit, randomize) {
    let best = -1, bestC = null;
    for (let i = 0; i < grid.length; i++) {
      if (grid[i]) continue;
      const c = candidates(n, grid, i);
      if (!c.length) return 0;
      if (!bestC || c.length < bestC.length) { best = i; bestC = c; if (c.length === 1) break; }
    }
    if (best < 0) return 1;
    let count = 0;
    for (const v of randomize ? shuffle(bestC) : bestC) {
      grid[best] = v;
      count += solve(n, grid, limit - count, randomize);
      if (count >= limit) { if (randomize) return count; break; }
    }
    if (!randomize || count === 0) grid[best] = 0;
    return count;
  }

  function generate(n, level) {
    const solution = new Array(n * n).fill(0);
    solve(n, solution, 1, true);
    const puzzle = solution.slice();
    let holes = HOLES[n][level];
    for (const i of shuffle([...Array(n * n).keys()])) {
      if (!holes) break;
      const keep = puzzle[i];
      puzzle[i] = 0;
      if (solve(n, puzzle.slice(), 2, false) !== 1) puzzle[i] = keep;
      else holes--;
    }
    return { solution, puzzle };
  }

  // ---------- стан ----------
  function newGame(n, level) {
    n = n || (state && state.n) || 3;
    level = level === undefined ? (state ? state.level : 0) : level;
    const { solution, puzzle } = generate(n, level);
    state = {
      n, level, solution,
      given: puzzle.map(v => v > 0),
      cells: puzzle.slice(),
      hinted: puzzle.map(() => false),
      hints: 0, undos: 0, mistakes: 0, seconds: 0, done: false
    };
    history = []; future = [];
    armed = 0;
    LG.store.set('sudoku:last', { n, level });
    buildBoard();
    save();
    startTimer();
  }

  function save() { LG.store.set('sudoku:game', state); }

  function restore() {
    const s = LG.store.get('sudoku:game', null);
    if (s && !s.done && s.n in BOX && Array.isArray(s.cells) && s.cells.length === s.n * s.n) {
      state = s;
      state.hinted = state.hinted || state.cells.map(() => false);
      state.undos = state.undos || 0;
      buildBoard();
      startTimer();
      return true;
    }
    return false;
  }

  // ---------- таймер ----------
  function startTimer() {
    clearInterval(timerId);
    paintTimer();
    timerId = setInterval(() => {
      if (!state || state.done || document.hidden) return;
      state.seconds++;
      paintTimer();
      if (state.seconds % 5 === 0) save();
    }, 1000);
  }
  function paintTimer() {
    const s = state.seconds;
    $('timer').textContent = '⏱ ' + ((s / 60) | 0) + ':' + String(s % 60).padStart(2, '0');
  }

  // ---------- малювання ----------
  const sym = v => (v ? (opts.digits ? String(v) : ANIMALS[v - 1]) : '');

  function buildBoard() {
    const n = state.n;
    main.style.setProperty('--n', n);
    main.classList.toggle('n9', n === 9);
    main.classList.toggle('digits', opts.digits);
    paletteEl.style.setProperty('--pcols', n);
    boardEl.innerHTML = '';
    const boxesPerRow = BOX[n] ? n / BOX[n][1] : 1;
    for (let i = 0; i < n * n; i++) {
      const b = boxOf(n, i);
      const alt = b >= 0 && (((b / boxesPerRow) | 0) + (b % boxesPerRow)) % 2 === 1;
      const cell = document.createElement('button');
      cell.type = 'button';
      cell.className = 'cell' + (alt ? ' alt' : '');
      cell.dataset.i = i;
      cell.setAttribute('role', 'gridcell');
      cell.innerHTML = '<span class="v"></span>';
      boardEl.appendChild(cell);
    }
    paletteEl.innerHTML = '';
    for (let v = 1; v <= n; v++) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'pal';
      b.dataset.v = v;
      b.innerHTML = '<span class="s"></span><span class="left"></span>';
      paletteEl.appendChild(b);
    }
    document.querySelectorAll('#size [data-size]').forEach(b => b.setAttribute('aria-checked', String(+b.dataset.size === n)));
    document.querySelectorAll('#level [data-level]').forEach(b => b.setAttribute('aria-checked', String(+b.dataset.level === state.level)));
    paint();
  }

  function conflicts() {
    const n = state.n, bad = new Set();
    state.cells.forEach((v, i) => {
      if (!v) return;
      for (const p of PEERS[n][i]) if (state.cells[p] === v) { bad.add(i); bad.add(p); }
    });
    return bad;
  }

  function paint(popIndex) {
    const n = state.n;
    const bad = opts.mistakes ? conflicts() : new Set();
    [...boardEl.children].forEach((cell, i) => {
      const v = state.cells[i];
      cell.querySelector('.v').textContent = sym(v);
      cell.classList.toggle('given', state.given[i]);
      cell.classList.toggle('same', opts.same && armed > 0 && v === armed);
      cell.classList.toggle('free', armed > 0 && !v);
      cell.classList.toggle('bad', bad.has(i) && !state.given[i]);
      cell.classList.toggle('hinted', !!state.hinted[i]);
      cell.classList.toggle('pop', i === popIndex);
      const r = ((i / n) | 0) + 1, c = (i % n) + 1;
      cell.setAttribute('aria-label', `Рядок ${r}, стовпчик ${c}: ${v ? (opts.digits ? v : 'звірятко ' + v) : 'порожньо'}`);
    });
    const counts = new Array(n + 1).fill(0);
    state.cells.forEach(v => counts[v]++);
    [...paletteEl.children].forEach(b => {
      const v = +b.dataset.v;
      b.querySelector('.s').textContent = sym(v);
      const left = n - counts[v];
      b.querySelector('.left').textContent = left > 0 ? left : '✓';
      b.classList.toggle('done', left <= 0);
      b.classList.toggle('armed', armed === v);
      b.setAttribute('aria-label', (opts.digits ? 'Цифра ' : 'Звірятко ') + v + ', лишилось ' + Math.max(0, left));
    });
    main.classList.toggle('erasing', armed === ERASE);
    main.classList.toggle('empty-hand', !armed);
    const filled = state.cells.filter(Boolean).length;
    $('progress').textContent = (opts.digits ? '🔢 ' : '🐾 ') + filled + '/' + n * n;
    const hintsLeft = Math.max(0, limit('hints') - state.hints), undosLeft = Math.max(0, limit('undos') - state.undos);
    $('hintsUsed').textContent = '💡 ' + hintsLeft;
    $('undo').classList.toggle('is-off', !history.length || state.done || !undosLeft);
    $('redo').classList.toggle('is-off', !future.length || state.done);
    $('erase').classList.toggle('on', armed === ERASE);
    $('erase').classList.toggle('is-off', state.done);
    $('hint').classList.toggle('is-off', state.done || !hintsLeft);
  }

  // ---------- дії ----------
  function shake(i) {
    const c = boardEl.children[i]; if (!c) return;
    c.classList.remove('nope'); void c.offsetWidth; c.classList.add('nope');
  }

  // Поставити звірятко v у клітинку i (0 — прибрати). Не за правилами — «ой» і нічого не ставимо.
  function setCell(i, v, opts2) {
    if (state.done || i < 0 || state.given[i]) return false;
    if (state.cells[i] === v) return false;
    if (v && !(opts2 && opts2.hint) && PEERS[state.n][i].some(p => state.cells[p] === v)) {
      state.mistakes++; LG.play('error'); shake(i);
      PEERS[state.n][i].forEach(p => { if (state.cells[p] === v) shake(p); });
      save();
      return false;
    }
    history.push({ i, prev: state.cells[i], prevHint: state.hinted[i], v, hint: !!(opts2 && opts2.hint) });
    if (!(opts2 && opts2.redo)) future = [];
    state.cells[i] = v;
    state.hinted[i] = !!(opts2 && opts2.hint);
    LG.play(v ? 'place' : 'tap');
    paint(v ? i : -1);
    save();
    checkWin();
    return true;
  }

  function undo() {
    if (!history.length || state.done || state.undos >= limit('undos')) return LG.play('error');
    const h = history.pop();
    future.push(h);
    state.undos++;
    state.cells[h.i] = h.prev;
    state.hinted[h.i] = h.prevHint;
    LG.play('tap');
    paint();
    save();
  }

  function redo() {
    const h = future.pop();
    if (!h || state.done) return;
    setCell(h.i, h.v, { hint: h.hint, redo: true });
  }

  function hint() {
    if (state.done) return;
    if (state.hints >= limit('hints')) return LG.play('error');
    // клітинка з найменшою кількістю варіантів — найзрозуміліша підказка
    let best = -1, bestLen = 99;
    state.cells.forEach((v, j) => {
      if (state.given[j] || v === state.solution[j]) return;
      const len = v ? 0 : candidates(state.n, state.cells, j).length;
      if (len < bestLen) { best = j; bestLen = len; }
    });
    if (best < 0) return;
    state.hints++;
    setCell(best, state.solution[best], { hint: true });
  }

  function checkWin() {
    if (state.cells.some((v, i) => v !== state.solution[i])) return;
    state.done = true;
    clearInterval(timerId);
    save();
    armed = 0;
    paint();
    [...boardEl.children].forEach((c, i) => {
      c.style.animationDelay = (((i / state.n) | 0) + (i % state.n)) * 40 + 'ms';
      c.classList.add('wave');
    });
    const penalty = state.hints + state.mistakes;
    const stars = penalty === 0 ? 3 : penalty <= 2 ? 2 : 1;
    const key = 'sudoku:best:' + state.n + ':' + state.level;
    const prevBest = LG.store.get(key, 0);
    if (stars > prevBest) LG.store.set(key, stars);
    const t = state.seconds;
    const time = ((t / 60) | 0) + ' хв ' + (t % 60) + ' с';
    LG.win(
      '⭐'.repeat(stars) + '☆'.repeat(3 - stars) + '\n' +
      `Поле ${state.n}×${state.n}, ${LEVEL_NAMES[state.level]}. Час: ${time}.` +
      (state.hints ? ` Підказок: ${state.hints}.` : ' Без жодної підказки!'),
      { onAgain: () => newGame(), delay: 900, reward: true }
    );
  }

  // ---------- дотики: тап по звірятку → тап по клітинках; або перетягнути звірятко в клітинку ----------
  const cellAt = (x, y) => { const el = document.elementFromPoint(x, y); return el && el.closest('.cell'); };
  let drag = null; // { v, from (індекс клітинки або -1), x, y, ghost, moved }
  function startDrag(e, v, from) {
    drag = { v, from, x: e.clientX, y: e.clientY, ghost: null, moved: false, target: e.target };
  }
  document.addEventListener('pointermove', e => {
    if (!drag || !drag.v) return;
    if (!drag.moved && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > 8) {
      drag.moved = true;
      drag.ghost = document.createElement('div');
      drag.ghost.className = 'sd-ghost';
      drag.ghost.textContent = sym(drag.v);
      document.body.appendChild(drag.ghost);
      if (drag.from >= 0) boardEl.children[drag.from].classList.add('lifting');
    }
    if (drag.moved) {
      drag.ghost.style.left = e.clientX + 'px'; drag.ghost.style.top = e.clientY + 'px';
      [...boardEl.querySelectorAll('.over')].forEach(c => c.classList.remove('over'));
      const c = cellAt(e.clientX, e.clientY); if (c) c.classList.add('over');
    }
  }, { passive: true });
  const endDrag = e => {
    if (!drag) return;
    const d = drag; drag = null;
    [...boardEl.querySelectorAll('.over, .lifting')].forEach(c => c.classList.remove('over', 'lifting'));
    if (!d.moved) return tapped(d, e);
    d.ghost.remove();
    if (e.type !== 'pointerup' || state.done) return;
    const c = cellAt(e.clientX, e.clientY);
    if (d.from >= 0) { // перетягнули звірятко з поля: в іншу клітинку — перенести, за поле — прибрати
      if (!c) return setCell(d.from, 0);
      const to = +c.dataset.i;
      if (to === d.from || state.given[to]) return;
      setCell(d.from, 0);
      if (!setCell(to, d.v)) { history.pop(); state.cells[d.from] = d.v; paint(); save(); }
      return;
    }
    if (c) setCell(+c.dataset.i, d.v);
  };
  document.addEventListener('pointerup', endDrag);
  document.addEventListener('pointercancel', endDrag);

  function tapped(d, e) {
    if (state.done || e.type !== 'pointerup') return;
    const pal = d.target.closest('.pal'), cell = d.target.closest('.cell');
    if (pal) { armed = armed === d.v ? 0 : d.v; LG.play('tap'); return paint(); }
    if (!cell) return;
    const i = +cell.dataset.i;
    if (state.given[i]) return LG.play('tap');
    if (armed === ERASE) return setCell(i, 0);
    if (armed) return setCell(i, state.cells[i] === armed ? 0 : armed);
    // Звірятко ще не взяте: підкажемо, що спершу — звірятко внизу
    if (!state.cells[i]) { paletteEl.classList.remove('nudge'); void paletteEl.offsetWidth; paletteEl.classList.add('nudge'); LG.play('tap'); }
  }

  paletteEl.addEventListener('pointerdown', e => {
    const b = e.target.closest('.pal');
    if (b && !state.done) startDrag(e, +b.dataset.v, -1);
  });
  boardEl.addEventListener('pointerdown', e => {
    const c = e.target.closest('.cell');
    if (!c || state.done) return;
    const i = +c.dataset.i;
    const own = state.cells[i] && !state.given[i];
    startDrag(e, own ? state.cells[i] : 0, own ? i : -2); // підказані з самого початку звірята не рухаються
  });

  $('undo').addEventListener('click', undo);
  $('redo').addEventListener('click', redo);
  $('erase').addEventListener('click', () => { armed = armed === ERASE ? 0 : ERASE; LG.play('tap'); paint(); });
  $('hint').addEventListener('click', hint);
  $('new').addEventListener('click', () => newGame());

  $('size').addEventListener('click', e => {
    const b = e.target.closest('[data-size]');
    if (b) newGame(+b.dataset.size, state.level);
  });
  $('level').addEventListener('click', e => {
    const b = e.target.closest('[data-level]');
    if (b) newGame(state.n, +b.dataset.level);
  });

  // Налаштування: свої для судоку + спільні ліміти підказок і ходів назад
  LG.addSettings(() => {
    const w = document.createElement('div');
    const OPTS = ['0', '1', '2', '3', '5', '10'];
    const sel = (id, v) => `<select id="${id}">${OPTS.map(o => `<option ${o === String(v) ? 'selected' : ''}>${o}</option>`).join('')}</select>`;
    const sw = (key, text) => `<label class="lg-set-row"><span>${text}</span><input type="checkbox" data-opt="${key}" ${opts[key] ? 'checked' : ''}></label>`;
    w.innerHTML = sw('digits', 'Цифри замість звірят') + sw('mistakes', 'Підсвічувати помилки') + sw('same', 'Показувати однакових звірят') +
      `<div class="lg-set-row"><span>Підказок за гру</span>${sel('hints-n', limit('hints'))}</div>
      <div class="lg-set-row"><span>Ходів назад</span>${sel('undos-n', limit('undos'))}</div>`;
    w.querySelectorAll('[data-opt]').forEach(input => input.addEventListener('change', () => {
      const key = input.dataset.opt;
      opts[key] = input.checked;
      LG.store.set('sudoku:' + key, input.checked);
      main.classList.toggle('digits', opts.digits);
      paint();
    }));
    w.querySelector('#hints-n').addEventListener('change', e => { LG.store.set('hints', e.target.value); paint(); });
    w.querySelector('#undos-n').addEventListener('change', e => { LG.store.set('undos', e.target.value); paint(); });
    return w;
  });

  // Сторінка не гортається (крім вікон)
  document.addEventListener('touchmove', e => { if (!e.target.closest('.lg-modal')) e.preventDefault(); }, { passive: false });

  if (!restore()) {
    const last = LG.store.get('sudoku:last', { n: 3, level: 0 });
    newGame(last.n in BOX ? last.n : 3, last.level >= 0 && last.level < 5 ? last.level : 0);
  }
})();
