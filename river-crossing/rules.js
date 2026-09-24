/* «Переправа»: саламандра (білі) має дістатися верхнього ряду; риби (чорні) —
   оточити її так, щоб вона не могла ходити. Саламандра ходить на одну клітинку
   по діагоналі вперед або назад; риба — лише вниз по діагоналі. Щоходу рухається
   саламандра, потім одна риба. Якщо жодна риба не може ходити — пропускають хід. */
import { squareName as N } from '../shared/board.js';

const inside = (r, c) => r >= 0 && r < 8 && c >= 0 && c < 8;

export function createRules() {
  const free = (s, r, c) => inside(r, c) && s.s !== r * 8 + c && !s.f.includes(r * 8 + c);
  function moves(s) {
    const out = [];
    if (s.t === 'w') {
      const r0 = s.s >> 3, c0 = s.s & 7;
      for (const [dr, dc] of [[-1, -1], [-1, 1], [1, -1], [1, 1]])
        if (free(s, r0 + dr, c0 + dc)) out.push({ i: s.s, j: (r0 + dr) * 8 + c0 + dc, from: N(s.s), to: N((r0 + dr) * 8 + c0 + dc) });
      return out;
    }
    for (const f of s.f) {
      const r0 = f >> 3, c0 = f & 7;
      for (const dc of [-1, 1]) if (free(s, r0 + 1, c0 + dc)) out.push({ i: f, j: (r0 + 1) * 8 + c0 + dc, from: N(f), to: N((r0 + 1) * 8 + c0 + dc) });
    }
    return out.length ? out : [{ pass: true }]; // рибам нікуди — хід знову саламандри
  }
  function play(s, m) {
    if (m.pass) return { ...s, t: 'w' };
    if (s.t === 'w') return { ...s, s: m.j, t: 'b' };
    return { ...s, f: s.f.map(x => (x === m.i ? m.j : x)), t: 'w' };
  }
  function result(s) {
    if (s.s >> 3 === 0) return { winner: 'w', text: 'Саламандра 🦎 щасливо перебралася на інший берег!' };
    if (s.t === 'w' && !moves(s).length) return { winner: 'b', text: 'Риби 🐠 оточили саламандру. Спробуй обійти їх з іншого боку!' };
    return null;
  }
  // Саламандрі добре бути вище й мати куди ходити; рибам — навпаки
  function evaluate(s, side) {
    const up = 7 - (s.s >> 3);
    const mob = moves({ ...s, t: 'w' }).length;
    const below = s.f.filter(f => (f >> 3) > (s.s >> 3)).length; // риби, що вже «пропливли» повз
    const v = up * 12 + mob * 6 + below * 15;
    return side === 'w' ? v : -v;
  }
  return {
    initial: () => ({ s: 60, f: [1, 3, 5, 7], t: 'w' }), // саламандра на e1, риби — у верхньому ряду
    moves, play, result, evaluate,
    turn: s => s.t,
    key: s => s.s + '|' + s.f.slice().sort().join(',') + s.t,
    pieces: s => {
      const m = new Map([[N(s.s), { role: 'salamander', color: 'white' }]]);
      s.f.forEach(f => m.set(N(f), { role: 'fish', color: 'black' }));
      return m;
    },
    marks: () => new Map([0, 1, 2, 3, 4, 5, 6, 7].map(c => [N(c), 'mark-blue'])),
    aiDepth: [4, 6, 8]
  };
}
