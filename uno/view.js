/* Поле уно: угорі — карти суперника сорочкою, посередині — колода й верхня карта,
   унизу — свої карти. Тап по карті — покласти. Чорна карта — спершу вибери колір. */
import { isWild } from './rules.js';

const SYM = { S: '⊘', R: '⇄', D: '+2', W: '🌈', F: '+4' };
const COLOR_NAME = { r: 'червоний', g: 'зелений', b: 'синій', y: 'жовтий' };
const face = c => (isWild(c) ? SYM[c] : SYM[c[1]] || c[1]);
export const cardHtml = (c, cls = '', data = '') =>
  `<div class="un-card ${isWild(c) ? 'k' : c[0]} ${cls}" ${data}><span class="un-corner">${face(c)}</span><span class="un-oval">${face(c)}</span></div>`;

export function unoView(el, { pick }) {
  el.classList.add('un-root');
  el.innerHTML = `<div class="un-opp"></div>
    <div class="un-table">
      <button type="button" class="un-deck" aria-label="Взяти карту"><span>Взяти</span></button>
      <div class="un-top"></div>
      <div class="un-color" title="Колір зараз"></div>
    </div>
    <div class="un-msg"></div>
    <div class="un-hand"></div>
    <div class="un-pickcolor" hidden><p>Який колір?</p><div>${['r', 'g', 'b', 'y'].map(c => `<button type="button" class="un-col ${c}" data-c="${c}"></button>`).join('')}</div></div>`;
  const $ = s => el.querySelector(s);
  let cur = null, wild = null, hintId = null;

  function message(s, side) {
    const L = s.log; if (!L) return 'Поклади карту того ж кольору або того ж знаку';
    const me = L.who === side, who = me ? 'Ти' : 'Суперник';
    if (L.draw === 0) return 'Карт більше немає — хід переходить';
    if (L.draw) return s.drawn && me ? 'Узята карта підходить — поклади її!' : `${who} взяв карту`;
    let t = '';
    if (L.gave) t = me ? `Суперник бере ${L.gave} і пропускає хід!` : `Ти береш ${L.gave} і пропускаєш хід`;
    else if (/[SR]/.test(L.card[1] || '')) t = me ? 'Суперник пропускає — ходи ще раз!' : 'Суперник ходить ще раз';
    if (isWild(L.card)) t = (t ? t + ' · ' : '') + 'колір: ' + COLOR_NAME[s.color];
    return t || (s.hand[side].length === 1 ? 'Уно! Лишилась одна карта!' : '');
  }

  function draw() {
    const { s, mine, moves } = cur, side = cur.friend ? s.t : cur.player, opp = side === 'w' ? 'b' : 'w';
    const ok = new Set(moves.filter(m => m.card).map(m => m.card));
    $('.un-opp').innerHTML = s.hand[opp].map(() => '<div class="un-card back"></div>').join('');
    $('.un-top').innerHTML = cardHtml(s.top, 'top', `data-top="${s.top}"`);
    $('.un-color').className = 'un-color ' + s.color;
    const canDraw = mine && moves.some(m => m.draw);
    $('.un-deck').classList.toggle('go', canDraw);
    $('.un-hand').innerHTML = s.hand[side].map((c, i) =>
      cardHtml(c, (mine ? (ok.has(c) && (!s.drawn || i === s.hand[side].length - 1) ? 'ok' : 'no') : '') + (hintId && hintId.split(':')[0] === c ? ' hinted' : ''), `data-c="${c}" data-i="${i}"`)).join('');
    $('.un-msg').textContent = canDraw ? 'Нема чим ходити — візьми карту 👆' : message(s, side);
    $('.un-pickcolor').hidden = !wild;
  }

  el.addEventListener('click', e => {
    if (!cur || !cur.mine) return;
    const LG = window.LG;
    const col = e.target.closest('.un-col');
    if (col && wild) { const id = wild + ':' + col.dataset.c; wild = null; return pick(id); }
    if (wild && !e.target.closest('.un-pickcolor')) { wild = null; return draw(); }
    if (e.target.closest('.un-deck')) {
      if (cur.moves.some(m => m.draw)) return pick('draw');
      LG && LG.play('error'); LG && LG.toast('У тебе є чим ходити 😉'); return;
    }
    const c = e.target.closest('.un-hand .un-card'); if (!c) return;
    const card = c.dataset.c, m = cur.moves.find(x => x.card === card);
    if (!m || !c.classList.contains('ok')) { LG && LG.play('error'); return; }
    if (isWild(card)) { wild = card; LG && LG.play('tap'); return draw(); }
    pick(card);
  });

  return {
    render(s, info) { cur = { s, ...info }; if (!info.mine) wild = null; hintId = null; draw(); },
    hint(m) {
      if (m.draw) { const d = $('.un-deck'); d.classList.remove('hinted'); void d.offsetWidth; d.classList.add('hinted'); return; }
      hintId = m.id; draw();
    },
    clearHint() { hintId = null; }
  };
}
