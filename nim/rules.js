/* Нім: ряди сірників. За хід беруть скільки завгодно сірників, але з одного ряду.
   Звичайно: хто взяв останню — виграв. У варіанті «навпаки» — хто взяв останню, програв. */
const other = s => (s === 'w' ? 'b' : 'w');
export const LAYOUTS = { '1357': [1, 3, 5, 7], '345': [3, 4, 5], '23456': [2, 3, 4, 5, 6] };

// Чи виграє той, хто зараз ходить (теорія Німу: XOR розмірів рядів)
function moverWins(rows, misere) {
  const x = rows.reduce((a, n) => a ^ n, 0);
  if (misere && rows.every(n => n <= 1)) return rows.filter(n => n === 1).length % 2 === 0;
  return x !== 0;
}

export function createRules(opts = {}) {
  const misere = () => (opts.misere ? opts.misere() : false);
  return {
    initial: () => {
      const rows = (LAYOUTS[opts.layout ? opts.layout() : '1357'] || LAYOUTS['1357']).slice();
      return { rows, init: rows.slice(), t: 'w', misere: misere(), last: null };
    },
    turn: s => s.t,
    moves: s => s.rows.flatMap((len, r) => Array.from({ length: len }, (_, k) => ({ id: `${r}:${k + 1}`, r, n: k + 1 }))),
    play: (s, m) => {
      const rows = s.rows.slice(); rows[m.r] -= m.n;
      return { ...s, rows, t: other(s.t), last: { r: m.r, from: rows[m.r], n: m.n } };
    },
    result: s => {
      if (s.rows.some(n => n)) return null;
      const took = other(s.t); // той, хто взяв останню
      return s.misere
        ? { winner: s.t, text: 'Останню сірника довелося взяти супернику!' }
        : { winner: took, text: 'Останній сірник — твій!' };
    },
    evaluate: (s, side) => {
      const v = moverWins(s.rows, s.misere) ? 100 : -100;
      return s.t === side ? v : -v;
    },
    key: s => s.rows.join(',') + s.t,
    aiDepth: [1, 1, 1]
  };
}
