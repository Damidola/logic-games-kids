/* Хід конем: обійди конем усю дошку, на кожну клітинку — лише раз.
   Кінь стартує в куті; крапки показують, куди можна стрибнути; на пройдених клітинках — номер ходу.
   Підказка — правило Варнсдорфа (стрибай туди, звідки найменше виходів) з перевіркою, що розв'язок ще є. */
import { applyBoardLook } from '../shared/board.js';

const LG = window.LG, $ = id => document.getElementById(id);
const JUMPS = [[1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]];
let n = +LG.store.get('knight:n', 5), path = [], won = false, hintSq = -1;

applyBoardLook();
const sizeEl = $('size');
sizeEl.innerHTML = [5, 6, 7, 8].map(k => `<button type="button" role="radio" data-n="${k}">${k}×${k}</button>`).join('');
sizeEl.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; n = +b.dataset.n; LG.store.set('knight:n', n); start(); });

const jumps = (sq, seen) => {
  const r = Math.floor(sq / n), c = sq % n, out = [];
  for (const [dr, dc] of JUMPS) { const rr = r + dr, cc = c + dc; if (rr >= 0 && rr < n && cc >= 0 && cc < n && !seen.has(rr * n + cc)) out.push(rr * n + cc); }
  return out;
};
// Чи можна ще обійти всю дошку з цього місця (пошук з правилом Варнсдорфа, з обмеженням кроків)
function solvable(sq, seen, budget = { left: 60000 }) {
  if (seen.size === n * n) return true;
  if (--budget.left < 0) return null;
  const next = jumps(sq, seen).sort((a, b) => jumps(a, seen).length - jumps(b, seen).length);
  for (const m of next) {
    seen.add(m);
    const ok = solvable(m, seen, budget);
    seen.delete(m);
    if (ok) return true;
    if (ok === null) return null;
  }
  return false;
}
function bestNext() {
  const cur = path[path.length - 1], seen = new Set(path);
  const next = jumps(cur, seen).sort((a, b) => jumps(a, seen).length - jumps(b, seen).length);
  for (const m of next) { seen.add(m); const ok = solvable(m, seen); seen.delete(m); if (ok !== false) return { sq: m, sure: ok === true }; }
  return null;
}

function start() {
  path = [0]; won = false; hintSq = -1;
  sizeEl.querySelectorAll('button').forEach(b => b.setAttribute('aria-checked', String(+b.dataset.n === n)));
  const board = $('board');
  board.style.setProperty('--n', n);
  board.innerHTML = Array.from({ length: n * n }, (_, i) => `<button type="button" class="kt-sq${(Math.floor(i / n) + i % n) % 2 ? ' d' : ''}" data-i="${i}"></button>`).join('');
  render();
}
function render() {
  const cur = path[path.length - 1], seen = new Set(path), can = won ? [] : jumps(cur, seen);
  $('board').querySelectorAll('.kt-sq').forEach(el => {
    const i = +el.dataset.i, k = path.indexOf(i);
    el.classList.toggle('seen', k >= 0 && i !== cur);
    el.classList.toggle('can', can.includes(i));
    el.classList.toggle('hint', i === hintSq);
    el.classList.remove('stuck');
    el.innerHTML = i === cur ? '<mpiece class="knight white"></mpiece>' : k >= 0 ? String(k + 1) : '';
  });
  $('count').textContent = `${path.length} / ${n * n}`;
  if (!won && !can.length) {
    $('board').querySelector(`[data-i="${cur}"]`).classList.add('stuck');
    $('task').textContent = 'Кінь застряг — стрибати нікуди 🙈 Натисни ↩️ і спробуй інакше.';
    LG.play('error');
  } else if (!won) $('task').textContent = path.length === 1 ? 'Обійди конем усі клітинки — на кожну ставай лише раз. Стрибай на крапки!' : 'Стрибай далі! Порада: спершу — у кути й на краї.';
}
$('board').addEventListener('click', e => {
  const el = e.target.closest('.kt-sq'); if (!el || won) return;
  const i = +el.dataset.i, cur = path[path.length - 1];
  if (!jumps(cur, new Set(path)).includes(i)) return LG.play(path.includes(i) ? 'error' : 'tap');
  path.push(i); hintSq = -1; LG.play('move');
  if (path.length === n * n) {
    won = true; render();
    $('task').textContent = 'Уся дошка пройдена! 🎉';
    return LG.win(`Кінь обійшов усі ${n * n} клітинок!`, { reward: true, onAgain: start });
  }
  render();
});
$('hint').addEventListener('click', () => {
  if (won) return;
  const b = bestNext();
  if (!b) { LG.toast('Звідси всю дошку вже не обійти — натисни ↩️ Назад'); return LG.play('error'); }
  hintSq = b.sq; render();
});
$('undo').addEventListener('click', () => { if (path.length < 2 || won) return LG.play('error'); path.pop(); hintSq = -1; render(); });
$('new').addEventListener('click', start);
LG.addSettings(() => LG.pieceSetPicker(() => { applyBoardLook(); render(); }));
start();
