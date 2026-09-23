/* Правила ходів для уроків (без шаху — лише як ходить фігура). */
(function (root) {
  'use strict';
  const FILES = 'abcdefgh';
  const sq = name => (8 - Number(name[1])) * 8 + FILES.indexOf(name[0]); // a8 = 0, h1 = 63
  const DIRS = {
    R: [[1, 0], [-1, 0], [0, 1], [0, -1]],
    B: [[1, 1], [1, -1], [-1, 1], [-1, -1]],
    N: [[1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]]
  };
  DIRS.Q = DIRS.R.concat(DIRS.B);
  DIRS.K = DIRS.Q;
  const inside = (r, c) => r >= 0 && r < 8 && c >= 0 && c < 8;

  // Розстановка з FEN: { white: Map(клітинка → фігура), black: Map }
  function parseFen(fen) {
    const white = new Map(), black = new Map();
    fen.split('/').forEach((row, r) => {
      let c = 0;
      for (const ch of row) {
        if (/\d/.test(ch)) { c += Number(ch); continue; }
        (ch === ch.toUpperCase() ? white : black).set(r * 8 + c, ch.toUpperCase());
        c++;
      }
    });
    return { white, black };
  }

  // Ходи білої фігури: own(i) — стоїть своя, enemy(i) — чорна (її можна збити)
  function moves(type, pos, own, enemy) {
    const r = Math.floor(pos / 8), c = pos % 8, out = [];
    if (type === 'P') {
      const f = pos - 8;
      if (r > 0 && !own(f) && !enemy(f)) {
        out.push(f);
        if (r === 6 && !own(f - 8) && !enemy(f - 8)) out.push(f - 8);
      }
      [c - 1, c + 1].forEach(cc => { if (r > 0 && cc >= 0 && cc < 8 && enemy((r - 1) * 8 + cc)) out.push((r - 1) * 8 + cc); });
      return out;
    }
    const slide = type === 'R' || type === 'B' || type === 'Q';
    for (const [dr, dc] of DIRS[type]) {
      let rr = r + dr, cc = c + dc;
      while (inside(rr, cc)) {
        const i = rr * 8 + cc;
        if (own(i)) break;
        out.push(i);
        if (enemy(i) || !slide) break;
        rr += dr; cc += dc;
      }
    }
    return out;
  }

  // Чи б'є якась чорна фігура клітинку target (occupied(i) — будь-яка фігура стоїть)
  function blackAttacks(black, target, occupied) {
    const tr = Math.floor(target / 8), tc = target % 8;
    for (const [pos, type] of black) {
      const r = Math.floor(pos / 8), c = pos % 8;
      if (type === 'P') { if (tr === r + 1 && Math.abs(tc - c) === 1) return pos; continue; }
      const slide = type === 'R' || type === 'B' || type === 'Q';
      for (const [dr, dc] of DIRS[type]) {
        let rr = r + dr, cc = c + dc;
        while (inside(rr, cc)) {
          const i = rr * 8 + cc;
          if (i === target) return pos;
          if (occupied(i) || !slide) break;
          rr += dr; cc += dc;
        }
      }
    }
    return -1;
  }

  root.LearnEngine = { sq, parseFen, moves, blackAttacks };
})(typeof window !== 'undefined' ? window : globalThis);
