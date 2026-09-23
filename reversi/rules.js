/* Реверсі (Отелло): постав фішку так, щоб затиснути фішки суперника між своїми — вони перевертаються.
   'w' — чорні фішки (ходять першими, як у класичних правилах), 'b' — білі.
   Немає ходу — хід переходить до суперника; немає ходів ні в кого — рахуємо фішки. */
const other = s => (s === 'w' ? 'b' : 'w');
const DIRS = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
// Ваги клітинок: кути дуже цінні, клітинки поруч із кутами — небезпечні
const W = [
  100, -20, 10, 5, 5, 10, -20, 100,
  -20, -50, -2, -2, -2, -2, -50, -20,
  10, -2, 1, 1, 1, 1, -2, 10,
  5, -2, 1, 0, 0, 1, -2, 5,
  5, -2, 1, 0, 0, 1, -2, 5,
  10, -2, 1, 1, 1, 1, -2, 10,
  -20, -50, -2, -2, -2, -2, -50, -20,
  100, -20, 10, 5, 5, 10, -20, 100
];

function flips(b, i, t) {
  if (b[i]) return [];
  const r = i >> 3, c = i & 7, o = other(t), out = [];
  for (const [dr, dc] of DIRS) {
    const line = [];
    let rr = r + dr, cc = c + dc;
    while (rr >= 0 && rr < 8 && cc >= 0 && cc < 8 && b[rr * 8 + cc] === o) { line.push(rr * 8 + cc); rr += dr; cc += dc; }
    if (line.length && rr >= 0 && rr < 8 && cc >= 0 && cc < 8 && b[rr * 8 + cc] === t) out.push(...line);
  }
  return out;
}
const legal = (b, t) => { const out = []; for (let i = 0; i < 64; i++) if (!b[i] && flips(b, i, t).length) out.push(i); return out; };
const count = (b, t) => b.reduce((n, x) => n + (x === t), 0);

export function createRules() {
  const movesOf = s => (s.mv || (s.mv = legal(s.b, s.t)));
  const over = s => !movesOf(s).length; // після play хід переходить лише тому, хто може ходити
  return {
    initial: () => {
      const b = Array(64).fill(null);
      b[27] = 'b'; b[36] = 'b'; b[28] = 'w'; b[35] = 'w';
      return { b, t: 'w', last: -1, flipped: [] };
    },
    turn: s => s.t,
    moves: s => movesOf(s).map(i => ({ id: i, i })),
    play: (s, m) => {
      const b = s.b.slice(), f = flips(b, m.i, s.t);
      b[m.i] = s.t; for (const j of f) b[j] = s.t;
      let t = other(s.t);
      if (!legal(b, t).length && legal(b, s.t).length) t = s.t; // суперник пропускає хід
      return { b, t, last: m.i, flipped: f };
    },
    result: s => {
      if (!over(s)) return null;
      const w = count(s.b, 'w'), bl = count(s.b, 'b');
      if (w === bl) return { winner: 'draw', text: `Порівну: ${w} на ${bl}.` };
      return { winner: w > bl ? 'w' : 'b', text: `Рахунок ${Math.max(w, bl)} : ${Math.min(w, bl)}` };
    },
    evaluate: (s, side) => {
      let v = 0;
      for (let i = 0; i < 64; i++) if (s.b[i]) v += s.b[i] === side ? W[i] : -W[i];
      const mine = legal(s.b, side).length, theirs = legal(s.b, other(side)).length;
      return v + 4 * (mine - theirs);
    },
    moveOrder: (s, m) => W[m.i],
    score: s => ({ w: `<span class="rv-sc"><i class="rv-disc w"></i>${count(s.b, 'w')}</span>`, b: `<span class="rv-sc"><i class="rv-disc b"></i>${count(s.b, 'b')}</span>` }),
    key: s => s.b.map(v => v || '.').join('') + s.t,
    aiDepth: [3, 4, 3]
  };
}
