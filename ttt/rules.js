/* Хрестики-нулики: хто першим поставить три свої знаки в ряд. X — білі (ходять першими), O — чорні. */
const LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
const other = s => (s === 'w' ? 'b' : 'w');

export function createRules() {
  const line = b => LINES.find(([a, c, d]) => b[a] && b[a] === b[c] && b[a] === b[d]);
  return {
    initial: () => ({ b: Array(9).fill(null), t: 'w' }),
    turn: s => s.t,
    moves: s => (line(s.b) ? [] : s.b.map((v, i) => (v ? null : { id: i, i })).filter(Boolean)),
    play: (s, m) => { const b = s.b.slice(); b[m.i] = s.t; return { b, t: other(s.t) }; },
    result: s => {
      const l = line(s.b);
      if (l) return { winner: s.b[l[0]], line: l, text: 'Три в ряд!' };
      if (s.b.every(Boolean)) return { winner: 'draw', text: 'Ніхто не зібрав три в ряд. Це теж гарний результат!' };
      return null;
    },
    // Лінії, де лише мої знаки, — добре; де лише чужі — погано; центр — найсильніший
    evaluate: (s, side) => LINES.reduce((v, l) => {
      const mine = l.filter(i => s.b[i] === side).length, theirs = l.filter(i => s.b[i] === other(side)).length;
      return v + (theirs ? 0 : mine * mine * 3) - (mine ? 0 : theirs * theirs * 3);
    }, s.b[4] === side ? 4 : s.b[4] ? -4 : 0),
    key: s => s.b.map(v => v || '.').join('') + s.t,
    line: s => line(s.b),
    aiDepth: [3, 9, 9]
  };
}
