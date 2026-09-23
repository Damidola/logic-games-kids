/* Поле реверсі: зелене сукно, чорні ('w') і білі ('b') фішки, крапки можливих ходів, перевертання. */
export function reversiView(el, { pick }) {
  el.classList.add('rv-board');
  el.innerHTML = Array.from({ length: 64 }, (_, i) => `<button type="button" class="rv-cell" data-i="${i}"><i></i></button>`).join('');
  const cells = [...el.querySelectorAll('.rv-cell')];
  el.addEventListener('click', e => { const c = e.target.closest('.rv-cell'); if (c) pick(+c.dataset.i); });
  return {
    render(s, { mine, moves }) {
      const can = new Set(moves.map(m => m.i)), flipped = new Set(s.flipped);
      cells.forEach((c, i) => {
        const v = s.b[i];
        c.className = 'rv-cell' + (mine && can.has(i) ? ' free' : '') + (i === s.last ? ' last' : '');
        const disc = c.firstChild;
        const cls = v ? 'rv-disc ' + v + (flipped.has(i) ? ' flip' : i === s.last ? ' drop' : '') : '';
        if (disc.className !== cls) disc.className = cls;
      });
    },
    hint(m) { const c = cells[m.i]; c.classList.remove('hinted'); void c.offsetWidth; c.classList.add('hinted'); },
    clearHint() { cells.forEach(c => c.classList.remove('hinted')); }
  };
}
