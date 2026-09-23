/* Спільний суперник-робот: 5 рівнів для будь-якої гри.
   Правила гри (rules) дають:
     moves(state)          — усі ходи того, хто ходить
     play(state, move)     — новий стан після ходу (старий не змінюється)
     result(state)         — null, або { winner: 'w' | 'b' | 'draw' }
     turn(state)           — 'w' | 'b'
     evaluate(state, side) — оцінка позиції для side (більше — краще)
     aiDepth?              — [глибина для рівня 4, для рівня 5, для підказки] */
const WIN = 1e6;
const pick = a => a[Math.floor(Math.random() * a.length)];
const other = s => (s === 'w' ? 'b' : 'w');

function score(rules, state, side) {
  const r = rules.result(state);
  if (r) return r.winner === side ? WIN : r.winner === 'draw' ? 0 : -WIN;
  return rules.evaluate(state, side);
}

// Мінімакс з альфа-бета відсіканням; оцінка — з погляду side
function search(rules, state, depth, alpha, beta, side, deadline) {
  const r = rules.result(state);
  if (r) return r.winner === side ? WIN + depth : r.winner === 'draw' ? 0 : -WIN - depth;
  if (depth <= 0 || (deadline && performance.now() > deadline)) return rules.evaluate(state, side);
  const moves = order(rules, state, rules.moves(state));
  if (!moves.length) return rules.evaluate(state, side);
  const maximizing = rules.turn(state) === side;
  let best = maximizing ? -Infinity : Infinity;
  for (const m of moves) {
    const v = search(rules, rules.play(state, m), depth - 1, alpha, beta, side, deadline);
    if (maximizing) { best = Math.max(best, v); alpha = Math.max(alpha, v); }
    else { best = Math.min(best, v); beta = Math.min(beta, v); }
    if (beta <= alpha) break;
  }
  return best;
}
// Спершу перевіряємо взяття й сильні ходи — відсікання працює краще
const order = (rules, state, moves) => rules.moveOrder ? moves.slice().sort((a, b) => rules.moveOrder(state, b) - rules.moveOrder(state, a)) : moves;

// Оцінки всіх ходів на глибину depth (з погляду того, хто ходить)
function rank(rules, state, depth, timeMs) {
  const side = rules.turn(state);
  const deadline = timeMs ? performance.now() + timeMs : 0;
  return order(rules, state, rules.moves(state)).map(m => ({
    m, v: search(rules, rules.play(state, m), depth - 1, -Infinity, Infinity, side, deadline)
  }));
}
const bestOf = (list, jitter = 0) => {
  let top = -Infinity, res = [];
  for (const x of list) {
    const v = x.v + (jitter ? Math.random() * jitter : 0);
    if (v > top + 1e-9) { top = v; res = [x.m]; } else if (Math.abs(v - top) < 1e-9) res.push(x.m);
  }
  return pick(res);
};
const worstOf = list => bestOf(list.map(x => ({ m: x.m, v: -x.v })));

/* Рівні:
   1 — піддається: робить найгірший хід (віддає фігури), не виграє, якщо можна не вигравати;
   2 — слабкий: здебільшого випадково, але часто відповідає на найпростіші загрози;
   3 — новачок: бере, що лежить погано, дивиться на 2 півходи;
   4 — бадьорий: думає на кілька ходів;
   5 — сильний: думає глибоко, але з дрібкою випадковості — його можна обіграти. */
export function aiMove(rules, state, level) {
  const moves = rules.moves(state);
  if (!moves.length) return null;
  if (moves.length === 1) return moves[0];
  const side = rules.turn(state);
  const wins = moves.filter(m => { const r = rules.result(rules.play(state, m)); return r && r.winner === side; });
  const d = rules.aiDepth || [3, 4, 5];
  switch (level) {
    case 1: {
      const notWin = moves.filter(m => !wins.includes(m));
      const pool = notWin.length ? notWin : moves;
      return Math.random() < 0.85 ? worstOf(pool.map(m => ({ m, v: score(rules, rules.play(state, m), side) }))) : pick(pool);
    }
    case 2:
      if (wins.length && Math.random() < 0.6) return pick(wins);
      if (Math.random() < 0.45) return bestOf(rank(rules, state, 2), 0);
      return pick(moves.filter(m => !wins.includes(m)).length ? moves.filter(m => !wins.includes(m)) : moves);
    case 3:
      if (wins.length) return pick(wins);
      return Math.random() < 0.8 ? bestOf(rank(rules, state, 2), 3) : pick(moves);
    case 4:
      if (wins.length) return pick(wins);
      return bestOf(rank(rules, state, d[0], 900), 2);
    default:
      if (wins.length) return pick(wins);
      return bestOf(rank(rules, state, d[1], 1500), Math.random() < 0.15 ? 8 : 0.5);
  }
}

// Підказка: найкращий хід, який вдається знайти (без випадковості), не довше ~0.5 с
export function hintMove(rules, state) {
  const moves = rules.moves(state);
  if (!moves.length) return null;
  const side = rules.turn(state);
  const win = moves.find(m => { const r = rules.result(rules.play(state, m)); return r && r.winner === side; });
  if (win) return win;
  const maxDepth = (rules.aiDepth || [3, 4, 5])[2];
  const start = performance.now();
  let best = moves[0], last = 0;
  for (let depth = 1; depth <= maxDepth; depth++) {
    if (depth > 2 && performance.now() - start + last * 5 > 450) break;
    const t = performance.now();
    const list = rank(rules, state, depth);
    let top = -Infinity;
    for (const x of list) { const v = x.v + (rules.moveOrder ? rules.moveOrder(state, x.m) / 1000 : 0); if (v > top) { top = v; best = x.m; } }
    last = performance.now() - t;
  }
  return best;
}
export { other };
