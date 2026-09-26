/* Блокус (Blokus Duo): поле 14×14, у кожного 21 фігурка з квадратиків.
   Перша фігурка накриває свою стартову клітинку. Далі кожна нова фігурка торкається своїх
   лише кутиком — і ніколи боком. Хто не може поставити фігурку — пропускає хід.
   Коли не може ніхто — перемагає той, у кого лишилося менше квадратиків. Білі = фіолетові (дитина). */
export const N = 14;
export const START = { w: 4 * N + 4, b: 9 * N + 9 };
const other = s => (s === 'w' ? 'b' : 'w');

// 21 фігурка: клітинки [рядок, стовпчик]
const BASE = [
  [[0, 0]],
  [[0, 0], [0, 1]],
  [[0, 0], [0, 1], [0, 2]], [[0, 0], [1, 0], [1, 1]],
  [[0, 0], [0, 1], [0, 2], [0, 3]], [[0, 0], [1, 0], [2, 0], [2, 1]], [[0, 0], [0, 1], [0, 2], [1, 1]],
  [[0, 1], [0, 2], [1, 0], [1, 1]], [[0, 0], [0, 1], [1, 0], [1, 1]],
  [[0, 1], [0, 2], [1, 0], [1, 1], [2, 1]], [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4]],
  [[0, 0], [1, 0], [2, 0], [3, 0], [3, 1]], [[0, 1], [1, 1], [2, 0], [2, 1], [3, 0]],
  [[0, 0], [0, 1], [1, 0], [1, 1], [2, 0]], [[0, 0], [0, 1], [0, 2], [1, 1], [2, 1]],
  [[0, 0], [0, 2], [1, 0], [1, 1], [1, 2]], [[0, 0], [1, 0], [2, 0], [2, 1], [2, 2]],
  [[0, 0], [1, 0], [1, 1], [2, 1], [2, 2]], [[0, 1], [1, 0], [1, 1], [1, 2], [2, 1]],
  [[0, 1], [1, 0], [1, 1], [2, 1], [3, 1]], [[0, 0], [0, 1], [1, 1], [2, 1], [2, 2]]
];
export const PIECES = BASE;
const norm = cells => {
  const r0 = Math.min(...cells.map(x => x[0])), c0 = Math.min(...cells.map(x => x[1]));
  return cells.map(([r, c]) => [r - r0, c - c0]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
};
const keyOf = cells => cells.map(x => x.join(',')).join(';');
// Поворот за годинниковою стрілкою rot разів, дзеркало — до повороту
export function transform(p, rot, flip) {
  let cells = BASE[p].map(([r, c]) => (flip ? [r, -c] : [r, c]));
  for (let k = 0; k < rot; k++) cells = cells.map(([r, c]) => [c, -r]);
  return norm(cells);
}
// Усі різні положення кожної фігурки
export const ORIENTS = BASE.map((_, p) => {
  const seen = new Map();
  for (const flip of [0, 1]) for (let rot = 0; rot < 4; rot++) {
    const cells = transform(p, rot, flip), k = keyOf(cells);
    if (!seen.has(k)) seen.set(k, cells);
  }
  return [...seen.values()];
});
export const orientIndex = (p, cells) => ORIENTS[p].findIndex(o => keyOf(o) === keyOf(cells));
export const SIZE = BASE.map(c => c.length);
const TOTAL = SIZE.reduce((a, b) => a + b, 0); // 89

const NB = i => { const r = Math.floor(i / N), c = i % N, a = []; if (r > 0) a.push(i - N); if (r < N - 1) a.push(i + N); if (c > 0) a.push(i - 1); if (c < N - 1) a.push(i + 1); return a; };
const DG = i => { const r = Math.floor(i / N), c = i % N, a = []; for (const [dr, dc] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) { const rr = r + dr, cc = c + dc; if (rr >= 0 && rr < N && cc >= 0 && cc < N) a.push(rr * N + cc); } return a; };
const NBS = Array.from({ length: N * N }, (_, i) => NB(i)), DGS = Array.from({ length: N * N }, (_, i) => DG(i));

// Куди не можна ставити: зайнято, або поруч боком зі своєю фігуркою
function blocked(b, side) {
  const x = new Uint8Array(N * N);
  for (let i = 0; i < N * N; i++) if (b[i]) { x[i] = 1; if (b[i] === side) for (const j of NBS[i]) x[j] = 1; }
  return x;
}
// Кутики, від яких можна почати нову фігурку
export function anchors(b, side, hand) {
  if (hand.every(Boolean)) return b[START[side]] ? [] : [START[side]];
  const x = blocked(b, side), res = [];
  for (let i = 0; i < N * N; i++) if (!x[i] && DGS[i].some(j => b[j] === side)) res.push(i);
  return res;
}

const cache = new WeakMap();
// Усі ходи сторони side; stopFirst — лише чи є хоч один
function gen(s, side, stopFirst) {
  const hand = s.hand[side];
  const an = anchors(s.b, side, hand);
  if (!an.length) return [];
  const x = blocked(s.b, side), seen = new Set(), out = [];
  for (let p = 20; p >= 0; p--) {
    if (!hand[p]) continue;
    ORIENTS[p].forEach((cells, o) => {
      for (const a of an) {
        const ar = Math.floor(a / N), ac = a % N;
        for (const [kr, kc] of cells) {
          const r0 = ar - kr, c0 = ac - kc, id = `${p}.${o}.${r0}.${c0}`;
          if (seen.has(id)) continue;
          seen.add(id);
          let ok = true; const idx = [];
          for (const [r, c] of cells) {
            const rr = r0 + r, cc = c0 + c;
            if (rr < 0 || rr >= N || cc < 0 || cc >= N || x[rr * N + cc]) { ok = false; break; }
            idx.push(rr * N + cc);
          }
          if (!ok) continue;
          out.push({ id, p, o, r: r0, c: c0, cells: idx });
          if (stopFirst) return;
        }
      }
    });
    if (stopFirst && out.length) return out;
  }
  return out;
}
function movesOf(s, side) {
  let m = cache.get(s); if (!m) cache.set(s, m = {});
  if (!m[side]) m[side] = gen(s, side, false);
  return m[side];
}
function canMove(s, side) {
  const m = cache.get(s);
  if (m && m[side]) return m[side].length > 0;
  return gen(s, side, true).length > 0;
}
const left = (s, side) => s.hand[side].reduce((a, h, p) => a + (h ? SIZE[p] : 0), 0);

export function createRules() {
  return {
    initial: () => ({ b: Array(N * N).fill(null), hand: { w: Array(21).fill(true), b: Array(21).fill(true) }, t: 'w', last: [] }),
    turn: s => s.t,
    moves: s => (s.done ? [] : movesOf(s, s.t)),
    play: (s, m) => {
      const b = s.b.slice(); for (const i of m.cells) b[i] = s.t;
      const hand = { ...s.hand, [s.t]: s.hand[s.t].slice() }; hand[s.t][m.p] = false;
      const n = { b, hand, t: other(s.t), last: m.cells };
      if (!canMove(n, n.t)) { // суперник пропускає хід
        if (canMove(n, s.t)) n.t = s.t; else n.done = true;
      }
      return n;
    },
    result: s => {
      if (!s.done) return null;
      const w = left(s, 'w'), bl = left(s, 'b');
      if (w === bl) return { winner: 'draw', text: `У обох лишилося по ${w} квадратиків.` };
      const winner = w < bl ? 'w' : 'b';
      return { winner, text: winner === 'w' ? `Ти поставив більше! Лишилось квадратиків: у тебе ${w}, у суперника ${bl}.` : `Лишилось квадратиків: у тебе ${w}, у суперника ${bl}. Шукай кутики раніше!` };
    },
    // Оцінка: скільки квадратиків поставлено й скільки вільних кутиків для наступних фігурок
    evaluate: (s, side) => {
      const o = other(side);
      const placed = (TOTAL - left(s, side)) - (TOTAL - left(s, o));
      return placed * 3 + anchors(s.b, side, s.hand[side]).length - anchors(s.b, o, s.hand[o]).length;
    },
    moveOrder: (s, m) => {
      const opp = new Set(anchors(s.b, other(s.t), s.hand[other(s.t)]));
      const mid = m.cells.reduce((a, i) => a - Math.abs(Math.floor(i / N) - 6.5) - Math.abs(i % N - 6.5), 0) / m.cells.length;
      return SIZE[m.p] * 10 + m.cells.filter(i => opp.has(i)).length * 4 + mid * 0.5 + Math.random();
    },
    // Для пошуку — лише найкращі кандидати (ходів буває кілька сотень)
    searchMoves(s) {
      const all = movesOf(s, s.t);
      if (all.length <= 10) return all;
      return all.map(m => ({ m, v: this.moveOrder(s, m) })).sort((a, b) => b.v - a.v).slice(0, 10).map(x => x.m);
    },
    score: s => ({ w: `<span class="bk-sc w"><i></i>${left(s, 'w')}</span>`, b: `<span class="bk-sc b"><i></i>${left(s, 'b')}</span>` }),
    key: s => s.b.map(v => v || '.').join('') + s.t,
    anchors: s => anchors(s.b, s.t, s.hand[s.t]),
    aiDepth: [2, 2, 2]
  };
}
