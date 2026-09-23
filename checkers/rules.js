/* Шашки (російські правила, як були в грі): ходять по темних клітинках,
   бити обов'язково, прості шашки б'ють і назад, дамка — «далекобійна».
   Кілька взять за хід: кожен стрибок — окремий крок того самого гравця.
   Шашка, що стала дамкою посеред взяття, б'є далі як дамка. Немає ходів — програв. */
import { squareName as N } from '../shared/board.js';

const DIRS = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
const other = s => (s === 'w' ? 'b' : 'w');
const inside = (r, c) => r >= 0 && r < 8 && c >= 0 && c < 8;
const LAST = { w: 0, b: 7 };

// Усі взяття однієї шашки з клітинки i (на дошці b)
function captures(b, i) {
  const p = b[i], out = [];
  const r0 = i >> 3, c0 = i & 7;
  for (const [dr, dc] of DIRS) {
    if (!p.k) {
      const r1 = r0 + dr, c1 = c0 + dc, r2 = r0 + 2 * dr, c2 = c0 + 2 * dc;
      if (inside(r2, c2) && b[r1 * 8 + c1] && b[r1 * 8 + c1].c !== p.c && !b[r2 * 8 + c2])
        out.push({ i, j: r2 * 8 + c2, x: r1 * 8 + c1 });
      continue;
    }
    let r = r0 + dr, c = c0 + dc, victim = -1;
    while (inside(r, c)) {
      const q = b[r * 8 + c];
      if (q) { if (q.c === p.c || victim >= 0) break; victim = r * 8 + c; }
      else if (victim >= 0) out.push({ i, j: r * 8 + c, x: victim });
      r += dr; c += dc;
    }
  }
  return out;
}

function quiet(b, i) {
  const p = b[i], out = [];
  const r0 = i >> 3, c0 = i & 7;
  const dirs = p.k ? DIRS : DIRS.filter(([dr]) => dr === (p.c === 'w' ? -1 : 1));
  for (const [dr, dc] of dirs) {
    let r = r0 + dr, c = c0 + dc;
    while (inside(r, c) && !b[r * 8 + c]) { out.push({ i, j: r * 8 + c }); if (!p.k) break; r += dr; c += dc; }
  }
  return out;
}

export function createRules() {
  function initial() {
    const b = Array(64).fill(null);
    for (let i = 0; i < 64; i++) if (((i >> 3) + (i & 7)) % 2) {
      if (i >> 3 < 3) b[i] = { c: 'b', k: false };
      else if (i >> 3 > 4) b[i] = { c: 'w', k: false };
    }
    return { b, t: 'w', chain: null, cap: { w: 0, b: 0 } };
  }
  const withNames = m => ({ ...m, from: N(m.i), to: N(m.j), capture: m.x !== undefined });

  function moves(s) {
    if (s.chain !== null) return captures(s.b, s.chain).map(withNames);
    const caps = [], plain = [];
    for (let i = 0; i < 64; i++) if (s.b[i] && s.b[i].c === s.t) {
      caps.push(...captures(s.b, i));
      if (!caps.length) plain.push(...quiet(s.b, i));
    }
    return (caps.length ? caps : plain).map(withNames);
  }

  function play(s, m) {
    const b = s.b.slice(), p = { ...b[m.i] };
    b[m.i] = null;
    if ((m.j >> 3) === LAST[p.c]) p.k = true;
    b[m.j] = p;
    const cap = { ...s.cap };
    if (m.x !== undefined) { b[m.x] = null; cap[p.c]++; }
    // Після взяття — чи можна бити далі тією ж шашкою?
    if (m.x !== undefined && captures(b, m.j).length) return { b, t: s.t, chain: m.j, cap };
    return { b, t: other(s.t), chain: null, cap };
  }

  function result(s) {
    if (moves(s).length) return null;
    return { winner: other(s.t), text: s.t === 'w' ? 'У тебе не лишилося ходів.' : 'У робота не лишилося ходів. Чудова партія!' };
  }

  function evaluate(s, side) {
    let v = 0;
    for (let i = 0; i < 64; i++) {
      const p = s.b[i]; if (!p) continue;
      const adv = p.c === 'w' ? 7 - (i >> 3) : i >> 3;
      const x = p.k ? 300 : 100 + adv * 5 + ((i & 7) > 1 && (i & 7) < 6 ? 4 : 0);
      v += p.c === side ? x : -x;
    }
    return v;
  }

  return {
    initial, moves, play, result, evaluate,
    turn: s => s.t,
    midTurn: s => s.chain !== null,
    key: s => s.b.map(p => (p ? p.c + (p.k ? 'K' : 'm') : '.')).join('') + s.t + (s.chain ?? ''),
    pieces: s => { const m = new Map(); s.b.forEach((p, i) => p && m.set(N(i), { role: p.k ? 'dame' : 'man', color: p.c === 'w' ? 'white' : 'black' })); return m; },
    captured: s => ({ w: Array(s.cap.w).fill('man'), b: Array(s.cap.b).fill('man') }),
    moveOrder: (s, m) => (m.capture ? 10 : 0),
    aiDepth: [3, 5, 6]
  };
}
