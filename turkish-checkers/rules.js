/* Турецькі шашки: 16 шашок у кожного на другому й третьому рядах, ходять по всіх клітинках.
   Проста шашка ходить і б'є на одну клітинку вперед або вбік (не назад і не навскоси).
   Дамка ходить і б'є по прямій на будь-яку відстань. Збита шашка зникає одразу.
   Бити обов'язково і якомога більше шашок; дамка посеред взяття не повертає назад. */
import { squareName as N } from '../shared/board.js';

const ORTHO = [[-1, 0], [1, 0], [0, -1], [0, 1]];
const other = s => (s === 'w' ? 'b' : 'w');
const inside = (r, c) => r >= 0 && r < 8 && c >= 0 && c < 8;
const LAST = { w: 0, b: 7 };
const fwd = c => (c === 'w' ? -1 : 1);
const dirsOf = p => (p.k ? ORTHO : ORTHO.filter(([dr]) => dr !== -fwd(p.c)));

// Окремі стрибки шашки з i (lastDir — напрям попереднього стрибка: назад повертати не можна)
function jumps(b, i, lastDir) {
  const p = b[i], out = [], r0 = i >> 3, c0 = i & 7;
  dirsOf(p).forEach(([dr, dc], d) => {
    const dir = ORTHO.findIndex(([a, b2]) => a === dr && b2 === dc);
    if (lastDir !== undefined && lastDir !== null && ORTHO[lastDir][0] === -dr && ORTHO[lastDir][1] === -dc) return;
    if (!p.k) {
      const r1 = r0 + dr, c1 = c0 + dc, r2 = r0 + 2 * dr, c2 = c0 + 2 * dc;
      if (inside(r2, c2) && b[r1 * 8 + c1] && b[r1 * 8 + c1].c !== p.c && !b[r2 * 8 + c2]) out.push({ i, j: r2 * 8 + c2, x: r1 * 8 + c1, dir });
      return;
    }
    let r = r0 + dr, c = c0 + dc, victim = -1;
    while (inside(r, c)) {
      const q = b[r * 8 + c];
      if (q) { if (q.c === p.c || victim >= 0) break; victim = r * 8 + c; }
      else if (victim >= 0) out.push({ i, j: r * 8 + c, x: victim, dir });
      r += dr; c += dc;
    }
  });
  return out;
}
const afterJump = (b, m) => { const nb = b.slice(); nb[m.j] = nb[m.i]; nb[m.i] = null; nb[m.x] = null; return nb; };
// Скільки ще шашок можна збити, продовжуючи з клітинки i
function best(b, i, lastDir) {
  let mx = 0;
  for (const m of jumps(b, i, lastDir)) mx = Math.max(mx, 1 + best(afterJump(b, m), m.j, m.dir));
  return mx;
}

export function createRules() {
  function initial() {
    const b = Array(64).fill(null);
    for (let i = 8; i < 24; i++) b[i] = { c: 'b', k: false };
    for (let i = 40; i < 56; i++) b[i] = { c: 'w', k: false };
    return { b, t: 'w', chain: null, dir: null, cap: { w: 0, b: 0 } };
  }
  const withNames = m => ({ ...m, from: N(m.i), to: N(m.j), capture: m.x !== undefined });

  function moves(s) {
    if (s.chain !== null) { // посеред взяття: лише продовження, що б'ють найбільше
      const list = jumps(s.b, s.chain, s.dir).map(m => ({ m, v: 1 + best(afterJump(s.b, m), m.j, m.dir) }));
      const mx = Math.max(...list.map(x => x.v));
      return list.filter(x => x.v === mx).map(x => withNames(x.m));
    }
    let caps = [], mx = 0;
    for (let i = 0; i < 64; i++) if (s.b[i] && s.b[i].c === s.t) for (const m of jumps(s.b, i, null)) {
      const v = 1 + best(afterJump(s.b, m), m.j, m.dir);
      if (v > mx) { mx = v; caps = [m]; } else if (v === mx) caps.push(m);
    }
    if (caps.length) return caps.map(withNames);
    const plain = [];
    for (let i = 0; i < 64; i++) if (s.b[i] && s.b[i].c === s.t) {
      const p = s.b[i], r0 = i >> 3, c0 = i & 7;
      for (const [dr, dc] of dirsOf(p)) {
        let r = r0 + dr, c = c0 + dc;
        while (inside(r, c) && !s.b[r * 8 + c]) { plain.push({ i, j: r * 8 + c }); if (!p.k) break; r += dr; c += dc; }
      }
    }
    return plain.map(withNames);
  }

  function play(s, m) {
    const b = m.x !== undefined ? afterJump(s.b, m) : (() => { const nb = s.b.slice(); nb[m.j] = nb[m.i]; nb[m.i] = null; return nb; })();
    b[m.j] = { ...b[m.j] };
    const cap = { ...s.cap };
    if (m.x !== undefined) {
      cap[s.t]++;
      if (jumps(b, m.j, m.dir).length) return { b, t: s.t, chain: m.j, dir: m.dir, cap };
    }
    if ((m.j >> 3) === LAST[b[m.j].c]) b[m.j].k = true; // дамкою — наприкінці ходу
    return { b, t: other(s.t), chain: null, dir: null, cap };
  }

  function result(s) {
    if (moves(s).length) return null;
    return { winner: other(s.t), text: s.t === 'w' ? 'У тебе не лишилося ходів.' : 'У робота не лишилося ходів. Чудова партія!' };
  }

  function evaluate(s, side) {
    let v = 0;
    for (let i = 0; i < 64; i++) {
      const p = s.b[i]; if (!p) continue;
      const adv = p.c === 'w' ? 6 - (i >> 3) : (i >> 3) - 1;
      const x = p.k ? 350 : 100 + adv * 6;
      v += p.c === side ? x : -x;
    }
    return v;
  }

  return {
    initial, moves, play, result, evaluate,
    turn: s => s.t,
    midTurn: s => s.chain !== null,
    key: s => s.b.map(p => (p ? p.c + (p.k ? 'K' : 'm') : '.')).join('') + s.t + (s.chain ?? '') + (s.dir ?? ''),
    pieces: s => { const m = new Map(); s.b.forEach((p, i) => p && m.set(N(i), { role: p.k ? 'dame' : 'man', color: p.c === 'w' ? 'white' : 'black' })); return m; },
    captured: s => ({ w: Array(s.cap.w).fill('man'), b: Array(s.cap.b).fill('man') }),
    moveOrder: (s, m) => (m.capture ? 10 : 0),
    aiDepth: [3, 4, 5]
  };
}
