/* Доміно (класичне, 28 кісток 0–6): кожному по 7, решта — «базар».
   Кістку прикладають до будь-якого кінця ланцюжка тим самим числом.
   Нема чим ходити — береш з базару, доки не з'явиться хід; базар порожній — пропускаєш.
   Хто перший виклав усі кістки — виграв. «Риба» (ходити не може ніхто) — виграє той, у кого менше очок. */
const other = s => (s === 'w' ? 'b' : 'w');
export const code = t => t[0] + '-' + t[1];
const pips = hand => hand.reduce((a, t) => a + t[0] + t[1], 0);

function deal() {
  const all = [];
  for (let a = 0; a <= 6; a++) for (let b = a; b <= 6; b++) all.push([a, b]);
  for (let i = all.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [all[i], all[j]] = [all[j], all[i]]; }
  return { w: all.slice(0, 7), b: all.slice(7, 14), yard: all.slice(14) };
}
const ends = s => (s.chain.length ? [s.chain[0][0], s.chain[s.chain.length - 1][1]] : null);
// Ходи кістками (без «взяти з базару»)
function places(s, side) {
  const e = ends(s), out = [];
  for (const t of s.hand[side]) {
    if (!e) { out.push({ id: code(t) + ':R', tile: t, end: 'R' }); continue; }
    if (t[0] === e[0] || t[1] === e[0]) out.push({ id: code(t) + ':L', tile: t, end: 'L' });
    // на самому початку після дубля обидва кінці однакові — досить одного варіанта
    const same = s.chain.length === 1 && e[0] === e[1];
    if ((t[0] === e[1] || t[1] === e[1]) && !same) out.push({ id: code(t) + ':R', tile: t, end: 'R' });
  }
  return out;
}
const canAct = (s, side) => places(s, side).length > 0 || s.yard.length > 0;

export function createRules() {
  const moves = s => {
    if (s.done) return [];
    const p = places(s, s.t);
    return p.length ? p : s.yard.length ? [{ id: 'draw', draw: true }] : [];
  };
  return {
    initial: () => { const d = deal(); return { chain: [], hand: { w: d.w, b: d.b }, yard: d.yard, t: 'w', last: null }; },
    turn: s => s.t,
    moves,
    play: (s, m) => {
      const hand = { ...s.hand };
      let chain = s.chain, yard = s.yard, t = s.t, last = null;
      if (m.draw) { hand[t] = [...hand[t], yard[0]]; yard = yard.slice(1); last = 'draw'; }
      else {
        hand[t] = hand[t].filter(x => x !== m.tile);
        const e = ends(s), [a, b] = m.tile;
        if (!e) chain = [[a, b]];
        else if (m.end === 'L') chain = [[a === e[0] ? b : a, e[0]], ...chain]; // повертаємо кістку потрібним боком
        else chain = [...chain, [a === e[1] ? a : b, a === e[1] ? b : a]];
        last = m.end;
        t = other(t);
      }
      const n = { chain, hand, yard, t, last, by: s.t };
      if (!hand.w.length || !hand.b.length) n.done = true;
      else if (!canAct(n, n.t)) { if (canAct(n, other(n.t))) n.t = other(n.t); else n.done = true; } // пропуск або «риба»
      return n;
    },
    result: s => {
      if (!s.done) return null;
      if (!s.hand.w.length) return { winner: 'w', text: 'Ти виклав усі кістки!' };
      if (!s.hand.b.length) return { winner: 'b', text: 'Суперник виклав усі кістки першим.' };
      const w = pips(s.hand.w), b = pips(s.hand.b);
      if (w === b) return { winner: 'draw', text: `Риба! Очок порівну: по ${w}.` };
      return { winner: w < b ? 'w' : 'b', text: `Риба! Очок у тебе ${w}, у суперника ${b}. Виграє той, у кого менше.` };
    },
    // Оцінка без підглядання: мої кістки, мої очки і скільки кісток у суперника
    evaluate: (s, side) => {
      const mine = s.hand[side], e = ends(s) || [];
      const fit = mine.filter(t => e.includes(t[0]) || e.includes(t[1])).length;
      return (s.hand[other(side)].length - mine.length) * 30 - pips(mine) + fit * 4;
    },
    moveOrder: (s, m) => (m.tile ? m.tile[0] + m.tile[1] + (m.tile[0] === m.tile[1] ? 5 : 0) : -1),
    score: s => ({ w: `<span class="dm-sc">🁫 ${s.hand.w.length}</span>`, b: `<span class="dm-sc">🁫 ${s.hand.b.length}</span>` }),
    key: s => s.chain.map(code).join(',') + '|' + s.hand[s.t].map(code).join(',') + s.t,
    ends,
    aiDepth: [1, 1, 1]
  };
}
