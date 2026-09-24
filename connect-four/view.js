/* Поле «Чотири в ряд»: 7 стовпчиків, фішка падає донизу. Червоні — білі (w), жовті — чорні (b). */
export function connect4View(el, { pick }) {
  const R = 6, C = 7;
  el.classList.add('c4-board');
  el.innerHTML = Array.from({ length: C }, (_, c) => `<div class="c4-col" data-c="${c}">${
    Array.from({ length: R }, (_, r) => `<div class="c4-cell" data-i="${r * C + c}"></div>`).join('')}</div>`).join('');
  const cells = [...el.querySelectorAll('.c4-cell')].sort((a, b) => a.dataset.i - b.dataset.i);
  const cols = [...el.querySelectorAll('.c4-col')];
  el.addEventListener('click', e => { const c = e.target.closest('.c4-col'); if (c) pick(+c.dataset.c); });
  return {
    render(s, { mine }) {
      const LINES = [];
      cells.forEach((cell, i) => {
        cell.className = 'c4-cell' + (s.b[i] ? ' ' + s.b[i] : '') + (i === s.last ? ' drop' : '');
      });
      cols.forEach(c => c.classList.toggle('free', mine));
      // підсвітити четвірку
      const DIRS = [[0, 1], [1, 0], [1, 1], [1, -1]];
      for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
        const p = s.b[r * C + c]; if (!p) continue;
        for (const [dr, dc] of DIRS) {
          const q = [0, 1, 2, 3].map(k => [r + k * dr, c + k * dc]);
          if (q.every(([rr, cc]) => rr >= 0 && rr < R && cc >= 0 && cc < C && s.b[rr * C + cc] === p)) q.forEach(([rr, cc]) => cells[rr * C + cc].classList.add('win'));
        }
      }
      void LINES;
    },
    hint(m) { const c = cols[m.c]; c.classList.remove('hinted'); void c.offsetWidth; c.classList.add('hinted'); },
    clearHint() { cols.forEach(c => c.classList.remove('hinted')); }
  };
}
