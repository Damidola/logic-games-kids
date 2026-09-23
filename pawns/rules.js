/* Правила «Пішаків»: лише пішаки. Виграє той, хто першим доведе пішака
   до останнього ряду або зб'є всіх пішаків суперника. Немає ходів — нічия.
   Клітинки: 0 = a8 … 63 = h1; білі йдуть «вгору» (до рядка 0). */
import { squareName as N } from '../shared/board.js';

const START = { w: 6, b: 1 }, GOAL = { w: 0, b: 7 }, DIR = { w: -1, b: 1 };
const other = s => (s === 'w' ? 'b' : 'w');
const ADV = [0, 1, 1, 2, 3, 5, 8, 0]; // бонус за просування (скільки пройдено)

export function createRules(opts = {}) {
  const epEnabled = () => (opts.enPassant ? opts.enPassant() : false);

  function initial() {
    const b = Array(64).fill(null);
    for (let c = 0; c < 8; c++) { b[8 + c] = 'b'; b[48 + c] = 'w'; }
    return { b, t: 'w', ep: null, cap: { w: 0, b: 0 } };
  }

  function moves(s) {
    const out = [], me = s.t, d = DIR[me];
    for (let i = 0; i < 64; i++) {
      if (s.b[i] !== me) continue;
      const r = i >> 3, c = i & 7, f = i + 8 * d;
      if (r + d < 0 || r + d > 7) continue;
      if (!s.b[f]) {
        out.push({ from: N(i), to: N(f), i, j: f });
        if (r === START[me] && !s.b[f + 8 * d]) out.push({ from: N(i), to: N(f + 8 * d), i, j: f + 8 * d, dbl: true });
      }
      for (const dc of [-1, 1]) {
        if (c + dc < 0 || c + dc > 7) continue;
        const t = f + dc;
        if (s.b[t] === other(me)) out.push({ from: N(i), to: N(t), i, j: t, capture: true });
        else if (epEnabled() && s.ep === t) out.push({ from: N(i), to: N(t), i, j: t, capture: true, ep: true });
      }
    }
    return out;
  }

  function play(s, m) {
    const b = s.b.slice(), me = s.t;
    b[m.j] = me; b[m.i] = null;
    if (m.ep) b[m.j - 8 * DIR[me]] = null;
    const cap = { ...s.cap };
    if (m.capture) cap[me]++;
    return { b, t: other(me), ep: m.dbl ? (m.i + m.j) / 2 : null, cap };
  }

  function result(s) {
    let w = 0, bl = 0;
    for (let i = 0; i < 64; i++) {
      if (s.b[i] === 'w') { w++; if (i >> 3 === GOAL.w) return { winner: 'w', text: 'Пішак дійшов до кінця!' }; }
      else if (s.b[i] === 'b') { bl++; if (i >> 3 === GOAL.b) return { winner: 'b', text: 'Пішак дійшов до кінця!' }; }
    }
    if (!bl) return { winner: 'w', text: 'Усіх пішаків збито!' };
    if (!w) return { winner: 'b', text: 'Усіх пішаків збито!' };
    if (!moves(s).length) return { winner: 'draw', text: 'Ні в кого немає ходів — пішаки заблокували одне одного.' };
    return null;
  }

  // Оцінка: пішаки + просування + «вільний» пішак, якого ніхто не зупинить
  function evaluate(s, side) {
    let v = 0;
    for (let i = 0; i < 64; i++) {
      const p = s.b[i]; if (!p) continue;
      const r = i >> 3, c = i & 7;
      const done = p === 'w' ? 6 - r : r - 1;
      let x = 10 + ADV[Math.max(0, Math.min(7, done))];
      // вільний: попереду на своїй і сусідніх вертикалях немає чужих пішаків
      let free = true;
      for (let rr = r + DIR[p]; rr >= 0 && rr <= 7 && free; rr += DIR[p])
        for (let cc = c - 1; cc <= c + 1; cc++) if (cc >= 0 && cc <= 7 && s.b[rr * 8 + cc] === other(p)) { free = false; break; }
      if (free) x += 4 + done * 3;
      v += p === side ? x : -x;
    }
    return v;
  }

  return {
    initial, moves, play, result, evaluate,
    turn: s => s.t,
    key: s => s.b.map(p => p || '.').join('') + s.t + (s.ep ?? ''),
    pieces: s => { const m = new Map(); s.b.forEach((p, i) => p && m.set(N(i), { role: 'pawn', color: p === 'w' ? 'white' : 'black' })); return m; },
    captured: s => ({ w: Array(s.cap.w).fill('P'), b: Array(s.cap.b).fill('P') }),
    moveOrder: (s, m) => (m.capture ? 10 : 0) + (s.t === 'w' ? 7 - (m.j >> 3) : m.j >> 3),
    aiDepth: [3, 5, 6]
  };
}
