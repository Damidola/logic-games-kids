/* Ряди сірників. Тап по сірнику виділяє його й усі праворуч у ряді; «Взяти» або ще один тап — забрати. */
export function nimView(el, { pick }) {
  el.classList.add('nim-board');
  let sel = null, cur = null, lastKey = '';
  el.innerHTML = '<div class="nim-rows"></div><button type="button" class="nim-take" hidden></button>';
  const rowsEl = el.querySelector('.nim-rows'), take = el.querySelector('.nim-take');
  const draw = () => {
    const s = cur.s;
    const key = s.init.join(',');
    if (key !== lastKey) {
      lastKey = key;
      rowsEl.innerHTML = s.init.map((len, r) => `<div class="nim-row">${Array.from({ length: len }, (_, k) => `<button type="button" class="nim-stick" data-r="${r}" data-k="${k}" aria-label="Сірник"></button>`).join('')}</div>`).join('');
    }
    rowsEl.querySelectorAll('.nim-stick').forEach(b => {
      const r = +b.dataset.r, k = +b.dataset.k, left = s.rows[r];
      const gone = k >= left;
      const justTaken = gone && s.last && s.last.r === r && k >= s.last.from && k < s.last.from + s.last.n;
      b.className = 'nim-stick' + (gone ? ' gone' + (justTaken ? ' taken' : '') : '') +
        (!gone && sel && sel.r === r && k >= sel.k ? ' sel' : '') + (!gone && cur.mine ? ' free' : '');
    });
    const n = sel ? s.rows[sel.r] - sel.k : 0;
    take.hidden = !sel;
    take.textContent = `✋ Взяти ${n}`;
  };
  rowsEl.addEventListener('click', e => {
    const b = e.target.closest('.nim-stick');
    if (!b || !cur || !cur.mine || b.classList.contains('gone')) return;
    const r = +b.dataset.r, k = +b.dataset.k;
    if (sel && sel.r === r && k >= sel.k) return confirm();
    sel = { r, k }; draw();
  });
  const confirm = () => { if (!sel) return; const m = `${sel.r}:${cur.s.rows[sel.r] - sel.k}`; sel = null; pick(m); };
  take.addEventListener('click', confirm);
  return {
    render(s, { mine }) { if (!mine) sel = null; cur = { s, mine }; draw(); },
    hint(m) {
      sel = { r: m.r, k: cur.s.rows[m.r] - m.n }; draw();
      rowsEl.querySelectorAll('.nim-stick.sel').forEach(b => { b.classList.remove('hinted'); void b.offsetWidth; b.classList.add('hinted'); });
    },
    clearHint() { rowsEl.querySelectorAll('.hinted').forEach(b => b.classList.remove('hinted')); }
  };
}
