/* Спільний каркас партії «гравець проти робота» на дошці 8×8.
   Гра дає лише правила (rules) — див. shared/ai.js і pawns/rules.js як приклад.
   Каркас робить решту: дошку Lichess, робота 1–5, тваринку-суперника,
   «Назад»/«Вперед», підказку, рахунок збитих, налаштування, екран результату. */
import { createBoard, applyBoardLook, BOARD_THEMES } from './board.js';
import { aiMove, hintMove } from './ai.js';
import { mountOpponent, LEVEL_NAMES } from './opponent.js';

const LG = window.LG;
const colorName = s => (s === 'w' ? 'white' : 'black');

/* startGame({ rules, root, options, materialIcon(color, role), extraSettings() }) */
export function startGame(cfg) {
  const { rules } = cfg;
  const root = cfg.root || document.querySelector('main');
  root.classList.add('lg-play');
  root.innerHTML = `
    <div class="lg-hero-slot"></div>
    <div class="lg-material" data-side="top"></div>
    <div class="lg-board-wrap"><div class="lg-board-el"></div>
      <button type="button" class="lg-pass" hidden>✅ Завершити хід</button></div>
    <div class="lg-material" data-side="bottom"></div>
    <div class="lg-controls">
      <button type="button" data-act="flip"><span class="ico lg-side-dot"></span><span class="lbl">Колір</span></button>
      <button type="button" data-act="new"><span class="ico">🔄</span><span class="lbl">Заново</span></button>
      <button type="button" data-act="hint"><span class="ico">💡</span><span class="lbl">Підказка</span></button>
      <button type="button" data-act="undo"><span class="ico">↩️</span><span class="lbl">Назад</span></button>
      <button type="button" data-act="redo"><span class="ico">↪️</span><span class="lbl">Вперед</span></button>
    </div>`;
  const $ = s => root.querySelector(s);

  // ---------- стан партії ----------
  let player = 'w';          // яким кольором грає дитина
  let history = [];          // позиції від початку партії
  let pos = 0;               // яку позицію зараз показано
  let hintsLeft, undosLeft, lastHint = null, thinking = false, over = false, aiTimer = null;
  let level = 1;
  const state = () => history[pos];

  const hero = mountOpponent($('.lg-hero-slot'), { onLevel: l => { level = l; } });
  level = hero.level();

  const board = createBoard($('.lg-board-el'), { onMove: (o, d) => userMove(o, d) });

  // Проміжні положення (посеред кількох стрибків) «Назад»/«Вперед» пропускають
  const stable = s => !rules.midTurn || !rules.midTurn(s);

  function dests(s) {
    const map = new Map();
    for (const m of rules.moves(s)) {
      if (!m.from || !m.to) continue; // «пропустити/завершити хід» — окремою кнопкою
      if (!map.has(m.from)) map.set(m.from, []);
      if (!map.get(m.from).includes(m.to)) map.get(m.from).push(m.to);
    }
    return map;
  }

  function render(animate = true) {
    const s = state();
    board.setPosition(rules.pieces(s), { lastMove: s.lastMove, animate, check: rules.check ? rules.check(s) : false });
    const mine = rules.turn(s) === player && !over && !thinking;
    board.setMovable(mine ? colorName(player) : null, mine ? dests(s) : new Map());
    board.clearHint();
    if (rules.marks) board.marks(rules.marks(s));
    // Кнопка «Завершити хід» — коли правила дозволяють зупинитись (наприклад, після стрибка)
    const pass = mine && rules.moves(s).find(m => m.pass);
    $('.lg-pass').hidden = !pass;
    renderMaterial();
    renderButtons();
  }

  function renderMaterial() {
    if (!rules.captured || !cfg.materialIcon) return;
    const cap = rules.captured(state()); // { w: [ролі, які збили білі], b: [...] }
    const row = (list, victimColor) => !list.length ? '' :
      list.map(r => `<img src="${cfg.materialIcon(victimColor, r)}" alt="">`).join('') + `<b>+${list.length}</b>`;
    const ai = player === 'w' ? 'b' : 'w';
    $('[data-side="top"]').innerHTML = row(cap[ai], player);
    $('[data-side="bottom"]').innerHTML = row(cap[player], ai);
  }

  function renderButtons() {
    const b = a => root.querySelector(`[data-act="${a}"]`);
    b('redo').classList.toggle('is-off', pos >= history.length - 1);
    b('flip').dataset.side = player;
  }

  // ---------- ходи ----------
  function commit(move) {
    const next = rules.play(state(), move);
    next.lastMove = move.from && move.to ? [move.from, move.to] : state().lastMove;
    history = history.slice(0, pos + 1); // новий хід — «вперед» більше нікуди
    history.push(next);
    pos++;
    lastHint = null;
    LG.play && LG.playFile && LG.playFile(new URL(`sounds/${move.capture ? 'capture' : 'move'}.mp3`, import.meta.url).href);
    return next;
  }

  function userMove(from, to) {
    const s = state();
    if (over || thinking || rules.turn(s) !== player) return render();
    const move = rules.moves(s).find(m => m.from === from && m.to === to);
    if (!move) return render();
    commit(move);
    render(false); // дитина вже сама пересунула фігуру
    afterMove();
  }

  function afterMove() {
    const s = state();
    const r = rules.result(s);
    if (r) return finish(r);
    if (rules.turn(s) !== player) robotMove();
    else render();
  }

  function robotMove() {
    thinking = true; hero.setThinking(true); render();
    clearTimeout(aiTimer);
    aiTimer = setTimeout(() => {
      const s = state();
      const move = aiMove(rules, s, level);
      thinking = false; hero.setThinking(false);
      if (!move) return render();
      commit(move);
      render();
      afterMove();
    }, 650);
  }

  function finish(r) {
    over = true; render();
    const again = { onAgain: newGame };
    if (r.winner === 'draw') LG.draw(r.text || 'Нічия!', again);
    else if (r.winner === player) LG.win(r.text || 'Перемога!', { ...again, reward: true });
    else LG.lose(r.text || 'Цього разу виграв суперник.', again);
  }

  function newGame() {
    clearTimeout(aiTimer); thinking = false; over = false; hero.setThinking(false);
    history = [rules.initial(cfg.options ? cfg.options() : {})];
    pos = 0; lastHint = null;
    hintsLeft = Number(LG.store.get('hints', '3'));
    undosLeft = Number(LG.store.get('undos', '3'));
    board.setOrientation(colorName(player));
    render(false);
    if (rules.turn(state()) !== player) robotMove();
  }

  // ---------- кнопки ----------
  function undo() {
    if (thinking) { clearTimeout(aiTimer); thinking = false; hero.setThinking(false); }
    if (pos === 0 || undosLeft <= 0) return LG.play('error');
    // Повертаємось до свого ходу: через хід робота і свій
    let p = pos - 1;
    while (p > 0 && (rules.turn(history[p]) !== player || !stable(history[p]))) p--;
    if (rules.turn(history[p]) !== player) return LG.play('error');
    pos = p; over = false; undosLeft--; lastHint = null;
    render();
  }
  function redo() {
    if (pos >= history.length - 1 || thinking) return;
    let p = pos + 1;
    while (p < history.length - 1 && (rules.turn(history[p]) !== player || !stable(history[p]))) p++;
    pos = p;
    const r = rules.result(state());
    render();
    if (r) return finish(r);
    if (rules.turn(state()) !== player) robotMove();
  }
  function hint() {
    const s = state();
    if (over || thinking || rules.turn(s) !== player) return;
    board.cg.selectSquare(null);
    const key = rules.key(s);
    if (!lastHint || lastHint.key !== key) {          // та сама позиція — та сама підказка
      if (hintsLeft <= 0) return LG.play('error');
      const m = hintMove(rules, s);
      if (!m) return;
      hintsLeft--;
      lastHint = { key, m };
    }
    board.hint(lastHint.m.from, lastHint.m.to);
  }
  $('.lg-pass').addEventListener('click', () => {
    const s = state();
    const m = !over && !thinking && rules.turn(s) === player && rules.moves(s).find(x => x.pass);
    if (!m) return;
    commit(m); render(); afterMove();
  });
  root.querySelector('.lg-controls').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    ({
      flip: () => { player = player === 'w' ? 'b' : 'w'; newGame(); },
      new: newGame, hint, undo, redo
    })[b.dataset.act]();
  });

  // ---------- налаштування (спільні для всіх ігор) ----------
  LG.addSettings(() => {
    const w = document.createElement('div');
    const OPTS = ['0', '1', '2', '3', '5', '10'];
    const sel = (id, v) => `<select id="${id}">${OPTS.map(o => `<option ${o === String(v) ? 'selected' : ''}>${o}</option>`).join('')}</select>`;
    w.innerHTML = `
      <div class="lg-set-title">Сила робота</div>
      <div class="lg-levels">${LEVEL_NAMES.map((n, i) => `<button type="button" data-l="${i + 1}" title="${n}" class="${i + 1 === level ? 'on' : ''}">${i + 1}</button>`).join('')}</div>
      <label class="lg-set-row"><span>Тваринка-суперник і фон</span><input type="checkbox" id="show-opp" ${LG.store.get('showOpponent', true) ? 'checked' : ''}></label>
      <label class="lg-set-row"><span>Показувати, куди можна піти</span><input type="checkbox" id="show-dests" ${LG.store.get('showDests', true) ? 'checked' : ''}></label>
      <div class="lg-set-row"><span>Підказок за гру</span>${sel('hints-n', LG.store.get('hints', '3'))}</div>
      <div class="lg-set-row"><span>Ходів назад</span>${sel('undos-n', LG.store.get('undos', '3'))}</div>
      <div class="lg-set-title">Колір дошки</div>
      <div class="lg-swatches">${BOARD_THEMES.map((t, i) => `<button type="button" data-t="${i}" title="${t.name}" style="background:linear-gradient(135deg, ${t.light} 50%, ${t.dark} 50%)"></button>`).join('')}</div>`;
    w.querySelectorAll('.lg-levels button').forEach(b => b.addEventListener('click', () => {
      level = +b.dataset.l; hero.setLevel(level);
      w.querySelectorAll('.lg-levels button').forEach(x => x.classList.toggle('on', x === b));
    }));
    w.querySelector('#show-opp').addEventListener('change', e => { LG.store.set('showOpponent', e.target.checked); hero.applyVisible(); });
    w.querySelector('#show-dests').addEventListener('change', e => { LG.store.set('showDests', e.target.checked); applyDests(); });
    w.querySelector('#hints-n').addEventListener('change', e => { LG.store.set('hints', e.target.value); hintsLeft = +e.target.value; });
    w.querySelector('#undos-n').addEventListener('change', e => { LG.store.set('undos', e.target.value); undosLeft = +e.target.value; });
    w.querySelectorAll('.lg-swatches button').forEach(b => b.addEventListener('click', () => {
      LG.setBoardColors(BOARD_THEMES[+b.dataset.t]); applyBoardLook();
    }));
    return w;
  });
  LG.addSettings(() => LG.pieceSetPicker(() => { applyBoardLook(); board.redraw(); }));
  if (cfg.extraSettings) LG.addSettings(cfg.extraSettings);

  const applyDests = () => board.cg.set({ movable: { showDests: LG.store.get('showDests', true) } });
  applyDests();

  // Сторінку не гортаємо пальцем (крім вікон і вибору тварин)
  document.addEventListener('touchmove', e => {
    if (!e.target.closest('.lg-modal, .lg-picker-card')) e.preventDefault();
  }, { passive: false });

  newGame();
  return { newGame, state, board, setPlayer: c => { player = c; newGame(); } };
}
