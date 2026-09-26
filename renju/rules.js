/* Рендзю (гомоку): камені ставлять на перетини ліній. Хто першим складе п'ять своїх каменів
   у ряд — по горизонталі, вертикалі чи діагоналі — виграв. Чорні (w у каркасі) ходять першими.
   Спрощено для дітей: без заборонених ходів для чорних. Поле 8×8, 10×10 або 15×15. */
export const SIZES = [8, 10, 15];
const K = 5;
const other = s => (s === 'w' ? 'b' : 'w');
const DIRS = [[0, 1], [1, 0], [1, 1], [1, -1]];

const geoCache = {};
function geo(n) {
  if (geoCache[n]) return geoCache[n];
  const lines = [], through = Array.from({ length: n * n }, () => []);
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) for (const [dr, dc] of DIRS) {
    const er = r + (K - 1) * dr, ec = c + (K - 1) * dc;
    if (er < 0 || er >= n || ec < 0 || ec >= n) continue;
    const line = Array.from({ length: K }, (_, i) => (r + i * dr) * n + c + i * dc);
    line.forEach(i => through[i].push(lines.length));
    lines.push(line);
  }
  const near = Array.from({ length: n * n }, (_, i) => {
    const r = Math.floor(i / n), c = i % n, out = [];
    for (let dr = -2; dr <= 2; dr++) for (let dc = -2; dc <= 2; dc++) {
      const rr = r + dr, cc = c + dc;
      if ((dr || dc) && rr >= 0 && rr < n && cc >= 0 && cc < n) out.push(rr * n + cc);
    }
    return out;
  });
  return (geoCache[n] = { lines, through, near });
}
// Ваги «вікон» по п'ять: скільки моїх каменів там, де немає чужих
const MINE = [0, 1, 10, 80, 900, 1e5], THEIRS = [0, 1, 12, 110, 1200, 1e5];

export function createRules(opts = {}) {
  const size = () => { const n = Number(opts.size ? opts.size() : 15); return SIZES.includes(n) ? n : 15; };
  const moves = s => (s.win ? [] : s.b.map((v, i) => (v ? null : { id: i, i })).filter(Boolean));
  const heat = (s, i, side) => { // наскільки клітинка важлива для side і для суперника
    const { lines, through } = geo(s.n); let v = 0;
    for (const li of through[i]) {
      let mine = 0, theirs = 0;
      for (const j of lines[li]) { const x = s.b[j]; if (x === side) mine++; else if (x) theirs++; }
      if (!theirs) v += MINE[mine + 1]; if (!mine) v += THEIRS[theirs + 1] * 0.8;
    }
    return v;
  };
  return {
    initial: () => { const n = size(); return { n, b: Array(n * n).fill(null), t: 'w', win: null, filled: 0, last: null }; },
    turn: s => s.t,
    moves,
    // Робот дивиться лише на найгарячіші клітинки поруч із каменями
    searchMoves: s => {
      if (s.win) return [];
      if (!s.filled) { const c = Math.floor((s.n - 1) / 2) * s.n + Math.floor((s.n - 1) / 2); return [{ id: c, i: c }]; }
      const { near } = geo(s.n), seen = new Set();
      s.b.forEach((v, i) => { if (v) for (const j of near[i]) if (!s.b[j]) seen.add(j); });
      return [...seen].map(i => ({ id: i, i, h: heat(s, i, s.t) })).sort((a, b) => b.h - a.h).slice(0, 10);
    },
    play: (s, m) => {
      const b = s.b.slice(); b[m.i] = s.t;
      const { lines, through } = geo(s.n);
      const win = through[m.i].map(li => lines[li]).find(l => l.every(i => b[i] === s.t)) || null;
      return { n: s.n, b, t: other(s.t), win, filled: s.filled + 1, last: m.i };
    },
    result: s => {
      if (s.win) return { winner: s.b[s.win[0]], line: s.win, text: 'П’ять у ряд!' };
      if (s.filled === s.n * s.n) return { winner: 'draw', text: 'Поле заповнене, а п’ятірки немає.' };
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
    moveOrder: (s, m) => heat(s, m.i, s.t),
    key: s => s.b.map(v => v || '.').join('') + s.t,
    aiDepth: [3, 4, 3]
  };
}
