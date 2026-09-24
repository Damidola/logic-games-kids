/* Хід конем: обійди конем усю дошку, на кожну клітинку — лише раз.
   Дошка — та сама дошка Lichess (chessground), обрізана до n×n (видно лівий нижній кут, a1…).
   Кінь стартує в куті a1; зеленими крапками — куди можна стрибнути; на пройдених клітинках — номер ходу.
   Підказка — правило Варнсдорфа (стрибай туди, звідки найменше виходів) з перевіркою, що обхід ще можливий. */
import { createBoard } from '../shared/board.js';

const LG = window.LG, $ = id => document.getElementById(id);
const JUMPS = [[1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]];
const F = 'abcdefgh';
let n = +LG.store.get('knight:n', 5), path = [], won = false, hintKey = null;

const board = createBoard($('board'), { onMove: (o, d) => jump(d) });
board.cg.set({ highlight: { lastMove: false } }); // шлях і так видно за номерами
const sizeEl = $('size');
sizeEl.innerHTML = [5, 6, 7, 8].map(k => `<button type="button" role="radio" data-n="${k}">${k}×${k}</button>`).join('');
sizeEl.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; n = +b.dataset.n; LG.store.set('knight:n', n); start(); });

const key = (f, r) => F[f] + (r + 1);
const jumps = (k, seen) => {
  const f = F.indexOf(k[0]), r = +k[1] - 1, out = [];
  for (const [df, dr] of JUMPS) { const ff = f + df, rr = r + dr; if (ff >= 0 && ff < n && rr >= 0 && rr < n && !seen.has(key(ff, rr))) out.push(key(ff, rr)); }
  return out;
};
// Чи можна ще обійти всю дошку звідси (пошук з правилом Варнсдорфа, з обмеженням кроків)
function solvable(k, seen, budget = { left: 60000 }) {
  if (seen.size === n * n) return true;
  if (--budget.left < 0) return null;
  const next = jumps(k, seen).sort((a, b) => jumps(a, seen).length - jumps(b, seen).length);
  for (const m of next) {
    seen.add(m); const ok = solvable(m, seen, budget); seen.delete(m);
    if (ok) return true;
    if (ok === null) return null;
  }
  return false;
}
function bestNext() {
  const cur = path[path.length - 1], seen = new Set(path);
  const next = jumps(cur, seen).sort((a, b) => jumps(a, seen).length - jumps(b, seen).length);
  for (const m of next) { seen.add(m); const ok = solvable(m, seen); seen.delete(m); if (ok !== false) return m; }
  return null;
}

function start() {
  path = ['a1']; won = false; hintKey = null;
  sizeEl.querySelectorAll('button').forEach(b => b.setAttribute('aria-checked', String(+b.dataset.n === n)));
  $('crop').style.setProperty('--n', n);
  // номери ходів — окремою незмінною сіткою поверх дошки (зверху — ряд n, знизу — ряд 1)
  $('nums').innerHTML = Array.from({ length: n * n }, (_, i) => `<span data-k="${key(i % n, n - 1 - Math.floor(i / n))}"></span>`).join('');
  requestAnimationFrame(() => { board.redraw(); render(); });
  render();
}
function render() {
  const cur = path[path.length - 1], seen = new Set(path), can = won ? [] : jumps(cur, seen);
  board.setPosition(new Map([[cur, { role: 'knight', color: 'white' }]]), { animate: true });
  board.cg.set({ lastMove: undefined });
  board.setMovable(won || !can.length ? null : 'white', new Map(can.length ? [[cur, can]] : []));
  const marks = new Map();
  path.slice(0, -1).forEach(k => marks.set(k, 'kt-seen'));
  can.forEach(k => marks.set(k, k === hintKey ? 'kt-hint' : 'kt-can'));
  if (!won && !can.length) marks.set(cur, 'kt-stuck');
  board.marks(marks);
  $('nums').querySelectorAll('span').forEach(s => { const i = path.indexOf(s.dataset.k); s.textContent = i >= 0 && s.dataset.k !== cur ? String(i + 1) : ''; });
  $('count').textContent = `${path.length} / ${n * n}`;
  if (won) return;
  if (!can.length) { $('task').textContent = 'Кінь застряг — стрибати нікуди 🙈 Натисни ↩️ і спробуй інакше.'; LG.play('error'); }
  else $('task').textContent = path.length === 1 ? 'Обійди конем усі клітинки — на кожну ставай лише раз. Стрибай на крапки!' : 'Стрибай далі! Порада: спершу — у кути й на краї.';
}
function jump(to) {
  if (won) return;
  path.push(to); hintKey = null; LG.play('move');
  if (path.length === n * n) {
    won = true; render();
    $('task').textContent = 'Уся дошка пройдена! 🎉';
    return LG.win(`Кінь обійшов усі ${n * n} клітинок!`, { reward: true, onAgain: start });
  }
  render();
}
$('hint').addEventListener('click', () => {
  if (won) return;
  const m = bestNext();
  if (!m) { LG.toast('Звідси всю дошку вже не обійти — натисни ↩️ Назад'); return LG.play('error'); }
  hintKey = m; render();
});
$('undo').addEventListener('click', () => { if (path.length < 2 || won) return LG.play('error'); path.pop(); hintKey = null; render(); });
$('new').addEventListener('click', start);
LG.addSettings(() => LG.pieceSetPicker(() => location.reload()));
start();
