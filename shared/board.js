/* Спільна дошка 8×8 для всіх ігор — дошка Lichess (chessground).
   Гра дає позицію (Map клітинка → {role, color}) і можливі ходи; дошка сама
   малює, анімує, перетягує, показує крапки ходів, останній хід і стрілку підказки. */
import { Chessground } from './vendor/chessground.js';

const ROOT = new URL('..', import.meta.url).href; // корінь сайту
const CHESS_ROLES = { pawn: 'P', knight: 'N', bishop: 'B', rook: 'R', queen: 'Q', king: 'K' };

// Кольори дошки (перший — класична коричнева, як на Lichess)
export const BOARD_THEMES = [
  { name: 'Дерево', light: '#F0D9B5', dark: '#B58863' },
  { name: 'Чорно-біла', light: '#F5F5F5', dark: '#3B3B3B' },
  { name: 'Зелена', light: '#EEEED2', dark: '#769656' },
  { name: 'Синя', light: '#DEE3E6', dark: '#8CA2AD' },
  { name: 'Фіолетова', light: '#ECE6FA', dark: '#9C88D6' },
  { name: 'Рожева', light: '#FCE4EC', dark: '#E07A9C' }
];

function boardSvg(light, dark) {
  let rects = '';
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++)
    if ((r + c) % 2) rects += `<rect x="${c}" y="${r}" width="1" height="1"/>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8 8" shape-rendering="crispEdges">` +
    `<rect width="8" height="8" fill="${light}"/><g fill="${dark}">${rects}</g></svg>`;
  return `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`;
}

// Кольори дошки й набір фігур застосовуються до всієї сторінки через CSS-змінні
let styleEl = null;
export function applyBoardLook() {
  const LG = window.LG;
  const theme = BOARD_THEMES[0];
  const colors = (LG && LG.boardColors && LG.boardColors()) || theme;
  const set = (LG && LG.pieceSet && LG.pieceSet()) || 'cburnett';
  const root = document.documentElement.style;
  root.setProperty('--cg-board', boardSvg(colors.light, colors.dark));
  root.setProperty('--sq-light', colors.light);
  root.setProperty('--sq-dark', colors.dark);
  let css = '';
  for (const [role, letter] of Object.entries(CHESS_ROLES)) for (const [color, c] of [['white', 'w'], ['black', 'b']])
    css += `.cg-wrap piece.${role}.${color}{background-image:url("${ROOT}shared/pieces/${set}/${c}${letter}.svg")}\n`;
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
    draggable: { enabled: true, showGhost: true }, // як на Lichess: фігура точно під пальцем
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
