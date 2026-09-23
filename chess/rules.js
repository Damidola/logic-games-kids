/* Шахи за правилами Lichess (chessops): шах, мат, пат, рокіровка, взяття на проході.
   Пішак, що дійшов до кінця, одразу стає ферзем.
   Режим «Піддавки» (antichess Lichess): бити обов'язково, король — звичайна фігура,
   виграє той, хто віддав усі фігури або не має ходу. */
import { Chess, makeSquare, fen, variant } from 'https://cdn.jsdelivr.net/npm/chessops@0.15.1/+esm';
const { makeFen } = fen;

const VALUE = { pawn: 100, knight: 300, bishop: 320, rook: 500, queen: 900, king: 0 };
const LETTER = { pawn: 'P', knight: 'N', bishop: 'B', rook: 'R', queen: 'Q', king: 'K' };
const START = { pawn: 8, knight: 2, bishop: 2, rook: 2, queen: 1 };
const side = c => (c === 'white' ? 'w' : 'b');
// Бонус за клітинку: у центрі фігури сильніші, пішаки — чим далі, тим краще
const center = sq => { const f = sq & 7, r = sq >> 3; return 3.5 - Math.max(Math.abs(f - 3.5), Math.abs(r - 3.5)); };

export function createRules(opts = {}) {
  const anti = () => (opts.variant ? opts.variant() : 'standard') === 'antichess';
  function moves(pos) {
    const out = [];
    for (const [from, dests] of pos.allDests()) {
      const piece = pos.board.get(from);
      for (const to of dests) {
        const promo = piece.role === 'pawn' && (to >> 3 === 7 || to >> 3 === 0) ? 'queen' : undefined;
        const victim = pos.board.get(to);
        // Рокіровка: chessops ходить «король на туру», а дитина тягне короля на g1/c1
        const castle = piece.role === 'king' && victim && victim.color === piece.color;
        out.push({
          from: makeSquare(from), to: makeSquare(castle ? (to > from ? from + 2 : from - 2) : to), m: { from, to, promotion: promo },
          capture: (!!victim && victim.color !== piece.color) || (piece.role === 'pawn' && (from & 7) !== (to & 7)),
          gain: (victim && victim.color !== piece.color ? VALUE[victim.role] : 0) - VALUE[piece.role] / 100 + (promo ? 800 : 0)
        });
      }
    }
    return out;
  }
  function play(pos, mv) { const p = pos.clone(); p.play(mv.m); return p; }
  function result(pos) {
    const o = pos.outcome();
    if (!o) return null;
    if (!o.winner) return { winner: 'draw', text: pos.isStalemate() ? 'Пат: ходів немає, але й шаху немає.' : 'Нічия!' };
    if (pos.rules === 'antichess') return { winner: side(o.winner), text: 'Віддав усі фігури — переміг!' };
    return { winner: side(o.winner), text: 'Мат!' };
  }
  function evaluate(pos, s) {
    let v = 0;
    for (const [sq, p] of pos.board) {
      let x = VALUE[p.role];
      if (p.role === 'pawn') x += 6 * (p.color === 'white' ? (sq >> 3) - 1 : 6 - (sq >> 3));
      else if (p.role !== 'king') x += 8 * center(sq);
      v += side(p.color) === s ? x : -x;
    }
    if (pos.rules === 'antichess') return -v; // у піддавках що менше фігур, то краще
    if (pos.isCheck()) v += side(pos.turn) === s ? -15 : 15;
    return v;
  }
  function captured(pos) {
    const left = { white: {}, black: {} };
    for (const [, p] of pos.board) left[p.color][p.role] = (left[p.color][p.role] || 0) + 1;
    const lost = c => Object.entries(START).flatMap(([r, n]) => Array(Math.max(0, n - (left[c][r] || 0))).fill(LETTER[r]));
    return { w: lost('black'), b: lost('white') }; // що збили білі — це втрати чорних
  }
  return {
    initial: () => (anti() ? variant.Antichess.default() : Chess.default()),
    moves, play, result, evaluate, captured,
    turn: pos => side(pos.turn),
    key: pos => makeFen(pos.toSetup()),
    check: pos => (pos.isCheck() ? pos.turn : false),
    pieces: pos => { const m = new Map(); for (const [sq, p] of pos.board) m.set(makeSquare(sq), { role: p.role, color: p.color }); return m; },
    moveOrder: (pos, mv) => mv.gain,
    aiDepth: [2, 3, 3]
  };
}
