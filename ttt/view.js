/* Поле 3×3 для хрестиків-нуликів: X — синій, O — червоний, лінія перемоги. */
export function tttView(el, { pick }) {
  el.classList.add('ttt-board');
  el.innerHTML = Array.from({ length: 9 }, (_, i) => `<button type="button" class="ttt-cell" data-i="${i}"></button>`).join('') +
    '<svg class="ttt-line" viewBox="0 0 3 3"><line/></svg>';
  const cells = [...el.querySelectorAll('.ttt-cell')], line = el.querySelector('line');
  el.addEventListener('click', e => { const c = e.target.closest('.ttt-cell'); if (c) pick(+c.dataset.i); });
  return {
    render(s, { mine }) {
      cells.forEach((c, i) => {
        c.textContent = s.b[i] === 'w' ? '✕' : s.b[i] === 'b' ? '◯' : '';
        c.className = 'ttt-cell' + (s.b[i] ? ' ' + s.b[i] : '') + (mine && !s.b[i] ? ' free' : '');
      });
      const LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
      const l = LINES.find(([a, b, c]) => s.b[a] && s.b[a] === s.b[b] && s.b[a] === s.b[c]);
      line.parentNode.classList.toggle('on', !!l);
      if (l) {
        const p = i => [(i % 3) + .5, Math.floor(i / 3) + .5];
        const [x1, y1] = p(l[0]), [x2, y2] = p(l[2]);
        Object.entries({ x1, y1, x2, y2 }).forEach(([k, v]) => line.setAttribute(k, v));
        line.parentNode.dataset.who = s.b[l[0]];
      }
    },
    hint(m) { const c = cells[m.i]; c.classList.remove('hinted'); void c.offsetWidth; c.classList.add('hinted'); },
    clearHint() { cells.forEach(c => c.classList.remove('hinted')); }
  };
}
