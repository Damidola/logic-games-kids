/* «Як ходять фігури»: інтерфейс уроків. Правила ходів — engine.js, рівні — levels.js. */
(function () {
  'use strict';
  const E = window.LearnEngine, CH = window.LEARN_CHAPTERS;
  // Набір фігур обирається в налаштуваннях (спільний для всіх шахових ігор)
  const PIECES = '../shared/pieces/' + (LG.store.get('pieceSet', 'cburnett')) + '/';
  const COLORS = { rook: '#FF7A59', bishop: '#4DA3FF', queen: '#A66CFF', king: '#FFB300', knight: '#2ECC9A', pawn: '#FF6B9A', capture: '#E5534B' };
  const STAR_SVG = '<svg class="star" viewBox="0 0 24 24"><path fill="#FFC928" stroke="#C98A00" stroke-width="1.2" stroke-linejoin="round" d="M12 2.5l2.9 6 6.6.8-4.9 4.5 1.3 6.5L12 17l-5.9 3.3 1.3-6.5L2.5 9.3l6.6-.8z"/></svg>';

  const $ = id => document.getElementById(id);
  const chaptersEl = $('chapters'), lessonEl = $('lesson'), boardEl = $('board');
  const doneEl = $('done'), doneStars = $('done-stars'), dotsEl = $('lesson-dots');

  // ---------- прогрес: скільки зірок отримано за кожен рівень ----------
  const progress = LG.store.get('learn:stars', {});
  const got = (ch, i) => (progress[ch.id] || [])[i] || 0;
  function saveStars(ch, i, n) {
    const arr = progress[ch.id] || (progress[ch.id] = []);
    arr[i] = Math.max(arr[i] || 0, n);
    LG.store.set('learn:stars', progress);
  }

  // ---------- розділи ----------
  function showChapters() {
    lessonEl.hidden = true; chaptersEl.hidden = false;
    chaptersEl.innerHTML = '';
    CH.forEach(ch => {
      const b = document.createElement('button');
      const all = ch.levels.every((_, i) => got(ch, i) > 0);
      b.type = 'button'; b.className = 'chapter' + (all ? ' all-done' : '');
      b.style.setProperty('--c', COLORS[ch.id] || '#6C5CE7');
      b.innerHTML = `<img src="${PIECES}${ch.icon || 'w' + ch.piece}.svg" alt=""><b>${ch.name}</b>
        <span class="prog">${ch.levels.map((_, i) => got(ch, i) ? '★' : '☆').join('')}</span>`;
      b.addEventListener('click', () => {
        // Відкриваємо перший ще не пройдений рівень
        const first = ch.levels.findIndex((_, i) => !got(ch, i));
        startLevel(ch, first < 0 ? 0 : first);
      });
      chaptersEl.appendChild(b);
    });
  }

  // ---------- урок ----------
  let S = null; // поточний стан рівня
  const pieceUrl = (color, type) => `${PIECES}${color}${type}.svg`;

  function startLevel(ch, idx) {
    chaptersEl.hidden = true; lessonEl.hidden = false; doneEl.hidden = true;
    clearTimeout(startLevel.timer);
    const lv = ch.levels[idx];
    const { white, black } = E.parseFen(lv.fen);
    S = { ch, idx, lv, white, black, apples: new Set(lv.apples.map(E.sq)), moves: 0, busy: false, sel: null, last: null,
          hadEnemies: black.size > 0 };
    if (white.size === 1) S.sel = [...white.keys()][0];
    $('lesson-piece').src = ch.icon ? `${PIECES}${ch.icon}.svg` : pieceUrl('w', ch.piece);
    dotsEl.innerHTML = ch.levels.map((_, i) =>
      `<button type="button" data-i="${i}" class="${got(ch, i) ? 'done' : ''} ${i === idx ? 'cur' : ''}">${i + 1}</button>`).join('');
    $('next').classList.toggle('is-off', !got(ch, idx) && idx < ch.levels.length - 1);
    drawBoard();
  }

  function drawBoard() {
    boardEl.innerHTML = '';
    for (let i = 0; i < 64; i++) {
      const r = Math.floor(i / 8), c = i % 8;
      const d = document.createElement('div');
      d.className = 'sq ' + ((r + c) % 2 ? 'd' : 'l');
      d.dataset.i = i;
      if (c === 0) d.insertAdjacentHTML('beforeend', `<i class="coord rank">${8 - r}</i>`);
      if (r === 7) d.insertAdjacentHTML('beforeend', `<i class="coord file">${'abcdefgh'[c]}</i>`);
      if (S.apples.has(i)) d.insertAdjacentHTML('beforeend', STAR_SVG);
      boardEl.appendChild(d);
    }
    S.black.forEach((t, i) => boardEl.appendChild(pieceEl('b', t, i)));
    S.white.forEach((t, i) => boardEl.appendChild(pieceEl('w', t, i)));
    markMoves();
  }
  function pieceEl(color, type, i) {
    const el = document.createElement('div');
    el.className = 'hero-piece ' + (color === 'w' ? 'mine' : 'foe');
    el.dataset.sq = i;
    el.style.backgroundImage = `url(${pieceUrl(color, type)})`;
    place(el, i);
    return el;
  }
  const place = (el, i) => { el.style.left = (i % 8) * 12.5 + '%'; el.style.top = Math.floor(i / 8) * 12.5 + '%'; };
  const pieceAt = (color, i) => boardEl.querySelector(`.hero-piece.${color === 'w' ? 'mine' : 'foe'}[data-sq="${i}"]`);
  const sqEl = i => boardEl.children[i];

  function legal(from) {
    if (from === null || !S.white.has(from)) return [];
    return E.moves(S.white.get(from), from, i => S.white.has(i), i => S.black.has(i));
  }
  function markMoves() {
    [...boardEl.querySelectorAll('.sq')].forEach(el => el.classList.remove('can', 'hit', 'sel'));
    if (S.busy || S.sel === null) return;
    sqEl(S.sel).classList.add('sel');
    legal(S.sel).forEach(i => { sqEl(i).classList.add('can'); if (S.black.has(i)) sqEl(i).classList.add('hit'); });
  }
  function bump(i) { const el = pieceAt('w', i); if (!el) return; el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); }

  function tapSquare(t) {
    if (S.busy) return;
    if (S.white.has(t)) { S.sel = t; markMoves(); return; } // вибрав іншу свою фігуру
    if (S.sel === null) return;
    if (!legal(S.sel).includes(t)) { bump(S.sel); return; }
    moveTo(S.sel, t);
  }

  function moveTo(from, t) {
    const type = S.white.get(from);
    S.moves++;
    if (S.last !== null) sqEl(S.last).classList.remove('last');
    sqEl(from).classList.add('last'); S.last = from;
    const el = pieceAt('w', from);
    S.white.delete(from);
    let sound = 'place';
    if (S.black.has(t)) { S.black.delete(t); const f = pieceAt('b', t); if (f) f.classList.add('gone'); sound = 'tap'; }
    if (S.apples.has(t)) { S.apples.delete(t); sqEl(t).querySelector('.star').classList.add('gone'); sound = 'tap'; }
    const nt = type === 'P' && t < 8 ? 'Q' : type; // пішак дійшов до кінця — ферзь
    S.white.set(t, nt);
    el.dataset.sq = t; place(el, t);
    if (nt !== type) el.style.backgroundImage = `url(${pieceUrl('w', nt)})`;
    S.sel = S.white.size === 1 ? t : t;
    LG.play(sound);
    // Поставив під бій — чорна фігура з'їдає, і рівень починається знову (як у Lichess)
    const occ = i => S.white.has(i) || S.black.has(i);
    const attacker = S.black.size ? E.blackAttacks(S.black, t, occ) : -1;
    if (attacker >= 0) return eaten(attacker, t);
    if (!S.apples.size && !S.black.size) finish(); else markMoves();
  }

  function eaten(from, t) {
    S.busy = true; markMoves();
    const foe = pieceAt('b', from);
    setTimeout(() => {
      if (foe) { foe.dataset.sq = t; place(foe, t); }
      const mine = pieceAt('w', t); if (mine) mine.classList.add('gone');
      LG.play('error');
    }, 350);
    startLevel.timer = setTimeout(() => startLevel(S.ch, S.idx), 1500);
  }

  function finish() {
    S.busy = true; markMoves();
    const nb = S.lv.nb;
    const n = S.moves <= nb ? 3 : S.moves <= nb + 2 ? 2 : 1;
    saveStars(S.ch, S.idx, n);
    doneStars.innerHTML = [0, 1, 2].map(k => `<span class="${k < n ? '' : 'off'}">⭐</span>`).join('');
    setTimeout(() => { doneEl.hidden = false; LG.play('place'); if (n === 3) LG.confetti(); }, 250);
    const { ch, idx } = S;
    startLevel.timer = setTimeout(() => {
      if (idx + 1 < ch.levels.length) startLevel(ch, idx + 1);
      else chapterDone(ch);
    }, 1700);
  }

  function chapterDone(ch) {
    doneEl.hidden = true;
    LG.win('Розділ «' + ch.name + '» пройдено!', { image: takeReward(), video: true, onAgain: showChapters });
    showChapters();
  }

  // ---------- нагорода: смішне відео з тваринками (ті самі, що в «Пішаках») ----------
  const EXT = document.createElement('video').canPlayType('video/mp4; codecs="avc1.4D401E"') ? '.mp4' : '.webm';
  let nextReward = null;
  function prepReward() {
    const url = '../pawns/img/rewards/fun-' + String(1 + Math.floor(Math.random() * 40)).padStart(2, '0') + EXT;
    const ready = fetch(url).then(r => r.ok ? r.blob() : Promise.reject()).then(b => URL.createObjectURL(b)).catch(() => url);
    nextReward = { ready, done: null };
    ready.then(u => { if (nextReward && nextReward.ready === ready) nextReward.done = u; });
  }
  function takeReward() { const r = nextReward; prepReward(); return r.done || r.ready; }
  prepReward();

  // ---------- керування: тап по клітинці або перетягування фігури ----------
  const drag = { on: false, moved: false, x0: 0, y0: 0, from: null, el: null };
  boardEl.addEventListener('click', e => {
    if (drag.moved) return;
    const s = e.target.closest('.sq'), p = e.target.closest('.hero-piece');
    if (p) tapSquare(+p.dataset.sq); else if (s) tapSquare(+s.dataset.i);
  });
  boardEl.addEventListener('pointerdown', e => {
    const p = e.target.closest('.hero-piece.mine');
    if (!p || S.busy) return;
    drag.on = true; drag.moved = false; drag.x0 = e.clientX; drag.y0 = e.clientY;
    drag.from = +p.dataset.sq; drag.el = p;
    p.setPointerCapture(e.pointerId);
  });
  boardEl.addEventListener('pointermove', e => {
    if (!drag.on) return;
    if (!drag.moved && Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) < 6) return;
    if (!drag.moved) { S.sel = drag.from; markMoves(); }
    drag.moved = true;
    const b = boardEl.getBoundingClientRect(), s = b.width / 8;
    drag.el.classList.add('drag');
    // Фігура не виходить за межі дошки
    const x = Math.min(Math.max(e.clientX - b.left, s / 2), b.width - s / 2);
    const y = Math.min(Math.max(e.clientY - b.top - s * .4, s / 2), b.height - s / 2);
    drag.el.style.left = (x - s / 2) + 'px'; drag.el.style.top = (y - s / 2) + 'px';
  });
  const endDrag = e => {
    if (!drag.on) return;
    drag.on = false;
    drag.el.classList.remove('drag');
    if (!drag.moved) return;
    const b = boardEl.getBoundingClientRect(), s = b.width / 8;
    const c = Math.min(7, Math.max(0, Math.floor((e.clientX - b.left) / s)));
    const r = Math.min(7, Math.max(0, Math.floor((e.clientY - b.top - s * .4) / s)));
    const t = r * 8 + c;
    if (legal(drag.from).includes(t)) moveTo(drag.from, t); else place(drag.el, drag.from);
    setTimeout(() => { drag.moved = false; }, 0);
  };
  boardEl.addEventListener('pointerup', endDrag);
  boardEl.addEventListener('pointercancel', endDrag);

  dotsEl.addEventListener('click', e => { const b = e.target.closest('button'); if (b) startLevel(S.ch, +b.dataset.i); });
  $('to-chapters').addEventListener('click', () => { clearTimeout(startLevel.timer); showChapters(); });
  $('retry').addEventListener('click', () => startLevel(S.ch, S.idx));
  $('next').addEventListener('click', () => {
    if (S.idx + 1 < S.ch.levels.length) startLevel(S.ch, S.idx + 1); else showChapters();
  });

  // Сторінку не гортаємо пальцем, крім списку розділів і вікон
  document.addEventListener('touchmove', e => {
    if (!e.target.closest('.lg-modal, .chapters')) e.preventDefault();
  }, { passive: false });

  LG.addSettings(() => LG.pieceSetPicker(() => location.reload()));

  showChapters();
})();
