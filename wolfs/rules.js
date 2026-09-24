/* «Фігури й пішаки»: білі пішаки проти чорних фігур (тура, слон, кінь, ферзь) або проти пішаків.
   Пішак, що дійшов до кінця дошки, стає ферзем — але перемога, лише якщо цього ферзя не з'їли
   наступним ходом. Фігури виграють, коли зіб'ють усіх пішаків. Фігури ходять за шаховими правилами
   (без шаху). Немає ходів — нічия. */
import { squareName as N } from '../shared/board.js';

// Від найпростішого для фігур до найважчого. [ключ, фігури, скільки пішаків]
export const MODES = [
  ['q_p8', 'Q', 8], ['r_p5', 'R', 5], ['b_p3', 'B', 3], ['n_p3', 'N', 3],
  ['bb_p8', 'BB', 8], ['nn_p6', 'NN', 6], ['p_vs_p1', 'PPPP', 4]
];
const NAMES = { Q: 'ферзь', R: 'тура', B: 'слон', N: 'кінь', BB: '2 слони', NN: '2 коні', PPPP: '4 пішаки' };
export const modeLabel = ([, f, n]) => `${NAMES[f]} проти ${n} пішаків`;
// Кнопка режиму: картинки фігур «проти» кількості пішаків
export const modeButton = ([, f, n]) => {
  const role = { Q: 'queen', R: 'rook', B: 'bishop', N: 'knight', P: 'pawn' };
  const pcs = f.startsWith('P') ? `<mpiece class="pawn black"></mpiece><small>${f.length}</small>` : [...f].map(c => `<mpiece class="${role[c]} black"></mpiece>`).join('');
  return `${pcs}<small class="vs">vs</small><small>${n}</small><mpiece class="pawn white"></mpiece>`;
};
const ROLE = { P: 'pawn', N: 'knight', B: 'bishop', R: 'rook', Q: 'queen' };
const VALUE = { N: 320, B: 330, R: 500, Q: 900 };
const other = s => (s === 'w' ? 'b' : 'w');
const inside = (r, c) => r >= 0 && r < 8 && c >= 0 && c < 8;
const STEPS = {
  N: [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]],
  B: [[-1, -1], [-1, 1], [1, -1], [1, 1]],
  R: [[-1, 0], [1, 0], [0, -1], [0, 1]],
  Q: [[-1, -1], [-1, 1], [1, -1], [1, 1], [-1, 0], [1, 0], [0, -1], [0, 1]]
};
// Пішаки — по центру другого ряду; фігури — у куті / з краю
const PAWN_COLS = { 3: [2, 3, 4], 4: [2, 3, 4, 5], 5: [1, 2, 3, 4, 5], 6: [1, 2, 3, 4, 5, 6], 8: [0, 1, 2, 3, 4, 5, 6, 7] };
function setup(mode) {
  const [, f, n] = MODES.find(m => m[0] === mode) || MODES[0];
  const b = Array(64).fill(null), put = (r, c, color, t) => { b[r * 8 + c] = { c: color, t }; };
  PAWN_COLS[n].forEach(c => put(6, c, 'w', 'P'));
  if (f.startsWith('P')) PAWN_COLS[n].forEach(c => put(1, c, 'b', 'P'));
  else if (f === 'Q') put(0, 3, 'b', 'Q');
  else if (f === 'R') put(0, 0, 'b', 'R');
  else if (f === 'B') put(0, 5, 'b', 'B');
  else if (f === 'N') put(0, 6, 'b', 'N');
  else if (f === 'BB') { put(0, 2, 'b', 'B'); put(0, 5, 'b', 'B'); }
  else if (f === 'NN') { put(0, 1, 'b', 'N'); put(0, 6, 'b', 'N'); }
  return b;
}

export function createRules(opts = {}) {
  const mode = () => { const m = opts.mode ? opts.mode() : 'q_p8'; return MODES.some(x => x[0] === m) ? m : 'q_p8'; };

  function pieceMoves(b, i) {
    const p = b[i], out = [], r0 = i >> 3, c0 = i & 7;
    if (p.t === 'P') {
      const d = p.c === 'w' ? -1 : 1, start = p.c === 'w' ? 6 : 1;
      if (inside(r0 + d, c0) && !b[(r0 + d) * 8 + c0]) {
        out.push((r0 + d) * 8 + c0);
        if (r0 === start && !b[(r0 + 2 * d) * 8 + c0]) out.push((r0 + 2 * d) * 8 + c0);
      }
      for (const dc of [-1, 1]) {
        const r = r0 + d, c = c0 + dc;
        if (inside(r, c) && b[r * 8 + c] && b[r * 8 + c].c !== p.c) out.push(r * 8 + c);
      }
      return out;
    }
    for (const [dr, dc] of STEPS[p.t]) {
      let r = r0 + dr, c = c0 + dc;
      while (inside(r, c)) {
        const q = b[r * 8 + c];
        if (q && q.c === p.c) break;
        out.push(r * 8 + c);
        if (q || p.t === 'N') break;
        r += dr; c += dc;
      }
    }
    return out;
  }

  function moves(s) {
    const out = [];
    for (let i = 0; i < 64; i++) if (s.b[i] && s.b[i].c === s.t)
      for (const j of pieceMoves(s.b, i)) out.push({ i, j, from: N(i), to: N(j), capture: !!s.b[j], gain: s.b[j] ? (VALUE[s.b[j].t] || 100) : 0 });
    return out;
  }
  function play(s, m) {
    const b = s.b.slice(), cap = { w: s.cap.w.slice(), b: s.cap.b.slice() };
    if (b[m.j]) cap[s.t].push(b[m.j].t);
    b[m.j] = b[m.i]; b[m.i] = null;
    // пішак на останньому ряду стає ферзем; якщо суперник його не з'їв — перемога
    let promo = null, won = null;
    const p = b[m.j];
    if (p.t === 'P' && (m.j >> 3) === (p.c === 'w' ? 0 : 7)) { b[m.j] = { c: p.c, t: 'Q', promo: true }; promo = { side: p.c, sq: m.j }; }
    if (s.promo && s.promo.side !== s.t && b[s.promo.sq] && b[s.promo.sq].promo && b[s.promo.sq].c === s.promo.side) won = s.promo.side;
    return { b, t: other(s.t), mode: s.mode, cap, promo, won };
  }
  function result(s) {
    if (s.won) return { winner: s.won, text: 'Пішак дійшов до кінця й став ферзем!' };
    let wp = 0, bp = 0;
    for (let i = 0; i < 64; i++) {
      const p = s.b[i]; if (!p || !(p.t === 'P' || p.promo)) continue;
      if (p.c === 'w') wp++; else bp++;
    }
    if (!wp) return { winner: 'b', text: 'Усі білі пішаки збиті!' };
    if (s.mode.startsWith('p_vs_p') && !bp) return { winner: 'w', text: 'Усі чорні пішаки збиті!' };
    if (!moves(s).length) return { winner: 'draw', text: 'Ходів більше немає.' };
    return null;
  }
  function evaluate(s, side) {
    let v = 0;
    for (let i = 0; i < 64; i++) {
      const p = s.b[i]; if (!p) continue;
      let x;
      if (p.t === 'P') { const adv = p.c === 'w' ? 6 - (i >> 3) : (i >> 3) - 1; x = 100 + adv * adv * 8; }
      else x = VALUE[p.t] + (p.promo ? 1500 : 0); // новий ферзь майже виграв
      v += p.c === side ? x : -x;
    }
    return v;
  }
  return {
    initial: () => ({ b: setup(mode()), t: 'w', mode: mode(), cap: { w: [], b: [] }, promo: null, won: null }),
    moves, play, result, evaluate,
    turn: s => s.t,
    key: s => s.b.map(p => (p ? p.c + p.t : '..')).join('') + s.t + (s.promo ? s.promo.sq : ''),
    pieces: s => { const m = new Map(); s.b.forEach((p, i) => p && m.set(N(i), { role: ROLE[p.t], color: p.c === 'w' ? 'white' : 'black' })); return m; },
    captured: s => s.cap,
    moveOrder: (s, m) => m.gain,
    aiDepth: [3, 4, 5]
  };
}
