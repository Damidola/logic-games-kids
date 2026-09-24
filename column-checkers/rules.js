/* Башні (стовпові шашки): як російські шашки, але збита шашка не зникає — її забирають
   під свою шашку, і виростає башня. Башнею керує той, чия шашка зверху. Коли башню б'ють,
   забирають лише верхню шашку — решта лишається на місці, і там може «звільнитися» шашка суперника.
   Бити обов'язково, кілька разів поспіль; шашка, що дійшла до краю, стає дамкою. */
import { squareName as N } from '../shared/board.js';

const DIRS = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
const other = s => (s === 'w' ? 'b' : 'w');
const inside = (r, c) => r >= 0 && r < 8 && c >= 0 && c < 8;
const LAST = { w: 0, b: 7 };
const top = t => t[0];

// Взяття башнею з клітинки i; уже перестрибнуті в цьому ході башні (seen) вдруге не б'ємо
function captures(b, i, seen = []) {
  const p = top(b[i]), out = [], r0 = i >> 3, c0 = i & 7;
  for (const [dr, dc] of DIRS) {
    if (!p.k) {
      const r1 = r0 + dr, c1 = c0 + dc, r2 = r0 + 2 * dr, c2 = c0 + 2 * dc, x = r1 * 8 + c1;
      if (inside(r2, c2) && b[x] && top(b[x]).c !== p.c && !b[r2 * 8 + c2] && !seen.includes(x)) out.push({ i, j: r2 * 8 + c2, x });
      continue;
    }
    let r = r0 + dr, c = c0 + dc, victim = -1;
    while (inside(r, c)) {
      const q = b[r * 8 + c];
      if (q) { if (top(q).c === p.c || victim >= 0 || seen.includes(r * 8 + c)) break; victim = r * 8 + c; }
      else if (victim >= 0) out.push({ i, j: r * 8 + c, x: victim });
      r += dr; c += dc;
    }
  }
  return out;
}
function quiet(b, i) {
  const p = top(b[i]), out = [], r0 = i >> 3, c0 = i & 7;
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
      if (i >> 3 < 3) b[i] = [{ c: 'b', k: false }];
      else if (i >> 3 > 4) b[i] = [{ c: 'w', k: false }];
    }
    return { b, t: 'w', chain: null, seen: [] };
  }
  const withNames = m => ({ ...m, from: N(m.i), to: N(m.j), capture: m.x !== undefined });

  function moves(s) {
    if (s.chain !== null) return captures(s.b, s.chain, s.seen).map(withNames);
    const caps = [], plain = [];
    for (let i = 0; i < 64; i++) if (s.b[i] && top(s.b[i]).c === s.t) {
      caps.push(...captures(s.b, i));
      if (!caps.length) plain.push(...quiet(s.b, i));
    }
    return (caps.length ? caps : plain).map(withNames);
  }

  function play(s, m) {
    const b = s.b.slice(), tower = b[m.i].map(p => ({ ...p }));
    b[m.i] = null;
    if (m.x !== undefined) { // верхня шашка збитої башні йде вниз під нашу башню
      const victim = b[m.x].map(p => ({ ...p }));
      tower.push(victim.shift());
      b[m.x] = victim.length ? victim : null;
    }
    if ((m.j >> 3) === LAST[tower[0].c]) tower[0].k = true;
    b[m.j] = tower;
    const seen = m.x !== undefined ? [...s.seen, m.x] : [];
    if (m.x !== undefined && captures(b, m.j, seen).length) return { b, t: s.t, chain: m.j, seen };
    return { b, t: other(s.t), chain: null, seen: [] };
  }

  function result(s) {
    if (moves(s).length) return null;
    return { winner: other(s.t), text: s.t === 'w' ? 'У тебе не лишилося ходів.' : 'У робота не лишилося ходів. Чудова партія!' };
  }

  // Башня тим цінніша, чим більше в ній полонених; свої шашки під чужою верхівкою — втрата (поки що)
  function evaluate(s, side) {
    let v = 0;
    for (let i = 0; i < 64; i++) {
      const t = s.b[i]; if (!t) continue;
      const p = t[0], adv = p.c === 'w' ? 7 - (i >> 3) : i >> 3;
      const prisoners = t.filter(q => q.c !== p.c).length, own = t.length - prisoners;
      const x = (p.k ? 300 : 100 + adv * 5) + prisoners * 70 + (own - 1) * 40;
      v += p.c === side ? x : -x;
    }
    return v;
  }

  return {
    initial, moves, play, result, evaluate,
    turn: s => s.t,
    midTurn: s => s.chain !== null,
    key: s => s.b.map(t => (t ? t.map(p => p.c + (p.k ? 'K' : 'm')).join('') : '.')).join(',') + s.t + (s.chain ?? '') + s.seen.join('.'),
    // Роль шашки + висота башні (h2…h12) і колір шашки під верхньою (uw/ub) — для малювання башти
    pieces: s => {
      const m = new Map();
      s.b.forEach((t, i) => {
        if (!t) return;
        const p = t[0], extra = t.length > 1 ? ` h${Math.min(t.length, 12)} u${t[1].c}` : '';
        m.set(N(i), { role: (p.k ? 'dame' : 'man') + extra, color: p.c === 'w' ? 'white' : 'black' });
      });
      return m;
    },
    score: s => {
      let w = 0, bl = 0;
      s.b.forEach(t => { if (t) (t[0].c === 'w' ? w++ : bl++); });
      return { w: `<span class="tw-sc">⬜ башень: ${w}</span>`, b: `<span class="tw-sc">⬛ башень: ${bl}</span>` };
    },
    moveOrder: (s, m) => (m.capture ? 10 : 0),
    aiDepth: [3, 5, 6]
  };
}
