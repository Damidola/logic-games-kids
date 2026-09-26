/* Поле доміно: угорі — кістки суперника (сорочкою), посередині — ланцюжок, унизу — свої кістки.
   Тап по кістці: якщо її можна прикласти лише з одного боку — одразу ставимо; якщо з обох —
   з'являються стрілочки біля кінців ланцюжка, тап по стрілочці — туди. */
import { code } from './rules.js';

// Крапки на половинці кістки: клітинки сітки 3×3 (для горизонтальної кістки шістка лежить рядками)
const DOTS = { 0: [], 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
const DOTS_H = { ...DOTS, 6: [0, 1, 2, 6, 7, 8] };
const half = (n, h) => `<span class="dm-half">${(h ? DOTS_H : DOTS)[n].map(k => `<i style="grid-area:${Math.floor(k / 3) + 1}/${k % 3 + 1}"></i>`).join('')}</span>`;
const tileHtml = (t, dir, cls = '', data = '') => `<div class="dm-tile ${dir} ${cls}" ${data}>${half(t[0], dir === 'h')}${half(t[1], dir === 'h')}</div>`;

export function dominoView(el, { pick }) {
  el.classList.add('dm-root');
  el.innerHTML = `<div class="dm-opp"></div><div class="dm-table"><div class="dm-chain"></div></div>
    <div class="dm-bar"><button type="button" class="dm-draw" hidden>🛒 Взяти з базару</button><span class="dm-yard"></span></div>
    <div class="dm-hand"></div>`;
  const $ = s => el.querySelector(s);
  let cur = null, sel = null, hintId = null;

  function draw() {
    const { s, mine, moves } = cur, side = cur.friend ? s.t : cur.player, opp = side === 'w' ? 'b' : 'w';
    const byTile = new Map();
    for (const m of moves) if (m.tile) { const k = code(m.tile); byTile.set(k, [...(byTile.get(k) || []), m]); }
    const selMoves = sel ? byTile.get(sel) || [] : [];
    const slot = end => selMoves.some(m => m.end === end) ? `<button type="button" class="dm-slot" data-end="${end}">${end === 'L' ? '◀' : '▶'}</button>` : '';
    $('.dm-opp').innerHTML = s.hand[opp].map(() => '<div class="dm-tile v back"></div>').join('');
    const n = s.chain.length;
    $('.dm-chain').innerHTML = !n ? `<span class="dm-empty">${mine ? 'Поклади будь-яку кістку 👇' : ''}</span>` :
      slot('L') + s.chain.map((t, i) => tileHtml(t, t[0] === t[1] ? 'v' : 'h',
        (i === 0 && s.last === 'L') || (i === n - 1 && s.last === 'R') || (n === 1 && s.last) ? 'new' : '')).join('') + slot('R');
    const hand = s.hand[side];
    $('.dm-hand').innerHTML = hand.map(t => {
      const k = code(t), ok = mine && byTile.has(k);
      return tileHtml(t, 'v', (ok ? 'ok' : mine ? 'no' : '') + (k === sel ? ' on' : '') + (hintId && hintId.startsWith(k + ':') ? ' hinted' : ''), `data-k="${k}"`);
    }).join('');
    $('.dm-draw').hidden = !(mine && moves.some(m => m.draw));
    $('.dm-yard').textContent = 'Базар: ' + s.yard.length;
  }

  el.addEventListener('click', e => {
    if (!cur || !cur.mine) return;
    const LG = window.LG;
    if (e.target.closest('.dm-draw')) return pick('draw');
    const sl = e.target.closest('.dm-slot');
    if (sl && sel) { const id = sel + ':' + sl.dataset.end; sel = null; return pick(id); }
    const t = e.target.closest('.dm-hand .dm-tile');
    if (!t) return;
    const opts = cur.moves.filter(m => m.tile && code(m.tile) === t.dataset.k);
    if (!opts.length) { LG && LG.play('error'); LG && LG.toast(cur.moves.some(m => m.draw) ? 'Цю кістку нікуди прикласти. Візьми з базару 🛒' : 'Цю кістку нікуди прикласти'); return; }
    if (opts.length === 1) { sel = null; return pick(opts[0].id); }
    sel = sel === t.dataset.k ? null : t.dataset.k; LG && LG.play('tap'); draw();
  });

  return {
    render(s, info) { cur = { s, ...info }; if (!info.mine) sel = null; hintId = null; draw(); },
    hint(m) {
      if (m.draw) { const b = $('.dm-draw'); b.classList.remove('hinted'); void b.offsetWidth; b.classList.add('hinted'); return; }
      hintId = m.id; sel = code(m.tile); draw();
    },
    clearHint() { hintId = null; }
  };
}
