/* «Кути»: переведи всі свої шашки в будиночок суперника (протилежний кут).
   Шашка ходить на сусідню клітинку в будь-який бік або стрибає через сусідню
   шашку на вільну клітинку за нею — стрибати можна кілька разів поспіль,
   а зупинитись — ще раз натиснувши на цю шашку. Шашки не збиваються.
   Після 30-го ходу, поки в своєму будиночку є шашки, ходити треба ними. */
import { squareName as N } from '../shared/board.js';

const DIRS = [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [-1, 1], [1, -1], [1, 1]];
const other = s => (s === 'w' ? 'b' : 'w');
const inside = (r, c) => r >= 0 && r < 8 && c >= 0 && c < 8;
const MUST_LEAVE_AFTER = 30;

// Будиночки: чорні (робот) — у лівому верхньому куті, білі (дитина) — у правому нижньому
const TRI = [[0, 0], [0, 1], [0, 2], [0, 3], [1, 0], [2, 0], [3, 0], [1, 1], [1, 2], [2, 1]];
const SQR = [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2], [2, 0], [2, 1], [2, 2]];
function homes(shape) {
  const base = shape === 'square' ? SQR : TRI;
  const b = base.map(([r, c]) => r * 8 + c), w = base.map(([r, c]) => (7 - r) * 8 + (7 - c));
  return { b, w };
}

export function createRules(opts = {}) {
  const shape = () => (opts.shape ? opts.shape() : 'triangle');

  function jumpsFrom(b, i, seen) {
    const out = [], r0 = i >> 3, c0 = i & 7;
    for (const [dr, dc] of DIRS) {
      const r1 = r0 + dr, c1 = c0 + dc, r2 = r0 + 2 * dr, c2 = c0 + 2 * dc;
      if (inside(r2, c2) && b[r1 * 8 + c1] && !b[r2 * 8 + c2] && !(seen && seen.includes(r2 * 8 + c2))) out.push(r2 * 8 + c2);
    }
    return out;
  }

  function moves(s) {
    const out = [], H = homes(s.shape);
    if (s.jump !== null) {
      for (const j of jumpsFrom(s.b, s.jump, s.seen)) out.push({ i: s.jump, j, from: N(s.jump), to: N(j), hop: true });
      if (s.jump !== s.start) out.push({ pass: true });
      return out;
    }
    let mine = [];
    for (let i = 0; i < 64; i++) if (s.b[i] === s.t) mine.push(i);
    // Після 30-го ходу: поки в своєму будиночку є шашки — ходимо ними
    if (Math.floor(s.ply / 2) >= MUST_LEAVE_AFTER) {
      const inHome = mine.filter(i => H[s.t].includes(i));
      if (inHome.length) mine = inHome;
    }
    for (const i of mine) {
      const r0 = i >> 3, c0 = i & 7;
      for (const [dr, dc] of DIRS) {
        const r = r0 + dr, c = c0 + dc;
        if (inside(r, c) && !s.b[r * 8 + c]) out.push({ i, j: r * 8 + c, from: N(i), to: N(r * 8 + c) });
      }
      for (const j of jumpsFrom(s.b, i)) out.push({ i, j, from: N(i), to: N(j), hop: true });
    }
    return out;
  }

  const endTurn = (s, b) => ({ b, t: other(s.t), ply: s.ply + 1, jump: null, start: null, seen: [], shape: s.shape });

  function play(s, m) {
    if (m.pass) return endTurn(s, s.b);
    const b = s.b.slice();
    b[m.j] = b[m.i]; b[m.i] = null;
    if (!m.hop) return endTurn(s, b);
    const start = s.jump === null ? m.i : s.start;
    const seen = [...(s.seen || []), m.i, m.j];
    // Далі стрибати нікуди — хід закінчується сам
    if (!jumpsFrom(b, m.j, seen).length) return endTurn(s, b);
    return { b, t: s.t, ply: s.ply, jump: m.j, start, seen, shape: s.shape };
  }

  function result(s) {
    const H = homes(s.shape);
    for (const side of ['w', 'b']) {
      const target = H[other(side)];
      if (target.every(i => s.b[i] === side))
        return { winner: side, text: side === 'w' ? 'Усі твої шашки вдома у робота!' : 'Робот першим привів свої шашки.' };
    }
    return null;
  }

  // Оцінка: хто ближче до чужого кута (відстань кожної шашки до цілі)
  function evaluate(s, side) {
    const H = homes(s.shape);
    let v = 0;
    for (let i = 0; i < 64; i++) {
      const p = s.b[i]; if (!p) continue;
      const r = i >> 3, c = i & 7;
      const d = p === 'w' ? Math.max(r, c) : Math.max(7 - r, 7 - c);
      const home = H[other(p)].includes(i) ? 6 : 0;
      v += (p === side ? 1 : -1) * (40 - d * 5 + home);
    }
    return v;
  }

  function initial() {
    const sh = shape(), H = homes(sh), b = Array(64).fill(null);
    H.w.forEach(i => { b[i] = 'w'; });
    H.b.forEach(i => { b[i] = 'b'; });
    return { b, t: 'w', ply: 0, jump: null, start: null, seen: [], shape: sh };
  }

  return {
    initial, moves, play, result, evaluate,
    turn: s => s.t,
    midTurn: s => s.jump !== null,
    // Досить стрибати — ще раз натиснути на шашку, що стрибає
    passSquare: s => (s.jump !== null && s.jump !== s.start ? N(s.jump) : null),
    key: s => s.b.map(p => p || '.').join('') + s.t + (s.jump ?? ''),
    pieces: s => { const m = new Map(); s.b.forEach((p, i) => p && m.set(N(i), { role: 'disc', color: p === 'w' ? 'white' : 'black' })); return m; },
    // Будиночки: куди йти дитині (золотий) і куди йде робот (червоний)
    marks: s => { const H = homes(s.shape), m = new Map(); H.b.forEach(i => m.set(N(i), 'mark-gold')); H.w.forEach(i => m.set(N(i), 'mark-red')); return m; },
    moveOrder: (s, m) => (m.pass ? 0 : (s.t === 'w' ? (m.i >> 3) - (m.j >> 3) + (m.i & 7) - (m.j & 7) : (m.j >> 3) - (m.i >> 3) + (m.j & 7) - (m.i & 7))),
    aiDepth: [2, 3, 3]
  };
}
