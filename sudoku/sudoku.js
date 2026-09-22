/* Звірячі судоку: генератор з єдиним розв'язком, підказки, скасування ходу. */
(function () {
  'use strict';

  const ANIMALS = ['🐶', '🐱', '🐰', '🦊', '🐻', '🐼', '🐸', '🐵', '🐷'];
  const BOX = { 4: [2, 2], 6: [2, 3], 9: [3, 3] }; // [рядків, стовпчиків] у блоці
  // Скільки клітинок прибрати: [легко, середньо, складно]
  const HOLES = { 4: [6, 8, 10], 6: [14, 18, 22], 9: [36, 44, 52] };
  const LEVEL_NAMES = ['легко', 'середньо', 'складно'];

  const $ = id => document.getElementById(id);
  const main = document.querySelector('.sd');
  const boardEl = $('board');
  const paletteEl = $('palette');

  const opts = {
    digits: LG.store.get('sudoku:digits', false),
    mistakes: LG.store.get('sudoku:mistakes', true),
    same: LG.store.get('sudoku:same', true)
  };

  let state = null;   // { n, level, solution[], given[], cells[], hints, mistakes, seconds, done }
  let selected = -1;
  let armed = 0;      // обране в палітрі звірятко, яке ставиться тапом по клітинці
  let history = [];
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
        if (((j / n) | 0) === r || j % n === c || boxOf(n, j) === b) set.add(j);
      }
      peers.push([...set]);
    }
    return peers;
  }
  const PEERS = { 4: peersOf(4), 6: peersOf(6), 9: peersOf(9) };

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
    n = n || (state && state.n) || 4;
    level = level === undefined ? (state ? state.level : 0) : level;
    const { solution, puzzle } = generate(n, level);
    state = {
      n, level, solution,
      given: puzzle.map(v => v > 0),
      cells: puzzle.slice(),
      hinted: puzzle.map(() => false),
      hints: 0, mistakes: 0, seconds: 0, done: false
    };
    history = [];
    selected = -1;
    armed = 0;
    LG.store.set('sudoku:last', { n, level });
    buildBoard();
    save();
    startTimer();
  }

  function save() { LG.store.set('sudoku:game', state); }

  function restore() {
    const s = LG.store.get('sudoku:game', null);
    if (s && !s.done && BOX[s.n] && Array.isArray(s.cells) && s.cells.length === s.n * s.n) {
      state = s;
      state.hinted = state.hinted || state.cells.map(() => false);
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
    const [br, bc] = BOX[n];
    const boxesPerRow = n / bc;
    for (let i = 0; i < n * n; i++) {
      const b = boxOf(n, i);
      const alt = (((b / boxesPerRow) | 0) + (b % boxesPerRow)) % 2 === 1;
      const cell = document.createElement('button');
      cell.type = 'button';
      cell.className = 'cell' + (alt ? ' alt' : '');
      cell.dataset.i = i;
      cell.setAttribute('role', 'gridcell');
      cell.tabIndex = i === 0 ? 0 : -1;
      cell.innerHTML = '<span class="v"></span>';
      boardEl.appendChild(cell);
    }
    void br;
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
    const selVal = selected >= 0 ? state.cells[selected] : 0;
    const focusVal = selVal || armed;
    const peers = selected >= 0 ? new Set(PEERS[n][selected]) : new Set();
    [...boardEl.children].forEach((cell, i) => {
      const v = state.cells[i];
      cell.querySelector('.v').textContent = sym(v);
      cell.classList.toggle('given', state.given[i]);
      cell.classList.toggle('sel', i === selected);
      cell.classList.toggle('peer', peers.has(i));
      cell.classList.toggle('same', opts.same && !!focusVal && v === focusVal && i !== selected);
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
    const filled = state.cells.filter(Boolean).length;
    $('progress').textContent = (opts.digits ? '🔢 ' : '🐾 ') + filled + '/' + n * n;
    $('hintsUsed').textContent = '💡 ' + state.hints;
    $('undo').disabled = !history.length || state.done;
    $('erase').disabled = state.done || selected < 0 || state.given[selected] || !state.cells[selected];
    $('hint').disabled = state.done;
  }

  // ---------- дії ----------
  function select(i) {
    selected = i;
    if (i >= 0) {
      [...boardEl.children].forEach((c, j) => { c.tabIndex = j === i ? 0 : -1; });
    }
    paint();
  }

  function setCell(i, v, opts2) {
    if (state.done || i < 0 || state.given[i]) return;
    if (state.cells[i] === v) return;
    history.push({ i, prev: state.cells[i], prevHint: state.hinted[i] });
    state.cells[i] = v;
    state.hinted[i] = !!(opts2 && opts2.hint);
    if (v) {
      const wrong = PEERS[state.n][i].some(p => state.cells[p] === v);
      if (wrong) { state.mistakes++; LG.play('error'); }
      else LG.play('place');
    } else {
      LG.play('tap');
    }
    paint(v ? i : -1);
    save();
    checkWin();
  }

  function undo() {
    const h = history.pop();
    if (!h || state.done) return;
    state.cells[h.i] = h.prev;
    state.hinted[h.i] = h.prevHint;
    selected = h.i;
    LG.play('tap');
    paint();
    save();
  }

  function hint() {
    if (state.done) return;
    let i = selected;
    if (i < 0 || state.given[i] || state.cells[i] === state.solution[i]) {
      // клітинка з найменшою кількістю варіантів — найзрозуміліша підказка
      let best = -1, bestLen = 99;
      state.cells.forEach((v, j) => {
        if (state.given[j] || v === state.solution[j]) return;
        const len = v ? 0 : candidates(state.n, state.cells, j).length;
        if (len < bestLen) { best = j; bestLen = len; }
      });
      i = best;
    }
    if (i < 0) return;
    state.hints++;
    selected = i;
    setCell(i, state.solution[i], { hint: true });
  }

  function checkWin() {
    if (state.cells.some((v, i) => v !== state.solution[i])) return;
    state.done = true;
    clearInterval(timerId);
    save();
    selected = -1;
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
      { onAgain: () => newGame(), delay: 900 }
    );
  }

  // ---------- події ----------
  boardEl.addEventListener('click', e => {
    const cell = e.target.closest('.cell');
    if (!cell || state.done) return;
    const i = +cell.dataset.i;
    if (armed && !state.given[i]) {
      selected = i;
      setCell(i, state.cells[i] === armed ? 0 : armed);
      return;
    }
    select(i === selected ? -1 : i);
    LG.play('tap');
  });

  paletteEl.addEventListener('click', e => {
    const b = e.target.closest('.pal');
    if (!b || state.done) return;
    const v = +b.dataset.v;
    if (selected >= 0 && !state.given[selected]) {
      armed = 0;
      setCell(selected, v);
    } else {
      // клітинку не обрано: «беремо» звірятко в руку
      armed = armed === v ? 0 : v;
      LG.play('tap');
      paint();
      if (armed) LG.toast('Тепер натискай на порожні клітинки ' + sym(v));
    }
  });

  $('undo').addEventListener('click', undo);
  $('erase').addEventListener('click', () => setCell(selected, 0));
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

  function bindOpt(id, key) {
    const input = $(id);
    input.checked = opts[key];
    input.addEventListener('change', () => {
      opts[key] = input.checked;
      LG.store.set('sudoku:' + key, input.checked);
      main.classList.toggle('digits', opts.digits);
      paint();
    });
  }
  bindOpt('optDigits', 'digits');
  bindOpt('optMistakes', 'mistakes');
  bindOpt('optSame', 'same');

  document.addEventListener('keydown', e => {
    if (!state || state.done || e.target.closest('input, select, .lg-modal')) return;
    const n = state.n;
    if (e.key >= '1' && e.key <= String(n)) { if (selected >= 0) setCell(selected, +e.key); return; }
    if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') { setCell(selected, 0); return; }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { undo(); e.preventDefault(); return; }
    const moves = { ArrowUp: -n, ArrowDown: n, ArrowLeft: -1, ArrowRight: 1 };
    if (moves[e.key] !== undefined) {
      e.preventDefault();
      let i = selected < 0 ? 0 : selected + moves[e.key];
      if (e.key === 'ArrowLeft' && selected % n === 0) i = selected;
      if (e.key === 'ArrowRight' && selected % n === n - 1) i = selected;
      if (i < 0 || i >= n * n) i = selected;
      select(i);
      boardEl.children[i].focus();
    }
  });

  if (!restore()) {
    const last = LG.store.get('sudoku:last', { n: 4, level: 0 });
    newGame(BOX[last.n] ? last.n : 4, [0, 1, 2].includes(last.level) ? last.level : 0);
  }
})();
