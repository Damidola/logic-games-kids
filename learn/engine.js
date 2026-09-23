/* Правила ходів для уроків (без шаху — лише як ходить фігура). */
(function (root) {
  'use strict';
  const FILES = 'abcdefgh';
  const sq = name => (8 - Number(name[1])) * 8 + FILES.indexOf(name[0]); // a8 = 0, h1 = 63
  const name = i => FILES[i % 8] + (8 - Math.floor(i / 8));
  const DIRS = {
    R: [[1, 0], [-1, 0], [0, 1], [0, -1]],
    B: [[1, 1], [1, -1], [-1, 1], [-1, -1]],
    N: [[1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]]
  };
  DIRS.Q = DIRS.R.concat(DIRS.B);
  DIRS.K = DIRS.Q;

  // Куди може піти фігура type з клітинки pos. blocked(i) — камінь, enemy(i) — чорна фігура.
  function moves(type, pos, blocked, enemy) {
    const r = Math.floor(pos / 8), c = pos % 8, out = [];
    const ok = (rr, cc) => rr >= 0 && rr < 8 && cc >= 0 && cc < 8;
    if (type === 'P') {
      const f = (r - 1) * 8 + c;
      if (r > 0 && !blocked(f) && !enemy(f)) {
        out.push(f);
        const f2 = (r - 2) * 8 + c;
        if (r === 6 && !blocked(f2) && !enemy(f2)) out.push(f2);
      }
      [c - 1, c + 1].forEach(cc => { if (r > 0 && cc >= 0 && cc < 8 && enemy((r - 1) * 8 + cc)) out.push((r - 1) * 8 + cc); });
      return out;
    }
    const slide = type === 'R' || type === 'B' || type === 'Q';
    for (const [dr, dc] of DIRS[type]) {
      let rr = r + dr, cc = c + dc;
      while (ok(rr, cc)) {
        const i = rr * 8 + cc;
        if (blocked(i)) break;
        out.push(i);
        if (enemy(i) || !slide) break;
        rr += dr; cc += dc;
      }
    }
    return out;
  }

  // Найменша кількість ходів, щоб зібрати всі зірочки й збити всі фігури (пошук у ширину).
  function solve(level, pieceType) {
    const stones = new Set((level.stones || []).map(sq));
    const stars = (level.stars || []).map(sq);
    const enemies = Object.keys(level.enemies || {}).map(sq);
    const targets = stars.concat(enemies), full = (1 << targets.length) - 1;
    const start = { pos: sq(level.from), type: pieceType, mask: 0 };
    const key = s => s.pos + s.type + s.mask;
    const seen = new Set([key(start)]);
    let frontier = [start];
    for (let d = 0; d <= 40; d++) {
      const next = [];
      for (const s of frontier) {
        if (s.mask === full) return d;
        const enemyAt = i => { const k = enemies.indexOf(i); return k >= 0 && !(s.mask & (1 << (stars.length + k))); };
        for (const t of moves(s.type, s.pos, i => stones.has(i), enemyAt)) {
          let mask = s.mask;
          const k = targets.indexOf(t);
          if (k >= 0) mask |= 1 << k;
          const type = s.type === 'P' && t < 8 ? 'Q' : s.type;
          const n = { pos: t, type, mask };
          if (!seen.has(key(n))) { seen.add(key(n)); next.push(n); }
        }
      }
      frontier = next;
      if (!frontier.length) return -1;
    }
    return -1;
  }

  root.LearnEngine = { sq, name, moves, solve };
})(typeof window !== 'undefined' ? window : globalThis);
