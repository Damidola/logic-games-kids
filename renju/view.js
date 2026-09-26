/* Поле рендзю: дерев'яна дошка з лініями, камені стають на перетини. Чорні — w (ходять першими), білі — b. */
export function renjuView(el, { pick }) {
  el.classList.add('rj-board');
  let n = 0, cells = [];
  function build(size) {
    n = size;
    el.style.setProperty('--n', n);
    const lines = Array.from({ length: n }, (_, k) =>
      `<line x1="0.5" y1="${k + 0.5}" x2="${n - 0.5}" y2="${k + 0.5}"/><line x1="${k + 0.5}" y1="0.5" x2="${k + 0.5}" y2="${n - 0.5}"/>`).join('');
    const m = Math.floor((n - 1) / 2), e = n >= 15 ? 3 : 2;
    const stars = n >= 10 ? [[e, e], [e, n - 1 - e], [n - 1 - e, e], [n - 1 - e, n - 1 - e], [m, m]] : [];
    el.innerHTML = `<svg class="rj-lines" viewBox="0 0 ${n} ${n}" aria-hidden="true">${lines}${stars.map(([r, c]) => `<circle cx="${c + 0.5}" cy="${r + 0.5}" r="0.12"/>`).join('')}</svg>` +
      Array.from({ length: n * n }, (_, i) => `<button type="button" class="rj-pt" data-i="${i}"></button>`).join('');
    cells = [...el.querySelectorAll('.rj-pt')];
  }
  el.addEventListener('click', e => { const c = e.target.closest('.rj-pt'); if (c) pick(+c.dataset.i); });
  return {
    render(s, { mine }) {
      if (s.n !== n) build(s.n);
      const win = new Set(s.win || []);
      el.classList.toggle('mine', mine);
      cells.forEach((c, i) => {
        c.className = 'rj-pt' + (s.b[i] ? ' ' + s.b[i] : '') + (i === s.last ? ' last' : '') + (win.has(i) ? ' win' : '');
      });
    },
    hint(m) { const c = cells[m.i]; c.classList.remove('hinted'); void c.offsetWidth; c.classList.add('hinted'); },
    clearHint() { cells.forEach(c => c.classList.remove('hinted')); }
  };
}
