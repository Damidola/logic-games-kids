/* Уно для двох: 108 карт чотирьох кольорів (r, g, b, y) — числа 0–9, S «пропуск», R «розворот», D «+2»,
   і чорні: W «вибір кольору», F «+4». Кладеш карту того ж кольору або того ж знаку, чорну — завжди.
   Удвох «пропуск» і «розворот» означають: ходиш ще раз. «+2» / «+4» — суперник бере карти й пропускає хід.
   Є чим ходити — треба ходити. Нема — бери карту з колоди; підійшла — клади її, ні — хід переходить.
   Хто перший скинув усі карти — виграв. */
export const COLORS = ['r', 'g', 'b', 'y'];
const other = s => (s === 'w' ? 'b' : 'w');
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
function fullDeck() {
  const d = [];
  for (const c of COLORS) {
    d.push(c + '0');
    for (const v of '123456789SRD') d.push(c + v, c + v);
  }
  for (let i = 0; i < 4; i++) d.push('W', 'F');
  return d;
}
export const isWild = c => c === 'W' || c === 'F';
const fits = (s, c) => isWild(c) || c[0] === s.color || c[1] === s.top[1] && !isWild(s.top);
// Взяти n карт; колода скінчилась — нова (скинуті карти перетасовано): усе, крім карт на руках і верхньої.
// rest — карти, які лежать не в колоді і не в цій руці (рука суперника + верхня)
function take(deck, hand, n, rest) {
  deck = deck.slice(); hand = hand.slice();
  for (let k = 0; k < n; k++) {
    if (!deck.length) {
      const used = [...rest, ...hand];
      deck = shuffle(fullDeck().filter(c => { const i = used.indexOf(c); if (i < 0) return true; used.splice(i, 1); return false; }));
      if (!deck.length) break;
    }
    hand.push(deck.pop());
  }
  return { deck, hand };
}
const points = c => (isWild(c) ? 50 : /[SRD]/.test(c[1]) ? 20 : +c[1]);

export function createRules() {
  const plays = (s, list) => {
    const out = [], seen = new Set();
    for (const c of list) {
      if (seen.has(c) || !fits(s, c)) continue;
      seen.add(c);
      if (isWild(c)) for (const col of COLORS) out.push({ id: c + ':' + col, card: c, color: col });
      else out.push({ id: c, card: c });
    }
    return out;
  };
  return {
    initial: () => {
      const deck = shuffle(fullDeck());
      const w = deck.splice(-7), b = deck.splice(-7);
      let i = deck.findIndex(c => /[0-9]/.test(c[1])); // перша карта — звичайне число
      const top = deck.splice(i, 1)[0];
      return { hand: { w, b }, deck, top, color: top[0], t: 'w', drawn: null, log: null };
    },
    turn: s => s.t,
    moves: s => {
      if (s.done) return [];
      if (s.drawn) return plays(s, [s.drawn]);
      const p = plays(s, s.hand[s.t]);
      return p.length ? p : [{ id: 'draw', draw: true }];
    },
    play: (s, m) => {
      const t = s.t, o = other(t), hand = { ...s.hand };
      let deck = s.deck;
      if (m.draw) {
        const r = take(deck, hand[t], 1, [...hand[o], s.top]);
        if (r.hand.length === hand[t].length) return { ...s, t: o, drawn: null, log: { who: t, draw: 0 } }; // карт не лишилось зовсім
        deck = r.deck; hand[t] = r.hand;
        const c = hand[t][hand[t].length - 1];
        const next = { ...s, hand, deck, log: { who: t, draw: 1 } };
        // узяту карту, якщо підходить, кладуть одразу; інакше хід переходить
        return fits(s, c) ? { ...next, drawn: c } : { ...next, t: o, drawn: null };
      }
      const h = hand[t].slice(); h.splice(h.indexOf(m.card), 1); hand[t] = h;
      const n = { hand, deck, top: m.card, color: m.color || m.card[0], t: o, drawn: null, log: { who: t, card: m.card } };
      const v = m.card === 'F' ? 'F' : m.card[1];
      if (v === 'D' || v === 'F') { const r = take(n.deck, hand[o], v === 'D' ? 2 : 4, [...hand[t], m.card]); n.deck = r.deck; hand[o] = r.hand; n.log.gave = v === 'D' ? 2 : 4; }
      if ('SRDF'.includes(v)) n.t = t; // удвох: суперник пропускає — ходиш ще раз
      if (!h.length) n.done = true;
      return n;
    },
    result: s => {
      if (!s.done) return null;
      const winner = s.hand.w.length ? 'b' : 'w';
      return { winner, text: winner === 'w' ? 'Уно! Ти скинув усі карти!' : 'Суперник скинув усі карти першим.' };
    },
    // Без підглядання: кількість карт у кожного, моя «сила» на руці і чи ходжу я ще раз
    evaluate: (s, side) => {
      const mine = s.hand[side], opp = s.hand[other(side)];
      const fitNow = mine.filter(c => fits(s, c)).length;
      return (opp.length - mine.length) * 40 - mine.reduce((a, c) => a + points(c), 0) * 0.3 + fitNow * 3 +
        mine.filter(isWild).length * 6 + (s.t === side ? 15 : 0);
    },
    moveOrder: (s, m) => (m.card ? points(m.card) : -5),
    score: s => ({
      w: `<span class="un-sc">🂠 ${s.hand.w.length}${s.hand.w.length === 1 ? ' <b>УНО!</b>' : ''}</span>`,
      b: `<span class="un-sc">🂠 ${s.hand.b.length}${s.hand.b.length === 1 ? ' <b>УНО!</b>' : ''}</span>`
    }),
    key: s => s.hand[s.t].slice().sort().join('') + '|' + s.top + s.color + s.t + (s.drawn || ''),
    aiDepth: [1, 1, 1]
  };
}
