/* Чотири в ряд: кидай фішку в стовпчик — вона падає донизу. Хто першим збере
   чотири в ряд (по горизонталі, вертикалі чи діагоналі) — виграв. Білі = червоні (дитина). */
const R = 6, C = 7;
const other = s => (s === 'w' ? 'b' : 'w');
const DIRS = [[0, 1], [1, 0], [1, 1], [1, -1]];

function four(b) {
  for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
    const p = b[r * C + c]; if (!p) continue;
    for (const [dr, dc] of DIRS) {
      const cells = [0, 1, 2, 3].map(k => [r + k * dr, c + k * dc]);
      if (cells.every(([rr, cc]) => rr >= 0 && rr < R && cc >= 0 && cc < C && b[rr * C + cc] === p)) return cells.map(([rr, cc]) => rr * C + cc);
    }
  }
  return null;
}
// Оцінка «вікон» по 4 клітинки, як у класичних програмах для цієї гри
function windows(b, side) {
  let v = 0;
  for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) for (const [dr, dc] of DIRS) {
    const cells = [0, 1, 2, 3].map(k => [r + k * dr, c + k * dc]);
    if (!cells.every(([rr, cc]) => rr >= 0 && rr < R && cc >= 0 && cc < C)) continue;
    const vals = cells.map(([rr, cc]) => b[rr * C + cc]);
    const mine = vals.filter(x => x === side).length, theirs = vals.filter(x => x === other(side)).length;
    if (theirs === 0) v += [0, 1, 5, 40, 1000][mine];
    if (mine === 0) v -= [0, 1, 6, 50, 1000][theirs];
  }
  for (let r = 0; r < R; r++) { if (b[r * C + 3] === side) v += 4; else if (b[r * C + 3]) v -= 4; }
  return v;
}

export function createRules() {
  const top = (b, c) => { for (let r = R - 1; r >= 0; r--) if (!b[r * C + c]) return r; return -1; }; // рядок 0 — угорі
  return {
    initial: () => ({ b: Array(R * C).fill(null), t: 'w' }),
    turn: s => s.t,
    moves: s => (four(s.b) ? [] : [3, 2, 4, 1, 5, 0, 6].filter(c => top(s.b, c) >= 0).map(c => ({ id: c, c }))),
    play: (s, m) => { const b = s.b.slice(); const r = top(b, m.c); b[r * C + m.c] = s.t; return { b, t: other(s.t), last: r * C + m.c }; },
    result: s => {
      const f = four(s.b);
      if (f) return { winner: s.b[f[0]], text: s.b[f[0]] === 'w' ? 'Ти зібрав чотири в ряд!' : 'Робот зібрав четвірку. Подивись, де вона — наступного разу перекрий її раніше!' };
      if (s.b.every(Boolean)) return { winner: 'draw', text: 'Усе поле заповнене, а четвірки немає.' };
      return null;
    },
    evaluate: (s, side) => windows(s.b, side),
    key: s => s.b.map(v => v || '.').join('') + s.t,
    four: s => four(s.b),
    aiDepth: [3, 5, 7]
  };
}
