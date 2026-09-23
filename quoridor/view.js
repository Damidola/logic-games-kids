/* Поле «Коридору». Тап по клітинці — крок фішкою. Тап між клітинками — прозора стінка (зелена — можна,
   червона — не можна); ще один тап по ній — поставити. */
import { wallLegal } from './rules.js';

export function quoridorView(el, { pick }) {
  el.classList.add('qr-board');
  let n = 0, cur = null, preview = null, cells = [];
  const layer = document.createElement('div');
  function build(size) {
    n = size;
    el.style.setProperty('--n', n);
    el.innerHTML = Array.from({ length: n * n }, (_, i) => `<div class="qr-cell" data-i="${i}"></div>`).join('');
    cells = [...el.querySelectorAll('.qr-cell')];
    layer.className = 'qr-layer';
    el.appendChild(layer);
  }
  const wallEl = (kind, r, c, cls) => {
    const d = document.createElement('i');
    d.className = 'qr-wall ' + kind + ' ' + cls;
    if (kind === 'h') { d.style.left = (c / n * 100) + '%'; d.style.top = ((r + 1) / n * 100) + '%'; }
    else { d.style.left = ((c + 1) / n * 100) + '%'; d.style.top = (r / n * 100) + '%'; }
    return d;
  };
  function draw() {
    const { s, mine, moves } = cur;
    const can = new Set(mine ? moves.filter(m => m.kind === 'm').map(m => m.to) : []);
    cells.forEach((c, i) => {
      const r = Math.floor(i / n);
      c.className = 'qr-cell' + (can.has(i) ? ' free' : '') + (r === 0 ? ' goal-w' : r === n - 1 ? ' goal-b' : '') +
        (s.last && s.last.kind === 'm' && s.last.to === i ? ' last' : '');
      c.innerHTML = s.p.w === i ? '<b class="qr-pawn w"></b>' : s.p.b === i ? '<b class="qr-pawn b"></b>' : '';
    });
    layer.innerHTML = '';
    for (const kind of ['h', 'v']) {
      const arr = kind === 'h' ? s.hw : s.vw;
      arr.forEach((x, k) => { if (x) layer.appendChild(wallEl(kind, Math.floor(k / (n - 1)), k % (n - 1), s.last && s.last.kind === kind && s.last.r * (n - 1) + s.last.c === k ? 'last' : '')); });
    }
    if (preview) layer.appendChild(wallEl(preview.kind, preview.r, preview.c, 'preview ' + (preview.ok ? 'ok' : 'bad') + (preview.hint ? ' hinted' : '')));
  }
  el.addEventListener('click', e => {
    if (!cur || !cur.mine) return;
    const b = el.getBoundingClientRect(), x = (e.clientX - b.left) / b.width * n, y = (e.clientY - b.top) / b.height * n;
    const dx = Math.abs(x - Math.round(x)), dy = Math.abs(y - Math.round(y));
    const inner = Math.round(x) > 0 && Math.round(x) < n, innerY = Math.round(y) > 0 && Math.round(y) < n;
    let wall = null;
    if (dy < 0.22 && innerY && dy <= dx) wall = { kind: 'h', r: Math.round(y) - 1, c: Math.max(0, Math.min(n - 2, Math.floor(x - 0.5))) };
    else if (dx < 0.22 && inner) wall = { kind: 'v', r: Math.max(0, Math.min(n - 2, Math.floor(y - 0.5))), c: Math.round(x) - 1 };
    if (wall) {
      if (preview && preview.kind === wall.kind && Math.abs(preview.r - wall.r) + Math.abs(preview.c - wall.c) <= 1) {
        const p = preview; preview = null;
        if (p.ok) return pick(`${p.kind}${p.r}:${p.c}`);
        draw(); return window.LG && LG.play('error');
      }
      preview = { ...wall, ok: wallLegal(cur.s, wall.kind, wall.r, wall.c) };
      return draw();
    }
    preview = null;
    const i = Math.floor(y) * n + Math.floor(x);
    if (cells[i] && cells[i].classList.contains('free')) pick('m' + i); else draw();
  });
  return {
    render(s, info) { if (s.n !== n) build(s.n); if (!info.mine) preview = null; cur = { s, ...info }; draw(); },
    hint(m) {
      if (m.kind === 'm') { const c = cells[m.to]; c.classList.remove('hinted'); void c.offsetWidth; c.classList.add('hinted'); }
      else { preview = { kind: m.kind, r: m.r, c: m.c, ok: true, hint: true }; draw(); }
    },
    clearHint() { cells.forEach(c => c.classList.remove('hinted')); }
  };
}
