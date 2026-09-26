/* Поле «Блокусу»: внизу лоток із фігурками. Вибери фігурку, поверни ↻ чи переверни ⇋,
   натисни на поле — з’явиться прозора фігурка (зелена — можна, червона — ні). Ще тап по ній — поставити. */
import { N, PIECES, transform, orientIndex, anchors } from './rules.js';

// Маленька фігурка для лотка: клітинки в сітці 5×5 (по центру)
const mini = cells => {
  const h = Math.max(...cells.map(x => x[0])) + 1, w = Math.max(...cells.map(x => x[1])) + 1;
  const dr = Math.floor((5 - h) / 2), dc = Math.floor((5 - w) / 2);
  return cells.map(([r, c]) => `<i style="grid-row:${r + dr + 1};grid-column:${c + dc + 1}"></i>`).join('');
};

export function blokusView(el, { pick }) {
  el.classList.add('bk-root');
  el.innerHTML = `
    <div class="bk-grid">${Array.from({ length: N * N }, (_, i) => `<div class="bk-cell" data-i="${i}"></div>`).join('')}</div>
    <div class="bk-tools">
      <span class="bk-cur"></span>
      <button type="button" data-t="rot" title="Повернути">↻</button>
      <button type="button" data-t="flip" title="Перевернути">⇋</button>
      <span class="bk-msg"></span>
    </div>
    <div class="bk-tray">${PIECES.map((c, p) => `<button type="button" class="bk-piece" data-p="${p}">${mini(c)}</button>`).join('')}</div>`;
  const cells = [...el.querySelectorAll('.bk-cell')];
  const tray = [...el.querySelectorAll('.bk-piece')];
  const $ = s => el.querySelector(s);
  let cur = null, sel = null, rot = 0, flip = 0, ghost = null, legal = new Map();

  const shape = () => transform(sel, rot, flip);
  // Поставити прозору фігурку так, щоб вона накривала клітинку at (якщо можна — там, де хід дозволений)
  function place(at) {
    const sh = shape(), o = orientIndex(sel, sh);
    const ar = Math.floor(at / N), ac = at % N;
    const cr = sh.reduce((a, x) => a + x[0], 0) / sh.length, cc = sh.reduce((a, x) => a + x[1], 0) / sh.length;
    const order = sh.slice().sort((a, b) => Math.hypot(a[0] - cr, a[1] - cc) - Math.hypot(b[0] - cr, b[1] - cc));
    for (const [kr, kc] of order) {
      const id = `${sel}.${o}.${ar - kr}.${ac - kc}`;
      if (legal.has(id)) { ghost = { at, id, ok: true, cells: legal.get(id).cells }; return; }
    }
    const [kr, kc] = order[0];
    const idx = sh.map(([r, c]) => [ar - kr + r, ac - kc + c]).filter(([r, c]) => r >= 0 && r < N && c >= 0 && c < N).map(([r, c]) => r * N + c);
    ghost = { at, ok: false, cells: idx };
  }

  function draw() {
    if (!cur) return;
    const { s, mine } = cur, side = cur.friend ? s.t : cur.player;
    const an = new Set(mine ? anchors(s.b, s.t, s.hand[s.t]) : []);
    const last = new Set(s.last || []), gh = new Set(ghost ? ghost.cells : []);
    cells.forEach((c, i) => {
      let k = 'bk-cell';
      if (s.b[i]) k += ' ' + s.b[i] + (last.has(i) ? ' last' : '');
      else if (i === 4 * N + 4 || i === 9 * N + 9) k += ' start';
      if (an.has(i)) k += ' anchor a' + s.t;
      if (gh.has(i)) k += ' ghost ' + (ghost.ok ? 'ok' : 'bad') + (ghost.hint ? ' hinted' : '');
      c.className = k;
    });
    const canP = new Set([...legal.values()].map(m => m.p));
    el.dataset.side = side;
    tray.forEach((b, p) => {
      b.hidden = !s.hand[side][p];
      b.classList.toggle('on', p === sel);
      b.classList.toggle('stuck', mine && !canP.has(p));
    });
    $('.bk-cur').innerHTML = sel === null ? '' : mini(shape());
    $('.bk-tools').classList.toggle('empty', sel === null);
    $('.bk-msg').textContent = !mine ? '' : sel === null ? '👇 Вибери фігурку' : ghost ? (ghost.ok ? 'Ще раз — поставити' : 'Сюди не можна') : 'Торкнись кутика ✨';
  }

  el.addEventListener('click', e => {
    if (!cur || !cur.mine) return;
    const LG = window.LG;
    const pc = e.target.closest('.bk-piece');
    if (pc) {
      const p = +pc.dataset.p;
      if (p !== sel) { sel = p; rot = 0; flip = 0; if (ghost) place(ghost.at); }
      LG && LG.play('tap');
      return draw();
    }
    const t = e.target.closest('[data-t]');
    if (t) {
      if (sel === null) return;
      if (t.dataset.t === 'rot') rot = (rot + 1) % 4;
      else { flip ^= 1; rot = (4 - rot) % 4; } // дзеркало зліва-направо відносно того, що видно
      if (ghost) place(ghost.at);
      LG && LG.play('tap');
      return draw();
    }
    const c = e.target.closest('.bk-cell'); if (!c) return;
    const i = +c.dataset.i;
    if (ghost && ghost.ok && ghost.cells.includes(i)) { const id = ghost.id; ghost = null; return pick(id); }
    if (sel === null) { LG && LG.play('error'); return draw(); }
    place(i);
    if (!ghost.ok) LG && LG.play('error');
    draw();
  });

  return {
    render(s, info) {
      cur = { s, ...info };
      legal = new Map(info.mine ? info.moves.map(m => [m.id, m]) : []);
      const side = info.friend ? s.t : info.player;
      if (sel !== null && !s.hand[side][sel]) sel = null;
      if (!info.mine || (ghost && ghost.ok && !legal.has(ghost.id))) ghost = null;
      draw();
    },
    hint(m) {
      sel = m.p;
      outer: for (const f of [0, 1]) for (let r = 0; r < 4; r++) if (orientIndex(m.p, transform(m.p, r, f)) === m.o) { rot = r; flip = f; break outer; }
      ghost = { at: m.cells[0], id: m.id, ok: true, hint: true, cells: m.cells };
      draw();
    },
    clearHint() { if (ghost) ghost.hint = false; }
  };
}
