/* 8 ферзів: постав 8 ферзів так, щоб жоден не бив іншого (ні по рядку, ні по стовпчику, ні по діагоналі).
   Ферзі лежать під дошкою: тап по ферзю, потім по клітинці — або просто перетягни на дошку.
   Поставленого ферзя можна перетягнути в іншу клітинку, а щоб прибрати — перетягни за дошку або тапни по ньому двічі. */
import { Chessground } from 'https://cdn.jsdelivr.net/npm/@lichess-org/chessground@10.2.0/dist/chessground.min.js';
import { applyBoardLook, lichessTouch } from '../shared/board.js';

const LG = window.LG, $ = id => document.getElementById(id);
const N = 8, FILES = 'abcdefgh';
const QUEEN = { role: 'queen', color: 'white' };
const key = (r, c) => FILES[c] + (r + 1);
const rc = k => [Number(k[1]) - 1, FILES.indexOf(k[0])];
const attacks = (a, b) => { const [r1, c1] = rc(a), [r2, c2] = rc(b); return r1 === r2 || c1 === c2 || Math.abs(r1 - r2) === Math.abs(c1 - c2); };

applyBoardLook();
let history = [], won = false, armed = false, lastTap = { k: null, t: 0 };
const cg = Chessground($('board'), {
  fen: '8/8/8/8/8/8/8/8',
  coordinates: true,
  animation: { enabled: true, duration: 150 },
  movable: { free: true, color: 'white', showDests: false },
  premovable: { enabled: false },
  draggable: { enabled: true, showGhost: true, distance: 5, autoDistance: false, deleteOnDropOff: true },
  highlight: { lastMove: false },
  drawable: { enabled: false, visible: true },
  events: {
    change: () => { if (!syncing) { history.push(snapshot.slice()); after(); } },
    select: k => onSelect(k)
  }
});
lichessTouch(cg);
let snapshot = [], syncing = false;
const queens = () => [...cg.state.pieces.keys()];

function set(keys) {
  syncing = true;
  const diff = new Map();
  for (const k of cg.state.pieces.keys()) if (!keys.includes(k)) diff.set(k, undefined);
  for (const k of keys) if (!cg.state.pieces.has(k)) diff.set(k, { ...QUEEN });
  cg.setPieces(diff);
  syncing = false;
}
function after() {
  const qs = queens();
  snapshot = qs;
  const bad = new Set(), att = new Set(), show = LG.store.get('queens:att', true);
  for (const a of qs) for (const b of qs) if (a !== b && attacks(a, b)) { bad.add(a); bad.add(b); }
  if (show) for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) { const k = key(r, c); if (!qs.includes(k) && qs.some(q => attacks(q, k))) att.add(k); }
  const custom = new Map();
  att.forEach(k => custom.set(k, 'q-att'));
  bad.forEach(k => custom.set(k, 'q-bad'));
  cg.set({ highlight: { custom } });
  $('left').textContent = `Ферзів: ${qs.length} / ${N}`;
  $('left').classList.toggle('bad', bad.size > 0);
  renderTray();
  if (qs.length === N && !bad.size && !won) {
    won = true; cg.set({ movable: { color: undefined } });
    LG.win('Вісім ферзів — і жоден не б’є іншого!', { reward: true, onAgain: start });
  } else if (qs.length) LG.play('place');
}
function renderTray() {
  const left = Math.max(0, N - queens().length);
  $('tray').innerHTML = Array.from({ length: left }, (_, i) => `<mpiece class="queen white${armed && i === left - 1 ? ' armed' : ''}"></mpiece>`).join('');
}

// Тап по ферзю в лотку — «взяти» його; тап по порожній клітинці — поставити
$('tray').addEventListener('pointerdown', e => {
  const q = e.target.closest('mpiece');
  if (!q || won) return;
  const start = [e.clientX, e.clientY];
  const move = ev => {
    if (Math.hypot(ev.clientX - start[0], ev.clientY - start[1]) < 6) return;
    cleanup(); armed = false; renderTray();
    cg.dragNewPiece({ ...QUEEN }, ev); // далі тягне сам chessground
  };
  const upHandler = () => { cleanup(); armed = !armed; LG.play('tap'); renderTray(); };
  const cleanup = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', upHandler); };
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', upHandler);
});
function onSelect(k) {
  if (won) return;
  if (armed && !cg.state.pieces.has(k)) {
    armed = false; history.push(snapshot.slice());
    set([...queens(), k]); cg.selectSquare(null); after();
    return;
  }
  // Два тапи по ферзю — прибрати його в лоток
  if (cg.state.pieces.has(k)) {
    const now = Date.now();
    if (lastTap.k === k && now - lastTap.t < 600) {
      history.push(snapshot.slice()); set(queens().filter(q => q !== k)); cg.selectSquare(null); lastTap = { k: null, t: 0 }; after(); return;
    }
    lastTap = { k, t: now };
  }
}

// Підказка: клітинка з розв'язку, у якому вже поставлені ферзі лишаються на місцях
function solveWith(fixed) {
  const cols = Array(N).fill(-1);
  for (const q of fixed) { const [r, c] = rc(q); if (cols[r] !== -1) return null; cols[r] = c; }
  const ok = (r, c) => { for (let i = 0; i < N; i++) if (i !== r && cols[i] !== -1 && (cols[i] === c || Math.abs(cols[i] - c) === Math.abs(i - r))) return false; return true; };
  for (let r = 0; r < N; r++) if (cols[r] !== -1 && !ok(r, cols[r])) return null;
  const go = r => {
    if (r === N) return true;
    if (fixed.some(q => rc(q)[0] === r)) return go(r + 1);
    for (let c = 0; c < N; c++) if (ok(r, c)) { cols[r] = c; if (go(r + 1)) return true; cols[r] = -1; }
    return false;
  };
  return go(0) ? cols : null;
}
$('hint').addEventListener('click', () => {
  if (won) return;
  const qs = queens(), sol = solveWith(qs);
  let target;
  if (sol) { const r = sol.findIndex((c, r) => !qs.includes(key(r, c))); if (r >= 0) target = key(r, sol[r]); }
  else { // з цими ферзями розв'язку немає — підсвітимо ферзя, якого варто прибрати
    target = qs.find(q => solveWith(qs.filter(x => x !== q))) || qs[qs.length - 1];
    LG.toast('Так не вийде: прибери підсвіченого ферзя 👆');
  }
  if (!target) return;
  const custom = new Map(cg.state.highlight.custom || []); custom.set(target, 'q-hint');
  cg.set({ highlight: { custom } });
});
$('undo').addEventListener('click', () => { if (!history.length || won) return LG.play('error'); set(history.pop()); after(); });
function start() { won = false; armed = false; history = []; set([]); cg.set({ movable: { color: 'white' } }); after(); }
$('new').addEventListener('click', start);

LG.addSettings(() => {
  const l = document.createElement('label'); l.className = 'lg-set-row';
  l.innerHTML = `<span>Підсвічувати клітинки під ударом</span><input type="checkbox" ${LG.store.get('queens:att', true) ? 'checked' : ''}>`;
  l.querySelector('input').addEventListener('change', e => { LG.store.set('queens:att', e.target.checked); after(); });
  return l;
});
LG.addSettings(() => LG.pieceSetPicker(() => { applyBoardLook(); cg.redrawAll(); renderTray(); }));
document.addEventListener('touchmove', e => { if (!e.target.closest('.lg-modal')) e.preventDefault(); }, { passive: false });
start();
