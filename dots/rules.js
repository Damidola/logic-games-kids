/* Точки й квадратики: по черзі проводимо лінію між сусідніми точками.
   Хто замкнув квадратик — забирає його і ходить ще раз. Більше квадратиків — перемога. */
const other = s => (s === 'w' ? 'b' : 'w');

// Геометрія поля n×n квадратиків: лінії (спершу горизонтальні, потім вертикальні) і квадратики навколо них
const geoCache = {};
export function geo(n) {
  if (geoCache[n]) return geoCache[n];
  const H = (n + 1) * n, lines = [], boxSides = Array.from({ length: n * n }, () => []);
  for (let r = 0; r <= n; r++) for (let c = 0; c < n; c++) lines.push({ h: true, r, c });
  for (let r = 0; r < n; r++) for (let c = 0; c <= n; c++) lines.push({ h: false, r, c });
  const lineBoxes = lines.map(() => []);
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    const b = r * n + c;
    for (const e of [r * n + c, (r + 1) * n + c, H + r * (n + 1) + c, H + r * (n + 1) + c + 1]) { boxSides[b].push(e); lineBoxes[e].push(b); }
  }
  return (geoCache[n] = { n, lines, boxSides, lineBoxes });
}
const sides = (s, g, b) => g.boxSides[b].reduce((k, e) => k + (s.e[e] ? 1 : 0), 0);
const count = (s, t) => s.box.reduce((k, x) => k + (x === t), 0);

export function createRules(opts = {}) {
  const size = () => { const n = Number(opts.size ? opts.size() : 4); return [3, 4, 5].includes(n) ? n : 4; };
  return {
    initial: () => { const n = size(), g = geo(n); return { n, e: Array(g.lines.length).fill(null), box: Array(n * n).fill(null), t: 'w', last: -1 }; },
    turn: s => s.t,
    moves: s => s.e.map((x, i) => (x ? null : { id: i, i })).filter(Boolean),
    // Робот розглядає лише розумні лінії: замкнути квадратик; інакше — «безпечні»; інакше — усі
    searchMoves(s) {
      const g = geo(s.n), all = this.moves(s), third = m => g.lineBoxes[m.i].some(bx => sides(s, g, bx) === 2);
      const close = all.filter(m => g.lineBoxes[m.i].some(bx => sides(s, g, bx) === 3));
      if (close.length) return close;
      const safe = all.filter(m => !third(m));
      return safe.length ? safe : all;
    },
    play: (s, m) => {
      const g = geo(s.n), e = s.e.slice(), box = s.box.slice();
      e[m.i] = s.t;
      let closed = false;
      for (const b of g.lineBoxes[m.i]) if (g.boxSides[b].every(x => e[x])) { box[b] = s.t; closed = true; }
      return { n: s.n, e, box, t: closed ? s.t : other(s.t), last: m.i };
    },
    result: s => {
      if (s.e.some(x => !x)) return null;
      const w = count(s, 'w'), b = count(s, 'b');
      if (w === b) return { winner: 'draw', text: `Порівну: ${w} на ${b}.` };
      return { winner: w > b ? 'w' : 'b', text: `Квадратиків ${Math.max(w, b)} : ${Math.min(w, b)}` };
    },
    // Квадратики з трьома сторонами забере той, хто ходить
    evaluate: (s, side) => {
      const g = geo(s.n);
      let v = 10 * (count(s, side) - count(s, other(side))), open3 = 0;
      for (let b = 0; b < s.box.length; b++) if (!s.box[b] && sides(s, g, b) === 3) open3++;
      return v + (s.t === side ? 8 : -8) * open3;
    },
    // Спершу — замкнути квадратик, потім «безпечні» лінії, наостанок ті, що дають третю сторону
    moveOrder: (s, m) => {
      const g = geo(s.n);
      let v = 0;
      for (const b of g.lineBoxes[m.i]) { const k = sides(s, g, b); if (k === 3) v += 100; else if (k === 2) v -= 50; }
      return v;
    },
    score: s => ({ w: `<span class="db-sc w"><i></i>${count(s, 'w')}</span>`, b: `<span class="db-sc b"><i></i>${count(s, 'b')}</span>` }),
    key: s => s.e.map(x => (x ? 1 : 0)).join('') + s.t,
    get aiDepth() { return [2, 3, 2]; }
  };
}
