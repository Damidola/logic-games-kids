/* Звірячі судоку для малят: тапни звірятко внизу, потім клітинку — або затисни звірятко й відпусти над клітинкою.
   Правильне звірятко одразу стає на місце назавжди; неправильне не ставиться (звук «ой»). */
(function () {
  'use strict';

  const ANIMALS = ['🐶', '🐱', '🐰', '🦊', '🐻', '🐼', '🐸', '🐵', '🐷'];
  // [рядків, стовпчиків] у блоці; 3×3 і 5×5 — без блоків (лише рядки й стовпчики)
  const BOX = { 3: null, 4: [2, 2], 5: null, 6: [2, 3], 9: [3, 3] };
  // Скільки клітинок прибрати на рівнях 1–5
  const HOLES = { 3: [2, 3, 4, 5, 5], 4: [4, 6, 8, 9, 10], 5: [6, 9, 12, 14, 16], 6: [10, 14, 18, 21, 24], 9: [30, 38, 46, 51, 56] };
  const LEVEL_NAMES = ['дуже легко', 'легко', 'середньо', 'складно', 'дуже складно'];
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

  let state = null;   // { n, level, solution[], given[], mine[], cells[], hinted[], hints, mistakes, seconds, done }
  let armed = 0;      // звірятко «в руці»
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
      mine: puzzle.map(() => false),
      hinted: puzzle.map(() => false),
      hints: 0, mistakes: 0, seconds: 0, done: false
    };
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
      state.mine = state.mine || state.cells.map(() => false);
      // стара гра могла мати неправильних звірят — прибираємо їх
      state.cells = state.cells.map((v, i) => (state.given[i] || v === state.solution[i] ? v : 0));
      state.cells.forEach((v, i) => { if (v && !state.given[i]) { state.given[i] = true; state.mine[i] = true; } });
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
      cell.classList.toggle('given', state.given[i] && !state.mine[i]);
      cell.classList.toggle('mine', !!state.mine[i]);
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
    main.classList.toggle('empty-hand', !armed);
    const filled = state.cells.filter(Boolean).length;
    $('progress').textContent = (opts.digits ? '🔢 ' : '🐾 ') + filled + '/' + n * n;
    const hintsLeft = Math.max(0, limit('hints') - state.hints);
    $('hintsUsed').textContent = '💡 ' + hintsLeft;
    $('hint').classList.toggle('is-off', state.done || !hintsLeft);
  }

  // ---------- дії ----------
  function shake(i) {
    const c = boardEl.children[i]; if (!c) return;
    c.classList.remove('nope'); void c.offsetWidth; c.classList.add('nope');
  }

  // Поставити звірятко v у клітинку i. Правильне — одразу стає на місце назавжди (як підказане на початку).
  // Неправильне — «ой», і нічого не ставиться.
  function place(i, v, fromHint) {
    if (state.done || i < 0 || state.given[i] || !v) return false;
    if (v !== state.solution[i]) {
      state.mistakes++; LG.play('error'); shake(i);
      save();
      return false;
    }
    state.cells[i] = v;
    state.given[i] = true;
    state.mine[i] = true;
    state.hinted[i] = !!fromHint;
    LG.play('place');
    paint(i);
    save();
    checkWin();
    return true;
  }

  function hint() {
    if (state.done) return;
    if (state.hints >= limit('hints')) return LG.play('error');
    // клітинка з найменшою кількістю варіантів — найзрозуміліша підказка
    let best = -1, bestLen = 99;
    state.cells.forEach((v, j) => {
      if (state.given[j]) return;
      const len = candidates(state.n, state.cells, j).length;
      if (len < bestLen) { best = j; bestLen = len; }
    });
    if (best < 0) return;
    state.hints++;
    place(best, state.solution[best], true);
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

  // ---------- дотики ----------
  // 1) тап по звірятку внизу, потім тап по клітинці; 2) або затиснути звірятко і відпустити над клітинкою.
  const cellAt = (x, y) => { const el = document.elementFromPoint(x, y); return el && el.closest('.cell'); };
  let drag = null; // { v, x, y, ghost, moved }
  paletteEl.addEventListener('pointerdown', e => {
    const b = e.target.closest('.pal');
    if (!b || state.done || b.classList.contains('done')) return;
    e.preventDefault();
    try { b.releasePointerCapture(e.pointerId); } catch (err) { /* немає захоплення */ }
    drag = { v: +b.dataset.v, x: e.clientX, y: e.clientY, ghost: null, moved: false };
  });
  document.addEventListener('pointermove', e => {
    if (!drag) return;
    if (!drag.moved && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > 10) {
      drag.moved = true;
      armed = drag.v; paint();
      drag.ghost = document.createElement('div');
      drag.ghost.className = 'sd-ghost';
      drag.ghost.textContent = sym(drag.v);
      document.body.appendChild(drag.ghost);
    }
    if (drag.moved) {
      drag.ghost.style.left = e.clientX + 'px'; drag.ghost.style.top = e.clientY + 'px';
      boardEl.querySelectorAll('.over').forEach(c => c.classList.remove('over'));
      const c = cellAt(e.clientX, e.clientY); if (c && !state.given[+c.dataset.i]) c.classList.add('over');
    }
  });
  const endDrag = e => {
    if (!drag) return;
    const d = drag; drag = null;
    boardEl.querySelectorAll('.over').forEach(c => c.classList.remove('over'));
    if (!d.moved) { // простий тап по звірятку — взяти його (або покласти назад)
      armed = armed === d.v ? 0 : d.v; LG.play('tap'); return paint();
    }
    d.ghost.remove();
    if (e.type !== 'pointerup') return;
    const c = cellAt(e.clientX, e.clientY);
    if (c) place(+c.dataset.i, d.v);
  };
  document.addEventListener('pointerup', endDrag);
  document.addEventListener('pointercancel', endDrag);

  boardEl.addEventListener('click', e => {
    const c = e.target.closest('.cell');
    if (!c || state.done) return;
    const i = +c.dataset.i;
    if (state.given[i]) return;
    if (armed) return place(i, armed);
    // звірятко ще не взяте — палітра «кличе»
    paletteEl.classList.remove('nudge'); void paletteEl.offsetWidth; paletteEl.classList.add('nudge'); LG.play('tap');
  });

  $('hint').addEventListener('click', hint);
  $('new').addEventListener('click', () => confirmTap($('new'), () => newGame()));

  // Змінити поле чи складність посеред гри — двома тапами, щоб випадково не стерти гру
  let pending = null;
  function confirmTap(btn, action) {
    const started = state && !state.done && state.mine.some(Boolean);
    if (!started || pending === btn) { pending = null; document.querySelectorAll('.confirm').forEach(b => b.classList.remove('confirm')); return action(); }
    document.querySelectorAll('.confirm').forEach(b => b.classList.remove('confirm'));
    pending = btn; btn.classList.add('confirm'); LG.play('tap');
    LG.toast('Натисни ще раз — почнемо нову гру');
    setTimeout(() => { if (pending === btn) { pending = null; btn.classList.remove('confirm'); } }, 2500);
  }
  $('size').addEventListener('click', e => {
    const b = e.target.closest('[data-size]');
    if (b && +b.dataset.size !== state.n) confirmTap(b, () => newGame(+b.dataset.size, state.level));
  });
  $('level').addEventListener('click', e => {
    const b = e.target.closest('[data-level]');
    if (b && +b.dataset.level !== state.level) confirmTap(b, () => newGame(state.n, +b.dataset.level));
  });

  // Налаштування: свої для судоку + спільні ліміти підказок і ходів назад
  LG.addSettings(() => {
    const w = document.createElement('div');
    const OPTS = ['0', '1', '2', '3', '5', '10'];
    const sel = (id, v) => `<select id="${id}">${OPTS.map(o => `<option ${o === String(v) ? 'selected' : ''}>${o}</option>`).join('')}</select>`;
    const sw = (key, text) => `<label class="lg-set-row"><span>${text}</span><input type="checkbox" data-opt="${key}" ${opts[key] ? 'checked' : ''}></label>`;
    w.innerHTML = sw('digits', 'Цифри замість звірят') + sw('mistakes', 'Підсвічувати помилки') + sw('same', 'Показувати однакових звірят') +
      `<div class="lg-set-row"><span>Підказок за гру</span>${sel('hints-n', limit('hints'))}</div>`;
    w.querySelectorAll('[data-opt]').forEach(input => input.addEventListener('change', () => {
      const key = input.dataset.opt;
      opts[key] = input.checked;
      LG.store.set('sudoku:' + key, input.checked);
      main.classList.toggle('digits', opts.digits);
      paint();
    }));
    w.querySelector('#hints-n').addEventListener('change', e => { LG.store.set('hints', e.target.value); paint(); });
    return w;
  });

  // Сторінка не гортається (крім вікон)
  document.addEventListener('touchmove', e => { if (!e.target.closest('.lg-modal')) e.preventDefault(); }, { passive: false });

  if (!restore()) {
    const last = LG.store.get('sudoku:last', { n: 3, level: 0 });
    newGame(last.n in BOX ? last.n : 3, last.level >= 0 && last.level < 5 ? last.level : 0);
  }
})();
