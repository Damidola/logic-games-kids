/* Спільна дошка 8×8 для всіх ігор — дошка Lichess (chessground).
   Гра дає позицію (Map клітинка → {role, color}) і можливі ходи; дошка сама
   малює, анімує, перетягує, показує крапки ходів, останній хід і стрілку підказки. */
import { Chessground } from 'https://cdn.jsdelivr.net/npm/@lichess-org/chessground@10.2.0/dist/chessground.min.js';

const ROOT = new URL('..', import.meta.url).href; // корінь сайту
const CHESS_ROLES = { pawn: 'P', knight: 'N', bishop: 'B', rook: 'R', queen: 'Q', king: 'K' };

// Дошки Lichess (lila/public/images/board, AGPLv3+) і кольори координат до них (lila _boards.scss)
export const BOARD_THEMES = [
  ['brown', 'png', '#f0d9b5', '#946f51'], ['wood', 'jpg', '#d8a45b', '#9b4d0f'], ['maple', 'jpg', '#e8ceab', '#bc7944'],
  ['blue', 'png', '#dee3e6', '#788a94'], ['blue2', 'jpg', '#97b2c7', '#546f82'], ['green', 'png', '#ffd', '#6d8753'],
  ['green-plastic', 'png', '#f2f9bb', '#59935d'], ['purple', 'png', '#9f90b0', '#7d4a8d'], ['pink-pyramid', 'png', '#e8e9b7', '#ed7272'],
  ['ic', 'png', '#ececec', '#c1c18e'], ['marble', 'jpg', '#93ab91', '#4f644e'], ['grey', 'jpg', '#b8b8b8', '#7d7d7d']
].map(([id, ext, white, black]) => ({ id, file: `${id}.${ext}`, white, black }));
export const boardUrl = f => ROOT + 'shared/boards/' + f;

// Дошка й набір фігур застосовуються до всієї сторінки через CSS-змінні
let styleEl = null;
export function applyBoardLook() {
  const LG = window.LG;
  const theme = BOARD_THEMES.find(t => t.id === (LG && LG.boardTheme && LG.boardTheme())) || BOARD_THEMES[0];
  const set = (LG && LG.pieceSet && LG.pieceSet()) || 'cburnett';
  const root = document.documentElement.style;
  root.setProperty('--cg-board', `url("${boardUrl(theme.file)}")`);
  root.setProperty('--cg-coord-white', theme.white);
  root.setProperty('--cg-coord-black', theme.black);
  let css = '';
  for (const [role, letter] of Object.entries(CHESS_ROLES)) for (const [color, c] of [['white', 'w'], ['black', 'b']])
    css += `piece.${role}.${color},mpiece.${role}.${color}{background-image:url("${ROOT}shared/pieces/${set}/${c}${letter}.svg")}\n`;
  if (!styleEl) { styleEl = document.createElement('style'); document.head.appendChild(styleEl); }
  styleEl.textContent = css;
}

/* createBoard(el, { orientation, onMove(orig, dest) })
   → { setPosition(pieces, {lastMove, animate}), setMovable(color, dests), setOrientation,
       hint(orig, dest), clearHint(), cg } */
export function createBoard(el, opts = {}) {
  applyBoardLook();
  el.classList.add('lg-board');
  const cg = Chessground(el, {
    orientation: opts.orientation || 'white',
    coordinates: true,
    coordinatesOnSquares: false,
    animation: { enabled: true, duration: 200 },
    highlight: { lastMove: true, check: true },
    movable: { free: false, color: undefined, showDests: true, events: { after: (o, d) => opts.onMove && opts.onMove(o, d) } },
    premovable: { enabled: false },
    // Тап лише вибирає фігуру (вона не зрушує); тягнути — після руху пальця на 5 px
    draggable: { enabled: true, showGhost: true, distance: 5, autoDistance: false },
    selectable: { enabled: true },
    drawable: { enabled: false, visible: true, brushes: { hint: { key: 'h', color: '#FF9F1C', opacity: 0.95, lineWidth: 13 } } },
    events: { select: key => opts.onSelect && opts.onSelect(key) }
  });

  function setPosition(pieces, o = {}) {
    // pieces: Map(key → {role, color}); chessground сам анімує різницю
    const diff = new Map();
    for (const k of cg.state.pieces.keys()) if (!pieces.has(k)) diff.set(k, undefined);
    for (const [k, p] of pieces) {
      const cur = cg.state.pieces.get(k);
      if (!cur || cur.role !== p.role || cur.color !== p.color) diff.set(k, { ...p });
    }
    if (o.animate === false) cg.set({ animation: { enabled: false } });
    if (diff.size) cg.setPieces(diff);
    if (o.animate === false) cg.set({ animation: { enabled: true } });
    cg.set({ lastMove: o.lastMove || undefined, check: o.check || false });
  }
  function setMovable(color, dests) {
    cg.set({ turnColor: color || cg.state.turnColor, movable: { color: color || undefined, dests: dests || new Map() } });
  }
  return {
    cg,
    setPosition,
    setMovable,
    setOrientation: o => cg.set({ orientation: o }),
    hint: (orig, dest) => cg.setAutoShapes([{ orig, dest, brush: 'hint' }]),
    shapes: s => cg.setAutoShapes(s),
    clearHint: () => cg.setAutoShapes([]),
    // Підсвітити клітинки: Map(клітинка → css-клас), напр. «будиночок» у «Кутах»
    marks: m => cg.set({ highlight: { custom: m || new Map() } }),
    redraw: () => cg.redrawAll(),
    destroy: () => cg.destroy()
  };
}

export const squareName = i => 'abcdefgh'[i % 8] + (8 - Math.floor(i / 8)); // 0 = a8
export const squareIndex = k => (8 - Number(k[1])) * 8 + 'abcdefgh'.indexOf(k[0]);
