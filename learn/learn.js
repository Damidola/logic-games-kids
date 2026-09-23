/* «Як ходять фігури»: інтерфейс уроків. Правила ходів — engine.js, рівні — levels.js. */
(function () {
  'use strict';
  const E = window.LearnEngine, CH = window.LEARN_CHAPTERS;
  const PIECES = '../shared/pieces/';
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

  function startLevel(ch, idx) {
    chaptersEl.hidden = true; lessonEl.hidden = false; doneEl.hidden = true;
    clearTimeout(startLevel.timer);
    const lv = ch.levels[idx];
    const type = lv.piece || ch.piece;
    S = {
      ch, idx, lv, type, pos: E.sq(lv.from), moves: 0, busy: false, last: null,
      stars: new Set((lv.stars || []).map(E.sq)),
      enemies: new Map(Object.entries(lv.enemies || {}).map(([k, v]) => [E.sq(k), v])),
      stones: new Set((lv.stones || []).map(E.sq)),
      best: E.solve(lv, type)
    };
    $('lesson-piece').src = `${PIECES}w${type}.svg`;
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
      if (S.stars.has(i)) d.insertAdjacentHTML('beforeend', STAR_SVG);
      if (S.stones.has(i)) d.insertAdjacentHTML('beforeend', '<div class="stone"></div>');
      if (S.enemies.has(i)) d.insertAdjacentHTML('beforeend', `<div class="enemy" style="background-image:url(${PIECES}b${S.enemies.get(i)}.svg)"></div>`);
      boardEl.appendChild(d);
    }
    const hp = document.createElement('div');
    hp.className = 'hero-piece'; hp.id = 'hero-piece';
    boardEl.appendChild(hp);
    placeHero(); markMoves();
  }

  const sqEl = i => boardEl.children[i];
  function placeHero() {
    const hp = $('hero-piece');
    hp.style.backgroundImage = `url(${PIECES}w${S.type}.svg)`;
    hp.style.left = (S.pos % 8) * 12.5 + '%';
    hp.style.top = Math.floor(S.pos / 8) * 12.5 + '%';
  }
  function legal() {
    return E.moves(S.type, S.pos, i => S.stones.has(i), i => S.enemies.has(i));
  }
  function markMoves() {
    [...boardEl.children].forEach(el => el.classList && el.classList.remove('can', 'hit'));
    if (S.busy) return;
    legal().forEach(i => { sqEl(i).classList.add('can'); if (S.enemies.has(i)) sqEl(i).classList.add('hit'); });
  }

  function moveTo(t) {
    if (S.busy || !legal().includes(t)) { $('hero-piece').classList.remove('bump'); void $('hero-piece').offsetWidth; $('hero-piece').classList.add('bump'); return; }
    S.moves++;
    if (S.last !== null) sqEl(S.last).classList.remove('last');
    sqEl(S.pos).classList.add('last'); S.last = S.pos;
    S.pos = t;
    let sound = 'place';
    if (S.stars.has(t)) { S.stars.delete(t); sqEl(t).querySelector('.star').classList.add('gone'); sound = 'tap'; }
    if (S.enemies.has(t)) { S.enemies.delete(t); const en = sqEl(t).querySelector('.enemy'); en && en.classList.add('gone'); }
    if (S.type === 'P' && t < 8) S.type = 'Q'; // пішак дійшов до кінця — тепер ферзь
    placeHero();
    LG.play(sound);
    if (!S.stars.size && !S.enemies.size) finish(); else markMoves();
  }

  function finish() {
    S.busy = true; markMoves();
    const n = S.moves <= S.best ? 3 : S.moves <= S.best + 2 ? 2 : 1;
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
  boardEl.addEventListener('click', e => {
    const s = e.target.closest('.sq');
    if (s && !drag.moved) moveTo(+s.dataset.i);
  });
  const drag = { on: false, moved: false, x0: 0, y0: 0 };
  boardEl.addEventListener('pointerdown', e => {
    if (!e.target.closest('#hero-piece') || S.busy) return;
    drag.on = true; drag.moved = false; drag.x0 = e.clientX; drag.y0 = e.clientY;
    e.target.setPointerCapture(e.pointerId);
  });
  boardEl.addEventListener('pointermove', e => {
    if (!drag.on) return;
    if (!drag.moved && Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) < 6) return;
    drag.moved = true;
    const hp = $('hero-piece'), b = boardEl.getBoundingClientRect(), s = b.width / 8;
    hp.classList.add('drag');
    // Фігура не виходить за межі дошки
    const x = Math.min(Math.max(e.clientX - b.left, s / 2), b.width - s / 2);
    const y = Math.min(Math.max(e.clientY - b.top - s * .4, s / 2), b.height - s / 2);
    hp.style.left = (x - s / 2) + 'px'; hp.style.top = (y - s / 2) + 'px';
  });
  const endDrag = e => {
    if (!drag.on) return;
    drag.on = false;
    const hp = $('hero-piece'); hp.classList.remove('drag');
    if (!drag.moved) return;
    const b = boardEl.getBoundingClientRect(), s = b.width / 8;
    const c = Math.min(7, Math.max(0, Math.floor((e.clientX - b.left) / s)));
    const r = Math.min(7, Math.max(0, Math.floor((e.clientY - b.top - s * .4) / s)));
    const t = r * 8 + c;
    if (legal().includes(t)) moveTo(t); else placeHero();
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

  showChapters();
})();
