/* «Чешки» — шахи з кружечками, трикутниками й квадратами (правила як були в грі).
   ● Кружечок: 1–2 клітинки в будь-якому напрямку, б'є рівно на 2.
   ▲ Трикутник: по діагоналі до 3 клітинок, б'є рівно на 3.
   ■ Квадрат: по прямій до 4 клітинок, б'є рівно на 4 (при взятті перестрибує все).
   ♔ Король: на 1 клітинку; під шахом може перестрибнути свою сусідню фігуру.
   Перші два ходи партії — фігури не далі ніж на 2 клітинки.
   Виграє мат або король у своєму кутку (білий — h8, чорний — a1). */
import { squareName as N } from '../shared/board.js';

const RANGE = { square: 4, triangle: 3, circle: 2, king: 1 };
const VALUE = { circle: 300, triangle: 400, square: 500, king: 0 };
const other = c => (c === 'white' ? 'black' : 'white');
const inside = (r, c) => r >= 0 && r < 8 && c >= 0 && c < 8;
const TARGET = { white: 7, black: 56 }; // h8, a1

function attacked(b, row, col, by) {
  for (let i = 0; i < 64; i++) {
    const p = b[i]; if (!p || p.c !== by) continue;
    const dr = Math.abs((i >> 3) - row), dc = Math.abs((i & 7) - col), R = RANGE[p.t];
    if (p.t === 'square' && ((dr === R && !dc) || (!dr && dc === R))) return true;
    if (p.t === 'triangle' && dr === R && dc === R) return true;
    if (p.t === 'circle' && ((dr === 2 && !dc) || (!dr && dc === 2) || (dr === 2 && dc === 2))) return true;
    if (p.t === 'king' && Math.max(dr, dc) === 1) return true;
  }
  return false;
}
const kingOf = (b, c) => b.findIndex(p => p && p.t === 'king' && p.c === c);
const inCheck = (b, c) => { const k = kingOf(b, c); return k >= 0 && attacked(b, k >> 3, k & 7, other(c)); };

function pseudo(b, i, ply) {
  const p = b[i], out = [], row = i >> 3, col = i & 7, opp = other(p.c);
  const maxMove = ply < 2 && p.t !== 'king' ? 2 : RANGE[p.t];
  const empty = (r, c) => inside(r, c) && !b[r * 8 + c];
  const capture = (r, c) => { if (inside(r, c) && b[r * 8 + c] && b[r * 8 + c].c === opp) out.push(r * 8 + c); };
  const slide = dirs => {
    for (const [dr, dc] of dirs) for (let k = 1; k <= maxMove; k++) {
      const r = row + k * dr, c = col + k * dc;
      if (!empty(r, c)) break;
      out.push(r * 8 + c);
    }
  };
  if (p.t === 'square') {
    const d = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    slide(d); d.forEach(([dr, dc]) => capture(row + 4 * dr, col + 4 * dc));
  } else if (p.t === 'triangle') {
    const d = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
    slide(d); d.forEach(([dr, dc]) => capture(row + 3 * dr, col + 3 * dc));
  } else if (p.t === 'circle') {
    const d = []; for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) if (dr || dc) d.push([dr, dc]);
    slide(d); d.forEach(([dr, dc]) => capture(row + 2 * dr, col + 2 * dc));
  } else {
    const check = attacked(b, row, col, opp);
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      if (!dr && !dc) continue;
      const r = row + dr, c = col + dc;
      if (!inside(r, c)) continue;
      const q = b[r * 8 + c];
      if ((!q || q.c === opp) && !attacked(b, r, c, opp)) out.push(r * 8 + c);
      // Рятівний стрибок через свою фігуру, коли королю шах
      const r2 = row + 2 * dr, c2 = col + 2 * dc;
      if (check && q && q.c === p.c && empty(r2, c2) && !attacked(b, r2, c2, opp)) out.push(r2 * 8 + c2);
    }
  }
  return out;
}

export function createRules() {
  function moves(s) {
    const out = [];
    for (let i = 0; i < 64; i++) {
      const p = s.b[i]; if (!p || p.c !== s.t) continue;
      for (const j of pseudo(s.b, i, s.ply)) {
        const b = s.b.slice(); b[j] = b[i]; b[i] = null;
        if (inCheck(b, p.c)) continue; // не можна лишати свого короля під шахом
        out.push({ i, j, from: N(i), to: N(j), capture: !!s.b[j], gain: s.b[j] ? VALUE[s.b[j].t] : 0 });
      }
    }
    return out;
  }
  function play(s, m) {
    const b = s.b.slice(), cap = { white: [...s.cap.white], black: [...s.cap.black] };
    if (b[m.j]) cap[s.t].push(b[m.j].t);
    b[m.j] = b[m.i]; b[m.i] = null;
    return { b, t: other(s.t), ply: s.ply + 1, cap };
  }
  function result(s) {
    if (s.b[TARGET.white]?.t === 'king' && s.b[TARGET.white].c === 'white') return { winner: 'w', text: 'Білий король дійшов до жовтого кута!' };
    if (s.b[TARGET.black]?.t === 'king' && s.b[TARGET.black].c === 'black') return { winner: 'b', text: 'Чорний король дійшов до свого кута.' };
    if (moves(s).length) return null;
    if (inCheck(s.b, s.t)) return { winner: s.t === 'white' ? 'b' : 'w', text: 'Мат!' };
    return { winner: 'draw', text: 'Пат: ходити нікуди, але й шаху немає.' };
  }
  function evaluate(s, side) {
    const me = side === 'w' ? 'white' : 'black';
    let v = 0;
    for (let i = 0; i < 64; i++) {
      const p = s.b[i]; if (!p) continue;
      let x = VALUE[p.t];
      if (p.t === 'king') { const t = TARGET[p.c]; x += (7 - Math.max(Math.abs((i >> 3) - (t >> 3)), Math.abs((i & 7) - (t & 7)))) * 25; }
      v += p.c === me ? x : -x;
    }
    if (inCheck(s.b, s.t)) v += (s.t === me ? -40 : 40);
    return v;
  }
  function initial() {
    const b = Array(64).fill(null), put = (r, c, color, t) => { b[r * 8 + c] = { c: color, t }; };
    put(7, 0, 'white', 'king'); put(6, 0, 'white', 'circle'); put(7, 1, 'white', 'circle');
    put(5, 0, 'white', 'triangle'); put(6, 1, 'white', 'triangle'); put(7, 2, 'white', 'triangle');
    put(4, 0, 'white', 'square'); put(5, 1, 'white', 'square'); put(6, 2, 'white', 'square'); put(7, 3, 'white', 'square');
    put(0, 7, 'black', 'king'); put(1, 7, 'black', 'circle'); put(0, 6, 'black', 'circle');
    put(2, 7, 'black', 'triangle'); put(1, 6, 'black', 'triangle'); put(0, 5, 'black', 'triangle');
    put(3, 7, 'black', 'square'); put(2, 6, 'black', 'square'); put(1, 5, 'black', 'square'); put(0, 4, 'black', 'square');
    return { b, t: 'white', ply: 0, cap: { white: [], black: [] } };
  }
  return {
    initial, moves, play, result, evaluate,
    turn: s => (s.t === 'white' ? 'w' : 'b'),
    check: s => (inCheck(s.b, s.t) ? s.t : false),
    key: s => s.b.map(p => (p ? p.c[0] + p.t[0] : '..')).join('') + s.t + (s.ply < 2 ? s.ply : ''),
    pieces: s => { const m = new Map(); s.b.forEach((p, i) => p && m.set(N(i), { role: p.t, color: p.c })); return m; },
    captured: s => ({ w: s.cap.white, b: s.cap.black }),
    marks: () => new Map([[N(TARGET.white), 'mark-gold'], [N(TARGET.black), 'mark-red']]),
    moveOrder: (s, m) => m.gain,
    aiDepth: [2, 3, 4]
  };
}
