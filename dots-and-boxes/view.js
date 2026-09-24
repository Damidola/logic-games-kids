/* Поле «Точки й квадратики» (SVG): точки, лінії гравців, зафарбовані квадратики, товсті зони дотику для ліній. */
import { geo } from './rules.js';

const U = 100, M = 50; // крок між точками і поля
export function dotsView(el, { pick }) {
  el.classList.add('db-board');
  let n = 0, svg = null, lineEls = [], boxEls = [];
  const xy = (r, c) => [M + c * U, M + r * U];
  function build(size) {
    n = size;
    const g = geo(n), W = 2 * M + n * U;
    const boxes = Array.from({ length: n * n }, (_, b) => { const [x, y] = xy(Math.floor(b / n), b % n); return `<g class="db-box" data-b="${b}"><rect x="${x + 6}" y="${y + 6}" width="${U - 12}" height="${U - 12}" rx="10"/><text x="${x + U / 2}" y="${y + U / 2 + 14}">★</text></g>`; }).join('');
    const lines = g.lines.map((l, i) => {
      const [x1, y1] = xy(l.r, l.c), [x2, y2] = l.h ? xy(l.r, l.c + 1) : xy(l.r + 1, l.c);
      return `<g class="db-line" data-i="${i}"><line class="hit" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/><line class="ln" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/></g>`;
    }).join('');
    const dots = [];
    for (let r = 0; r <= n; r++) for (let c = 0; c <= n; c++) { const [x, y] = xy(r, c); dots.push(`<circle class="db-dot" cx="${x}" cy="${y}" r="9"/>`); }
    el.innerHTML = `<svg viewBox="0 0 ${W} ${W}">${boxes}${lines}${dots.join('')}</svg>`;
    svg = el.firstChild;
    lineEls = [...svg.querySelectorAll('.db-line')];
    boxEls = [...svg.querySelectorAll('.db-box')];
  }
  el.addEventListener('click', e => { const l = e.target.closest('.db-line'); if (l) pick(+l.dataset.i); });
  return {
    render(s, { mine }) {
      if (s.n !== n) build(s.n);
      lineEls.forEach((l, i) => l.setAttribute('class', 'db-line' + (s.e[i] ? ' on ' + s.e[i] : mine ? ' free' : '') + (i === s.last ? ' last' : '')));
      boxEls.forEach((b, i) => b.setAttribute('class', 'db-box' + (s.box[i] ? ' ' + s.box[i] : '')));
    },
    hint(m) { const l = lineEls[m.i]; l.classList.remove('hinted'); void l.getBBox(); l.classList.add('hinted'); },
    clearHint() { lineEls.forEach(l => l.classList.remove('hinted')); }
  };
}
