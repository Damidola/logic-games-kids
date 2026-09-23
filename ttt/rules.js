/* Хрестики-нулики на полі N×N: хто першим поставить K своїх знаків у ряд. X — білі (ходять першими), O — чорні.
   3×3 — три в ряд; 4×4 і 5×5 — чотири; 8×8 і 10×10 — п'ять (як «гомоку»). */
export const SIZES = { 3: 3, 4: 4, 5: 4, 8: 5, 10: 5 };
const other = s => (s === 'w' ? 'b' : 'w');
const DIRS = [[0, 1], [1, 0], [1, 1], [1, -1]];

// Усі лінії довжини K і для кожної клітинки — лінії, що через неї проходять
const geoCache = {};
export function geo(n) {
  if (geoCache[n]) return geoCache[n];
  const k = SIZES[n], lines = [], through = Array.from({ length: n * n }, () => []);
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) for (const [dr, dc] of DIRS) {
    const er = r + (k - 1) * dr, ec = c + (k - 1) * dc;
    if (er < 0 || er >= n || ec < 0 || ec >= n) continue;
    const line = Array.from({ length: k }, (_, i) => (r + i * dr) * n + c + i * dc);
    line.forEach(i => through[i].push(lines.length));
    lines.push(line);
  }
  // «Сусіди» для пошуку робота на великих полях: клітинки на відстані до 2
  const near = Array.from({ length: n * n }, (_, i) => {
    const r = Math.floor(i / n), c = i % n, out = [];
    for (let dr = -2; dr <= 2; dr++) for (let dc = -2; dc <= 2; dc++) {
      const rr = r + dr, cc = c + dc;
      if ((dr || dc) && rr >= 0 && rr < n && cc >= 0 && cc < n) out.push(rr * n + cc);
    }
    return out;
  });
  return (geoCache[n] = { k, lines, through, near });
}

// Ваги ліній: скільки знаків в лінії, де немає знаків суперника
const MINE = [0, 1, 8, 60, 500, 4000], THEIRS = [0, 1, 10, 80, 700, 5000];

export function createRules(opts = {}) {
  let curN = 3;
  const size = () => { const n = Number(opts.size ? opts.size() : 3); return SIZES[n] ? n : 3; };
  const moves = s => (s.win ? [] : s.b.map((v, i) => (v ? null : { id: i, i })).filter(Boolean));
  return {
    initial: () => { curN = size(); return { n: curN, b: Array(curN * curN).fill(null), t: 'w', win: null, filled: 0 }; },
    turn: s => s.t,
    moves,
    // Робот на великих полях дивиться лише на клітинки поруч зі знаками — так швидко й розумно
    searchMoves: s => {
      if (s.win || s.n <= 5) return moves(s);
      if (!s.filled) { const c = Math.floor(s.n / 2) * s.n + Math.floor(s.n / 2); return [{ id: c, i: c }]; }
      const { near } = geo(s.n), seen = new Set();
      s.b.forEach((v, i) => { if (v) for (const j of near[i]) if (!s.b[j]) seen.add(j); });
      return [...seen].map(i => ({ id: i, i }));
    },
    play: (s, m) => {
      const b = s.b.slice(); b[m.i] = s.t;
      const { lines, through } = geo(s.n);
      const win = through[m.i].map(li => lines[li]).find(l => l.every(i => b[i] === s.t)) || null;
      return { n: s.n, b, t: other(s.t), win, filled: s.filled + 1 };
    },
    result: s => {
      if (s.win) return { winner: s.b[s.win[0]], line: s.win, text: geo(s.n).k === 3 ? 'Три в ряд!' : geo(s.n).k + ' в ряд!' };
      if (s.filled === s.n * s.n) return { winner: 'draw', text: 'Ніхто не зібрав ряд. Це теж гарний результат!' };
      return null;
    },
    evaluate: (s, side) => {
      let v = 0;
      for (const l of geo(s.n).lines) {
        let mine = 0, theirs = 0;
        for (const i of l) { const x = s.b[i]; if (x === side) mine++; else if (x) theirs++; }
        if (!theirs) v += MINE[mine]; else if (!mine) v -= THEIRS[theirs];
      }
      return v;
    },
    // Спершу — клітинки, біля яких багато знаків (краще відсікання)
    moveOrder: (s, m) => {
      const { through, lines } = geo(s.n);
      let v = 0;
      for (const li of through[m.i]) for (const i of lines[li]) if (s.b[i]) v++;
      return v;
    },
    key: s => s.b.map(v => v || '.').join('') + s.t,
    line: s => s.win,
    get aiDepth() { return curN === 3 ? [3, 9, 9] : curN <= 5 ? [3, 5, 5] : [2, 3, 2]; }
  };
}
