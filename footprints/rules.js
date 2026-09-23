/* «Сліди»: дві тури. Звідки тура пішла — там лишається її слід.
   Через сліди не можна проходити, на свій слід — ставати. На чужий слід ставати
   можна, якщо там безпечно (слід тоді зникає). Не можна ставати туди, куди б'є
   чужа тура, і поруч із чужими слідами. Хто не може походити — програв.
   (Правила перенесено дослівно зі старої гри.) */
import { squareName as N } from '../shared/board.js';

const other = s => (s === 'w' ? 'b' : 'w');
const near = (a, b) => Math.abs((a >> 3) - (b >> 3)) <= 1 && Math.abs((a & 7) - (b & 7)) <= 1;

function valid(s, from, to) {
  const me = s.t, opp = other(me);
  if (from === to) return false;
  const fr = from >> 3, fc = from & 7, tr = to >> 3, tc = to & 7;
  if (fr !== tr && fc !== tc) return false;
  const trace = s.tr[to];
  if (trace === me) return false;
  const rook = x => x === s.w || x === s.b;
  // Шлях чистий: ні тур, ні будь-яких слідів
  if (fr === tr) { for (let c = Math.min(fc, tc) + 1; c < Math.max(fc, tc); c++) if (rook(fr * 8 + c) || s.tr[fr * 8 + c]) return false; }
  else { for (let r = Math.min(fr, tr) + 1; r < Math.max(fr, tr); r++) if (rook(r * 8 + fc) || s.tr[r * 8 + fc]) return false; }
  const oppRook = s[opp];
  const oppTraces = Object.keys(s.tr).map(Number).filter(k => s.tr[k] === opp);
  if (trace === opp) {
    if (oppTraces.some(k => k !== to && near(k, to))) return false;
    if (tr === oppRook >> 3 || tc === (oppRook & 7)) return false;
    return true;
  }
  // Чи б'є чужа тура цю клітинку (через вільний шлях)?
  const or = oppRook >> 3, oc = oppRook & 7;
  if (tr === or || tc === oc) {
    let blocked = false;
    if (tr === or) { for (let c = Math.min(tc, oc) + 1; c < Math.max(tc, oc); c++) if (s.tr[tr * 8 + c] || tr * 8 + c === s[me]) { blocked = true; break; } }
    else { for (let r = Math.min(tr, or) + 1; r < Math.max(tr, or); r++) if (s.tr[r * 8 + tc] || r * 8 + tc === s[me]) { blocked = true; break; } }
    if (!blocked) return false;
  }
  if (oppTraces.some(k => near(k, to))) return false;
  return true;
}

export function createRules(opts = {}) {
  function moves(s) {
    const from = s[s.t], out = [];
    for (let to = 0; to < 64; to++) if (valid(s, from, to)) out.push({ i: from, j: to, from: N(from), to: N(to), capture: s.tr[to] === other(s.t) });
    return out;
  }
  function play(s, m) {
    const tr = { ...s.tr };
    if (tr[m.j] && tr[m.j] !== s.t) delete tr[m.j];
    tr[m.i] = s.t;
    return { ...s, tr, [s.t]: m.j, t: other(s.t) };
  }
  function result(s) {
    if (moves(s).length) return null;
    return s.t === 'b' ? { winner: 'w', text: 'Робот застряг — у нього не лишилося ходів!' } : { winner: 'b', text: 'Твоя тура застрягла. Наступного разу залиш собі більше вільного місця!' };
  }
  // Оцінка: у кого більше куди ходити (і на два кроки вперед)
  function evaluate(s, side) {
    const mob = t => moves({ ...s, t }).length;
    return (mob(side) - mob(other(side))) * 10;
  }
  function initial() {
    if (opts.random && opts.random()) {
      const w = Math.floor(Math.random() * 64);
      let b; do { b = Math.floor(Math.random() * 64); } while ((b >> 3) === (w >> 3) || (b & 7) === (w & 7));
      return { w, b, tr: {}, t: 'w' };
    }
    return { w: 63, b: 0, tr: {}, t: 'w' }; // біла тура — h1, чорна — a8
  }
  return {
    initial, moves, play, result, evaluate,
    turn: s => s.t,
    key: s => s.w + ',' + s.b + ',' + s.t + JSON.stringify(s.tr),
    pieces: s => {
      const m = new Map();
      for (const k in s.tr) m.set(N(+k), { role: 'trace', color: s.tr[k] === 'w' ? 'white' : 'black' });
      m.set(N(s.w), { role: 'rook', color: 'white' }); m.set(N(s.b), { role: 'rook', color: 'black' });
      return m;
    },
    aiDepth: [2, 3, 4]
  };
}
