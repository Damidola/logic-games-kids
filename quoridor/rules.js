/* Коридор (Quoridor). Кожен веде свою фішку на протилежний край поля.
   Хід — або крок фішкою (можна перестрибнути суперника), або стінка довжиною 2 клітинки.
   Стінкою не можна повністю закрити шлях жодному гравцю. 'w' — знизу (йде вгору), 'b' — згори. */
const other = s => (s === 'w' ? 'b' : 'w');
export const SIZES = { 5: 5, 7: 8, 9: 10 }; // поле → стінок у кожного

// Стінки зберігаються за «перехрестям» (r, c), 0..n-2: горизонтальна — між рядами r і r+1 на стовпчиках c, c+1;
// вертикальна — між стовпчиками c і c+1 на рядах r, r+1
const at = (arr, n, r, c) => r >= 0 && c >= 0 && r < n - 1 && c < n - 1 && arr[r * (n - 1) + c];
function blocked(s, r, c, dr, dc) {
  const n = s.n;
  if (dr === 1) return at(s.hw, n, r, c) || at(s.hw, n, r, c - 1);
  if (dr === -1) return at(s.hw, n, r - 1, c) || at(s.hw, n, r - 1, c - 1);
  if (dc === 1) return at(s.vw, n, r, c) || at(s.vw, n, r - 1, c);
  return at(s.vw, n, r, c - 1) || at(s.vw, n, r - 1, c - 1);
}
const DIRS = [[-1, 0], [1, 0], [0, -1], [0, 1]];
const goalRow = (n, side) => (side === 'w' ? 0 : n - 1);

// Найкоротший шлях до своєї лінії (без урахування фішок) і сам шлях — для робота
function path(s, side) {
  const n = s.n, start = s.p[side], goal = goalRow(n, side), prev = new Int16Array(n * n).fill(-1);
  const q = [start]; prev[start] = start;
  for (let h = 0; h < q.length; h++) {
    const i = q[h], r = Math.floor(i / n), c = i % n;
    if (r === goal) { const out = [i]; let j = i; while (j !== start) { j = prev[j]; out.push(j); } return out.reverse(); }
    for (const [dr, dc] of DIRS) {
      const rr = r + dr, cc = c + dc;
      if (rr < 0 || rr >= n || cc < 0 || cc >= n || blocked(s, r, c, dr, dc)) continue;
      const j = rr * n + cc; if (prev[j] !== -1) continue;
      prev[j] = i; q.push(j);
    }
  }
  return null;
}
const dist = (s, side) => { const p = path(s, side); return p ? p.length - 1 : 99; };

function pawnMoves(s) {
  const n = s.n, me = s.p[s.t], op = s.p[other(s.t)], r = Math.floor(me / n), c = me % n, out = new Set();
  for (const [dr, dc] of DIRS) {
    const rr = r + dr, cc = c + dc;
    if (rr < 0 || rr >= n || cc < 0 || cc >= n || blocked(s, r, c, dr, dc)) continue;
    const j = rr * n + cc;
    if (j !== op) { out.add(j); continue; }
    // Суперник поруч: стрибок через нього, а якщо за ним стіна чи край — убік від нього
    const r2 = rr + dr, c2 = cc + dc;
    if (r2 >= 0 && r2 < n && c2 >= 0 && c2 < n && !blocked(s, rr, cc, dr, dc)) out.add(r2 * n + c2);
    else for (const [er, ec] of dr ? [[0, -1], [0, 1]] : [[-1, 0], [1, 0]]) {
      const r3 = rr + er, c3 = cc + ec;
      if (r3 >= 0 && r3 < n && c3 >= 0 && c3 < n && !blocked(s, rr, cc, er, ec)) out.add(r3 * n + c3);
    }
  }
  return [...out].map(to => ({ id: 'm' + to, kind: 'm', to }));
}

function wallFits(s, kind, r, c) {
  const n = s.n, own = kind === 'h' ? s.hw : s.vw, cross = kind === 'h' ? s.vw : s.hw;
  if (at(own, n, r, c) || at(cross, n, r, c)) return false;
  if (kind === 'h' ? at(own, n, r, c - 1) || at(own, n, r, c + 1) : at(own, n, r - 1, c) || at(own, n, r + 1, c)) return false;
  return true;
}
function withWall(s, kind, r, c) {
  const k = r * (s.n - 1) + c, hw = s.hw, vw = s.vw;
  return kind === 'h' ? { ...s, hw: Object.assign(hw.slice(), { [k]: 1 }) } : { ...s, vw: Object.assign(vw.slice(), { [k]: 1 }) };
}
// Чи можна поставити стінку: є в запасі, не накладається і не закриває шлях жодному гравцю
export function wallLegal(s, kind, r, c) {
  if (!s.walls[s.t] || r < 0 || c < 0 || r > s.n - 2 || c > s.n - 2 || !wallFits(s, kind, r, c)) return false;
  const t = withWall(s, kind, r, c);
  return !!path(t, 'w') && !!path(t, 'b');
}
const wallMove = (kind, r, c) => ({ id: `${kind}${r}:${c}`, kind, r, c });

export function createRules(opts = {}) {
  const size = () => { const n = Number(opts.size ? opts.size() : 9); return SIZES[n] ? n : 9; };
  const allWalls = s => {
    const out = [];
    if (!s.walls[s.t]) return out;
    for (let r = 0; r < s.n - 1; r++) for (let c = 0; c < s.n - 1; c++) for (const k of ['h', 'v']) if (wallLegal(s, k, r, c)) out.push(wallMove(k, r, c));
    return out;
  };
  return {
    initial: () => {
      const n = size(), mid = Math.floor(n / 2), W = SIZES[n];
      return { n, p: { w: (n - 1) * n + mid, b: mid }, walls: { w: W, b: W }, hw: new Array((n - 1) ** 2).fill(0), vw: new Array((n - 1) ** 2).fill(0), t: 'w', last: null };
    },
    turn: s => s.t,
    moves: s => [...pawnMoves(s), ...allWalls(s)],
    // Робот: кроки фішкою і лише стінки, що перегороджують найкоротший шлях суперника
    searchMoves: s => {
      const out = pawnMoves(s);
      if (!s.walls[s.t]) return out;
      const n = s.n, p = path(s, other(s.t)), seen = new Set();
      if (p) for (let k = 0; k + 1 < p.length && k < 4; k++) {
        const a = p[k], b = p[k + 1], ra = Math.floor(a / n), ca = a % n, rb = Math.floor(b / n), cb = b % n;
        const cand = ra !== rb ? [['h', Math.min(ra, rb), ca], ['h', Math.min(ra, rb), ca - 1]] : [['v', ra, Math.min(ca, cb)], ['v', ra - 1, Math.min(ca, cb)]];
        for (const [kind, r, c] of cand) { const id = kind + r + ':' + c; if (!seen.has(id) && wallLegal(s, kind, r, c)) { seen.add(id); out.push(wallMove(kind, r, c)); } }
      }
      return out;
    },
    play: (s, m) => {
      let t;
      if (m.kind === 'm') t = { ...s, p: { ...s.p, [s.t]: m.to } };
      else t = { ...withWall(s, m.kind, m.r, m.c), walls: { ...s.walls, [s.t]: s.walls[s.t] - 1 } };
      t.last = m; t.t = other(s.t);
      return t;
    },
    result: s => {
      for (const side of ['w', 'b']) if (Math.floor(s.p[side] / s.n) === goalRow(s.n, side)) return { winner: side, text: 'Фішка дійшла до протилежного краю!' };
      return null;
    },
    evaluate: (s, side) => {
      const me = dist(s, side), op = dist(s, other(side));
      return 10 * (op - me) + 2 * (s.walls[side] - s.walls[other(side)]) + (s.t === side ? 5 : -5);
    },
    moveOrder: (s, m) => (m.kind === 'm' ? 5 : 0),
    score: s => ({ w: `<span class="qr-sc w"><i></i>🧱 × ${s.walls.w}</span>`, b: `<span class="qr-sc b"><i></i>🧱 × ${s.walls.b}</span>` }),
    key: s => s.p.w + ',' + s.p.b + s.hw.join('') + s.vw.join('') + s.t,
    aiDepth: [2, 3, 2]
  };
}
