/* «Фігури й пішаки»: білі пішаки проти чорних фігур (кінь, слон, ферзь) або пішаків.
   Пішаки виграють, якщо хоч один дійде до кінця дошки; фігури — якщо зіб'ють усіх пішаків.
   Фігури ходять за шаховими правилами (без шаху). Немає ходів — нічия. */
import { squareName as N } from '../shared/board.js';

export const MODES = [
  ['p_vs_p1', '♟ 4 пішаки проти 4'], ['p_vs_p2', '♟ 6 пішаків проти 6'],
  ['n_vs_p1', '♞ 2 коні проти 4 пішаків'], ['n_vs_p2', '♞ 2 коні проти 6 пішаків'],
  ['b_vs_p1', '♝ 2 слони проти 4 пішаків'], ['b_vs_p2', '♝ 2 слони проти 6 пішаків'],
  ['q_vs_p', '♛ Ферзь проти 8 пішаків']
];
const ROLE = { P: 'pawn', N: 'knight', B: 'bishop', Q: 'queen' };
const VALUE = { N: 320, B: 330, Q: 900 };
const other = s => (s === 'w' ? 'b' : 'w');
const inside = (r, c) => r >= 0 && r < 8 && c >= 0 && c < 8;
const STEPS = {
  N: [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]],
  B: [[-1, -1], [-1, 1], [1, -1], [1, 1]],
  Q: [[-1, -1], [-1, 1], [1, -1], [1, 1], [-1, 0], [1, 0], [0, -1], [0, 1]]
};

function setup(mode) {
  const b = Array(64).fill(null), put = (r, c, color, t) => { b[r * 8 + c] = { c: color, t }; };
  const whites = cols => cols.forEach(c => put(6, c, 'w', 'P'));
  switch (mode) {
    case 'p_vs_p1': [2, 3, 4, 5].forEach(c => { put(6, c, 'w', 'P'); put(1, c, 'b', 'P'); }); break;
    case 'p_vs_p2': [1, 2, 3, 4, 5, 6].forEach(c => { put(6, c, 'w', 'P'); put(1, c, 'b', 'P'); }); break;
    case 'n_vs_p1': whites([2, 3, 4, 5]); put(0, 1, 'b', 'N'); put(0, 6, 'b', 'N'); break;
    case 'n_vs_p2': whites([1, 2, 3, 4, 5, 6]); put(0, 1, 'b', 'N'); put(0, 6, 'b', 'N'); break;
    case 'b_vs_p1': whites([2, 3, 4, 5]); put(0, 2, 'b', 'B'); put(0, 5, 'b', 'B'); break;
    case 'b_vs_p2': whites([1, 2, 3, 4, 5, 6]); put(0, 2, 'b', 'B'); put(0, 5, 'b', 'B'); break;
    default: whites([0, 1, 2, 3, 4, 5, 6, 7]); put(0, 3, 'b', 'Q');
  }
  return b;
}

export function createRules(opts = {}) {
  const mode = () => (opts.mode ? opts.mode() : 'q_vs_p');

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
    const b = s.b.slice(), cap = { ...s.cap };
    if (b[m.j]) cap[s.t].push(b[m.j].t);
    b[m.j] = b[m.i]; b[m.i] = null;
    return { b, t: other(s.t), mode: s.mode, cap };
  }
  function result(s) {
    let wp = 0, bp = 0;
    for (let i = 0; i < 64; i++) {
      const p = s.b[i]; if (!p || p.t !== 'P') continue;
      if (p.c === 'w') { wp++; if (i >> 3 === 0) return { winner: 'w', text: 'Білий пішак дійшов до кінця дошки!' }; }
      else { bp++; if (i >> 3 === 7) return { winner: 'b', text: 'Чорний пішак дійшов до кінця дошки!' }; }
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
      else x = VALUE[p.t];
      v += p.c === side ? x : -x;
    }
    return v;
  }
  return {
    initial: () => ({ b: setup(mode()), t: 'w', mode: mode(), cap: { w: [], b: [] } }),
    moves, play, result, evaluate,
    turn: s => s.t,
    key: s => s.b.map(p => (p ? p.c + p.t : '..')).join('') + s.t,
    pieces: s => { const m = new Map(); s.b.forEach((p, i) => p && m.set(N(i), { role: ROLE[p.t], color: p.c === 'w' ? 'white' : 'black' })); return m; },
    captured: s => s.cap,
    moveOrder: (s, m) => m.gain,
    aiDepth: [3, 4, 5]
  };
}
