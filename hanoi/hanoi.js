/* Ханойська вежа: перенеси всю вежу на зелений стрижень. За раз — один верхній диск, великий на малий класти не можна.
   Тап по стрижню бере верхній диск, тап по іншому — кладе. Диск можна й перетягнути пальцем. */
(function () {
  'use strict';
  const LG = window.LG, $ = id => document.getElementById(id);
  const COLORS = ['#FF6B6B', '#FF9F43', '#FFC928', '#2ECC9A', '#4DA3FF', '#6C5CE7', '#E056FD'];
  const TARGET = 2;
  let n = LG.store.get('hanoi:n', 3), pegs, history, held = null, won = false;

  const seg = $('count');
  seg.innerHTML = [3, 4, 5, 6, 7].map(k => `<button type="button" role="radio" data-n="${k}">${k}</button>`).join('');
  seg.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; n = +b.dataset.n; LG.store.set('hanoi:n', n); start(); });

  const stage = $('stage');
  stage.innerHTML = [0, 1, 2].map(i => `<div class="hn-peg${i === TARGET ? ' target' : ''}" data-p="${i}"></div>`).join('');
  const pegEls = [...stage.querySelectorAll('.hn-peg')];

  function start() {
    pegs = [Array.from({ length: n }, (_, i) => n - 1 - i), [], []]; // диски 0 (малий) … n-1 (великий), знизу вгору
    history = []; held = null; won = false;
    seg.querySelectorAll('button').forEach(b => b.setAttribute('aria-checked', String(+b.dataset.n === n)));
    $('min').textContent = 'Найменше: ' + (2 ** n - 1);
    render();
  }
  function render() {
    const h = Math.max(18, Math.min(44, (stage.clientHeight * 0.8 - 20) / n - 3));
    stage.style.setProperty('--dh', h + 'px');
    const w = stage.clientWidth / 3;
    pegEls.forEach((el, p) => {
      el.innerHTML = pegs[p].map((d, k) => `<div class="hn-disk${held === p && k === pegs[p].length - 1 ? ' lifted' : ''}" data-d="${d}" style="width:${Math.round(w * (0.34 + 0.62 * (d + 1) / n))}px;background:${COLORS[d % COLORS.length]}"></div>`).join('');
      el.classList.remove('hint-from', 'hint-to');
    });
    $('moves').textContent = 'Ходи: ' + history.length;
  }
  function move(from, to) {
    if (from === to) { held = null; return render(); }
    const d = pegs[from][pegs[from].length - 1], top = pegs[to][pegs[to].length - 1];
    if (d === undefined) return;
    if (top !== undefined && top < d) { // великий диск на малий — не можна
      LG.play('error'); pegEls[to].classList.remove('bad'); void pegEls[to].offsetWidth; pegEls[to].classList.add('bad');
      held = null; return render();
    }
    history.push(pegs.map(p => p.slice()));
    pegs[from].pop(); pegs[to].push(d); held = null;
    LG.play('place');
    render();
    if (pegs[TARGET].length === n) {
      won = true;
      const moves = history.length, best = 2 ** n - 1;
      const bestKey = 'hanoi:best:' + n, prev = LG.store.get(bestKey, 0);
      if (!prev || moves < prev) LG.store.set(bestKey, moves);
      LG.win(moves === best ? `Ідеально: ${moves} ходів — менше не буває!` : `Вежу перенесено за ${moves} ходів (найменше — ${best}).`, { reward: true, onAgain: start });
    }
  }

  // Наступний найкращий хід із будь-якого положення (рекурсивно, як у класичному розв'язку)
  function nextMove() {
    const pos = []; pegs.forEach((p, i) => p.forEach(d => { pos[d] = i; }));
    const go = (k, target) => {
      if (k < 0) return null;
      if (pos[k] === target) return go(k - 1, target);
      const other = 3 - pos[k] - target;
      return go(k - 1, other) || { from: pos[k], to: target };
    };
    return go(n - 1, TARGET);
  }

  // ---------- дотики: тап — взяти/покласти, перетягування — перенести ----------
  let press = null, ghost = null;
  const pegAt = x => { const r = stage.getBoundingClientRect(); return Math.max(0, Math.min(2, Math.floor((x - r.left) / (r.width / 3)))); };
  stage.addEventListener('pointerdown', e => {
    if (won) return;
    const p = pegAt(e.clientX);
    press = { p, x: e.clientX, y: e.clientY, drag: false };
    stage.setPointerCapture(e.pointerId);
  });
  stage.addEventListener('pointermove', e => {
    if (!press) return;
    if (!press.drag && Math.hypot(e.clientX - press.x, e.clientY - press.y) > 8 && pegs[press.p].length && held === null) {
      press.drag = true;
      const src = pegEls[press.p].lastElementChild;
      ghost = src.cloneNode(true); ghost.classList.add('drag'); ghost.style.width = src.style.width;
      src.style.visibility = 'hidden';
      document.body.appendChild(ghost);
    }
    if (press.drag) { ghost.style.left = (e.clientX - ghost.offsetWidth / 2) + 'px'; ghost.style.top = (e.clientY - ghost.offsetHeight / 2) + 'px'; }
  });
  const end = e => {
    if (!press) return;
    const p = press; press = null;
    if (p.drag) { ghost.remove(); ghost = null; move(p.p, pegAt(e.clientX)); if (!won) render(); return; }
    if (e.type !== 'pointerup') return;
    if (held === null) { if (pegs[p.p].length) { held = p.p; LG.play('tap'); render(); } }
    else move(held, p.p);
  };
  stage.addEventListener('pointerup', end);
  stage.addEventListener('pointercancel', end);

  $('new').addEventListener('click', start);
  $('undo').addEventListener('click', () => { if (!history.length || won) return LG.play('error'); pegs = history.pop(); held = null; render(); });
  $('hint').addEventListener('click', () => {
    if (won) return;
    const m = nextMove(); if (!m) return;
    held = null; render();
    pegEls[m.from].classList.add('hint-from'); pegEls[m.to].classList.add('hint-to');
  });
  window.addEventListener('resize', () => render());
  document.addEventListener('touchmove', e => { if (!e.target.closest('.lg-modal')) e.preventDefault(); }, { passive: false });
  start();
})();
