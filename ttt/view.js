/* Поле N×N для хрестиків-нуликів: X — синій, O — червоний, лінія перемоги. */
export function tttView(el, { pick }) {
  el.classList.add('ttt-board');
  let n = 0, cells = [], line = null;
  function build(size) {
    n = size;
    el.style.setProperty('--n', n);
    el.dataset.n = n;
    el.innerHTML = Array.from({ length: n * n }, (_, i) => `<button type="button" class="ttt-cell" data-i="${i}"></button>`).join('') +
      `<svg class="ttt-line" viewBox="0 0 ${n} ${n}"><line/></svg>`;
    cells = [...el.querySelectorAll('.ttt-cell')];
    line = el.querySelector('line');
  }
  el.addEventListener('click', e => { const c = e.target.closest('.ttt-cell'); if (c) pick(+c.dataset.i); });
  return {
    render(s, { mine }) {
      if (s.n !== n) build(s.n);
      cells.forEach((c, i) => {
        c.textContent = s.b[i] === 'w' ? '✕' : s.b[i] === 'b' ? '◯' : '';
        c.className = 'ttt-cell' + (s.b[i] ? ' ' + s.b[i] : '') + (mine && !s.b[i] ? ' free' : '');
      });
      const l = s.win;
      line.parentNode.classList.toggle('on', !!l);
      if (l) {
        const p = i => [(i % n) + .5, Math.floor(i / n) + .5];
        const [x1, y1] = p(l[0]), [x2, y2] = p(l[l.length - 1]);
        Object.entries({ x1, y1, x2, y2 }).forEach(([k, v]) => line.setAttribute(k, v));
        line.parentNode.dataset.who = s.b[l[0]];
      }
    },
    hint(m) { const c = cells[m.i]; c.classList.remove('hinted'); void c.offsetWidth; c.classList.add('hinted'); },
    clearHint() { cells.forEach(c => c.classList.remove('hinted')); }
  };
}
