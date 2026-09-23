/* 8 ферзів: постав 8 ферзів так, щоб жоден не бив іншого (ні по рядку, ні по стовпчику, ні по діагоналі).
   Ферзя можна поставити лише на клітинку, яку ніхто не б'є: тап по вільній клітинці або перетягни з лотка.
   Тап по ферзю — взяти його (далі тап по клітинці — переставити), ще один тап — зняти в лоток.
   Ферзя можна й перетягнути: на іншу безпечну клітинку або за дошку — тоді він повертається в лоток. */
import { Chessground } from 'https://cdn.jsdelivr.net/npm/@lichess-org/chessground@10.2.0/dist/chessground.min.js';
import { applyBoardLook } from '../shared/board.js';

const LG = window.LG, $ = id => document.getElementById(id);
const N = 8, FILES = 'abcdefgh';
const QUEEN = { role: 'queen', color: 'white' };
const key = (r, c) => FILES[c] + (r + 1);
const rc = k => [Number(k[1]) - 1, FILES.indexOf(k[0])];
const attacks = (a, b) => { const [r1, c1] = rc(a), [r2, c2] = rc(b); return r1 === r2 || c1 === c2 || Math.abs(r1 - r2) === Math.abs(c1 - c2); };
const ALL = Array.from({ length: N * N }, (_, i) => key(i >> 3, i & 7));

applyBoardLook();
let history = [], won = false, snapshot = [], flashTimer = 0;
const cg = Chessground($('board'), {
  fen: '8/8/8/8/8/8/8/8',
  coordinates: true,
  animation: { enabled: true, duration: 150 },
  movable: { free: false, color: 'white', showDests: true, dests: new Map() },
  premovable: { enabled: false },
  draggable: { enabled: true, showGhost: true, distance: 5, autoDistance: false, deleteOnDropOff: true },
  highlight: { lastMove: false },
  drawable: { enabled: false, visible: true },
  events: { change: onChange }
});
const queens = () => [...cg.state.pieces.keys()].filter(k => k !== 'a0');
const attackers = (k, skip) => queens().filter(q => q !== k && q !== skip && attacks(q, k));
const safe = (k, skip) => !cg.state.pieces.has(k) && !attackers(k, skip).length;

function set(keys) {
  const diff = new Map();
  for (const k of cg.state.pieces.keys()) if (!keys.includes(k)) diff.set(k, undefined);
  for (const k of keys) if (!cg.state.pieces.has(k)) diff.set(k, { ...QUEEN });
  cg.setPieces(diff);
}
// Будь-яка зміна на дошці від chessground (хід, ферзь з лотка, ферзь за дошку)
function onChange() {
  cg.set({ turnColor: 'white' }); // chessground після кожного ходу передає хід «чорним» — тоді ферзі застигають
  const qs = queens(), bad = qs.find(q => attackers(q).length);
  if (bad) { // так ставити не можна — повертаємо як було
    const k = qs.find(q => !snapshot.includes(q)) || bad;
    set(snapshot); refuse(k);
    return;
  }
  if (qs.length === snapshot.length && qs.every(q => snapshot.includes(q))) return;
  history.push(snapshot.slice());
  after(qs.length > snapshot.length ? 'place' : 'tap');
}
// Клітинку б'ють: коротко підсвічуємо, хто саме
function refuse(k, skip) {
  LG.play('error');
  const custom = highlights();
  if (k) custom.set(k, 'q-bad');
  attackers(k, skip).forEach(q => custom.set(q, 'q-bad'));
  cg.set({ highlight: { custom } });
  clearTimeout(flashTimer);
  flashTimer = setTimeout(() => cg.set({ highlight: { custom: highlights() } }), 800);
}
function highlights() {
  const custom = new Map(), qs = queens();
  if (LG.store.get('queens:att', true)) for (const k of ALL) if (!qs.includes(k) && qs.some(q => attacks(q, k))) custom.set(k, 'q-att');
  return custom;
}
function after(sound) {
  const qs = queens();
  snapshot = qs;
  cg.set({ highlight: { custom: highlights() }, movable: { dests: new Map(qs.map(q => [q, ALL.filter(k => safe(k, q))])) } });
  $('left').textContent = `Ферзів: ${qs.length} / ${N}`;
  renderTray();
  if (qs.length === N && !won) {
    won = true; cg.set({ movable: { color: undefined } }); cg.selectSquare(null);
    $('tray').classList.add('done');
    LG.win('Вісім ферзів — і жоден не б’є іншого!', { reward: true, onAgain: start });
  } else if (sound) LG.play(sound);
}
function renderTray() {
  $('tray').innerHTML = '<mpiece class="queen white"></mpiece>'.repeat(Math.max(0, N - queens().length));
}

// Перетягнути ферзя з лотка на дошку
$('tray').addEventListener('pointerdown', e => {
  if (!e.target.closest('mpiece') || won) return;
  const start = [e.clientX, e.clientY];
  const move = ev => {
    if (Math.hypot(ev.clientX - start[0], ev.clientY - start[1]) < 6) return;
    cleanup(); cg.selectSquare(null);
    cg.dragNewPiece({ ...QUEEN }, ev); // далі тягне сам chessground, перевірка — в onChange
  };
  const up = () => { cleanup(); LG.play('tap'); LG.toast('Тапни вільну клітинку на дошці або перетягни ферзя 👆'); };
  const cleanup = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up);
});

$('tray').addEventListener('dragstart', e => e.preventDefault()); // інакше браузер тягне картинку сам і дошка не бачить, куди кинули

// Тапи по дошці
const wrap = cg.state.dom.elements.wrap;
let down = null;
wrap.addEventListener('pointerdown', e => {
  down = { x: e.clientX, y: e.clientY, sel: cg.state.selected, k: cg.getKeyAtDomPos([e.clientX, e.clientY]) };
}, { capture: true, passive: true });
window.addEventListener('pointerup', e => {
  const d = down; down = null;
  if (!d || won) return;
  const k = cg.getKeyAtDomPos([e.clientX, e.clientY]);
  const tap = Math.hypot(e.clientX - d.x, e.clientY - d.y) < 6;
  setTimeout(() => { // після того, як chessground обробив дотик
    if (!tap) { // перетягнули ферзя на клітинку, яку б'ють — він повернувся, показуємо чому
      if (d.k && k && k !== d.k && cg.state.pieces.has(d.k) && !cg.state.pieces.has(k)) refuse(k, d.k);
      return;
    }
    if (!k) return;
    const has = cg.state.pieces.has(k);
    if (has && d.sel === k) { // тап по взятому ферзю — знімаємо в лоток
      history.push(snapshot.slice()); cg.selectSquare(null); set(queens().filter(q => q !== k)); after('tap');
    } else if (!has && d.sel && cg.state.pieces.has(d.sel)) { // ферзь узятий, а клітинку б'ють
      cg.selectSquare(null); refuse(k, d.sel);
    } else if (!has && !d.sel) { // нова клітинка — ставимо ферзя, якщо її ніхто не б'є
      if (queens().length >= N) return;
      if (!safe(k)) return refuse(k);
      history.push(snapshot.slice()); set([...queens(), k]); after('place');
    }
  }, 20);
}, true);

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
$('undo').addEventListener('click', () => { if (!history.length || won) return LG.play('error'); cg.selectSquare(null); set(history.pop()); after(); });
function start() { won = false; history = []; $('tray').classList.remove('done'); cg.selectSquare(null); set([]); cg.set({ movable: { color: 'white' } }); after(); }
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
