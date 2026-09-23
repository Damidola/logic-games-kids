/* Спільний каркас партії «гравець проти робота» на дошці 8×8.
   Гра дає лише правила (rules) — див. shared/ai.js і pawns/rules.js як приклад.
   Каркас робить решту: дошку Lichess, робота 1–5, тваринку-суперника,
   «Назад»/«Вперед», підказку, рахунок збитих, налаштування, екран результату. */
import { createBoard, applyBoardLook, BOARD_THEMES, boardUrl } from './board.js';
import { aiMove, hintMove } from './ai.js';
import { mountOpponent, LEVEL_NAMES } from './opponent.js';

const LG = window.LG;

/* Рядок налаштувань з вибором: choice('Поле', 'ttt:size', '3', [['3', '3×3'], ...], () => game.newGame()) */
export const choice = (label, key, def, options, onChange) => () => {
  const row = document.createElement('div'); row.className = 'lg-set-row';
  const cur = String(LG.store.get(key, def));
  row.innerHTML = `<span>${label}</span><select>${options.map(([v, t]) => `<option value="${v}" ${String(v) === cur ? 'selected' : ''}>${t}</option>`).join('')}</select>`;
  row.querySelector('select').addEventListener('change', e => { LG.store.set(key, e.target.value); onChange(e.target.value); });
  return row;
};
const colorName = s => (s === 'w' ? 'white' : 'black');

/* startGame({ rules, root, options, view, autoClose, extraSettings(), sideNames, quick, player })
   quick: { key, def, options: [[значення, підпис], …] } — кнопки під дошкою (напр. розмір поля) */
export function startGame(cfg) {
  const { rules } = cfg;
  const root = cfg.root || document.querySelector('main');
  root.classList.add('lg-play');
  root.innerHTML = `
    <div class="lg-hero-slot"></div>
    <div class="lg-turn" hidden><span class="lg-side-dot"></span><b></b></div>
    <div class="lg-material" data-side="top"></div>
    <div class="lg-board-wrap"><div class="lg-board-el"></div>
      <button type="button" class="lg-pass" hidden>✅ Завершити хід</button></div>
    <div class="lg-material" data-side="bottom"></div>
    ${cfg.quick ? `<div class="lg-quick" role="radiogroup">${cfg.quick.options.map(([v, t]) => `<button type="button" role="radio" data-v="${v}">${t}</button>`).join('')}</div>` : ''}
    <div class="lg-controls lg-six">
      <button type="button" data-act="flip"><span class="ico lg-side-dot"></span><span class="lbl">Колір</span></button>
      <button type="button" data-act="level"><span class="ico lg-dots"></span><span class="lbl">Рівень</span></button>
      <button type="button" data-act="new"><span class="ico">🔄</span><span class="lbl">Заново</span></button>
      <button type="button" data-act="hint"><span class="ico">💡</span><span class="lbl">Підказка</span></button>
      <button type="button" data-act="undo"><span class="ico">↩️</span><span class="lbl">Назад</span></button>
      <button type="button" data-act="redo"><span class="ico">↪️</span><span class="lbl">Вперед</span></button>
    </div>`;
  const $ = s => root.querySelector(s);

  // ---------- стан партії ----------
  let player = cfg.player || 'w'; // яким кольором грає дитина
  let history = [];          // позиції від початку партії
  let pos = 0;               // яку позицію зараз показано
  let hintsLeft, undosLeft, lastHint = null, thinking = false, over = false, aiTimer = null;
  let robotMoves = 0, sayAt = 2 + Math.floor(Math.random() * 5);
  let level = 1;
  let paintQuick = () => {}; // кнопки під дошкою (якщо є)
  const state = () => history[pos];
  // «Грати з другом»: обидві сторони — люди на одному телефоні, робота немає
  const gameId = LG.game ? LG.game.id : 'game';
  let friend = LG.store.get('friend:' + gameId, false);
  const human = side => friend || side === player;
  const names = cfg.sideNames || { w: 'Білі', b: 'Чорні' };

  const hero = mountOpponent($('.lg-hero-slot'));
  level = 1; // за замовчуванням — найлегший; тваринка на силу не впливає
  // Кнопка «Рівень»: крапки показують силу робота; тап відкриває над кнопками смужку 1…5
  const dots = n => '<i></i>'.repeat(n);
  function paintLevel() {
    const b = root.querySelector('[data-act="level"]');
    if (b) { b.querySelector('.lg-dots').innerHTML = dots(level); b.title = 'Рівень: ' + LEVEL_NAMES[level - 1]; }
    root.querySelectorAll('.lg-level-pop button').forEach(x => x.classList.toggle('on', +x.dataset.l === level));
  }
  function toggleLevelPop() {
    const ctr = root.querySelector('.lg-controls');
    let pop = ctr.querySelector('.lg-level-pop');
    if (pop) return pop.remove();
    pop = document.createElement('div');
    pop.className = 'lg-level-pop';
    pop.innerHTML = LEVEL_NAMES.map((n, i) => `<button type="button" data-l="${i + 1}"><span class="lg-dots">${dots(i + 1)}</span><span>${n}</span></button>`).join('');
    pop.addEventListener('click', e => {
      e.stopPropagation();
      const b = e.target.closest('button'); if (!b) return;
      level = +b.dataset.l; hero.setLevel(level); LG.play('tap'); paintLevel(); pop.remove();
    });
    ctr.appendChild(pop); paintLevel();
    setTimeout(() => document.addEventListener('pointerdown', function close(ev) {
      if (!pop.contains(ev.target) && !ev.target.closest('[data-act="level"]')) pop.remove();
      if (!pop.isConnected) document.removeEventListener('pointerdown', close, true);
    }, true));
  }
  // Після зміни розкладки дошка переміщується — chessground має заново виміряти її положення
  const applyHero = () => {
    hero.applyVisible(); if (friend) $('.lg-hero-slot').hidden = true;
    requestAnimationFrame(() => board && board.redraw());
  };

  // Вигляд поля: за замовчуванням — дошка Lichess; ігри з іншим полем (хрестики-нулики,
  // чотири в ряд) дають свій view: { render(s, {mine, moves}), hint(m), clearHint() }
  const board = cfg.view ? null : createBoard($('.lg-board-el'), { onMove: (o, d) => userMove(o, d), onSelect: key => tapPassSquare(key) });
  // Посеред серії стрибків («Кути»): шашка, що стрибає, лишається вибраною з наступними стрибками,
  // а ще один тап по ній — «досить, хід закінчено» (замість окремої кнопки)
  let autoSelected = null;
  function tapPassSquare(key) {
    if (key === autoSelected) { autoSelected = null; return; } // це вибрали ми самі в render()
    const s = state(), sq = rules.passSquare && rules.passSquare(s);
    if (!sq || key !== sq || board.cg.state.selected || over || thinking || !human(rules.turn(s))) return;
    const m = rules.moves(s).find(x => x.pass);
    if (m) { commit(m); render(); afterMove(); }
  }
  const view = cfg.view ? cfg.view($('.lg-board-el'), { pick: m => userPick(m) }) : null;
  if (view) root.classList.add('lg-custom-view');

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
    const mine = human(rules.turn(s)) && !over && !thinking;
    if (view) view.render(s, { mine, moves: mine ? rules.moves(s) : [], player: friend ? rules.turn(s) : player, friend });
    else {
      board.setPosition(rules.pieces(s), { lastMove: s.lastMove, animate, check: rules.check ? rules.check(s) : false });
      board.setMovable(mine ? colorName(rules.turn(s)) : null, mine ? dests(s) : new Map());
      board.clearHint();
      if (rules.marks) board.marks(rules.marks(s));
    }
    // Кнопка «Завершити хід» — коли правила дозволяють зупинитись (наприклад, після стрибка)
    const pass = mine && rules.moves(s).find(m => m.pass);
    $('.lg-pass').hidden = !pass || !!rules.passSquare;
    const passSq = board && mine && rules.passSquare && rules.passSquare(s);
    if (passSq && board.cg.state.selected !== passSq) { autoSelected = passSq; board.cg.selectSquare(passSq); }
    const turnEl = $('.lg-turn');
    turnEl.hidden = !friend;
    turnEl.dataset.side = rules.turn(s);
    turnEl.querySelector('b').textContent = 'Хід: ' + names[rules.turn(s)];
    renderMaterial();
    renderButtons();
  }

  // Збиті фігури — як на Lichess: згруповані за видом, тим самим набором фігур, що й на дошці
  const ROLE = { P: 'pawn', N: 'knight', B: 'bishop', R: 'rook', Q: 'queen', K: 'king' };
  function renderMaterial() {
    const top = player === 'w' ? 'b' : 'w';
    if (rules.score) { // рахунок гри (фішки, квадратики, стінки) — замість збитих фігур
      const sc = rules.score(state());
      $('[data-side="top"]').innerHTML = sc[top];
      $('[data-side="bottom"]').innerHTML = sc[player];
      return;
    }
    if (!rules.captured) return;
    const cap = rules.captured(state()); // { w: [ролі, які збили білі], b: [...] }
    const row = (list, victimColor) => {
      if (!list.length) return '';
      const groups = new Map();
      for (const r of list) { const role = ROLE[r] || r.toLowerCase(); groups.set(role, (groups.get(role) || 0) + 1); }
      return [...groups].map(([role, n]) => `<div>${`<mpiece class="${role} ${colorName(victimColor)}"></mpiece>`.repeat(n)}</div>`).join('') +
        `<b>+${list.length}</b>`;
    };
    const ai = player === 'w' ? 'b' : 'w';
    $('[data-side="top"]').innerHTML = row(cap[ai], player);
    $('[data-side="bottom"]').innerHTML = row(cap[player], ai);
  }

  function renderButtons() {
    const b = a => root.querySelector(`[data-act="${a}"]`);
    b('flip').dataset.side = player;
    // З другом: без підказок, ходів назад і зміни кольору — щоб не натиснути випадково
    for (const a of ['flip', 'level', 'hint', 'undo', 'redo']) {
      b(a).disabled = friend;
      b(a).classList.toggle('is-off', friend || (a === 'redo' && pos >= history.length - 1));
    }
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
    if (over || thinking || !human(rules.turn(s))) return render();
    const move = rules.moves(s).find(m => m.from === from && m.to === to);
    if (!move) return render();
    commit(move);
    render(false); // дитина вже сама пересунула фігуру
    afterMove();
  }

  // Хід зі свого поля (не шахова дошка): гра передає готовий хід
  function userPick(id) {
    const s = state();
    if (over || thinking || !human(rules.turn(s))) return;
    const move = rules.moves(s).find(m => m.id === id); // у таких ігор кожен хід має id
    if (!move) return LG.play('error');
    commit(move); render(); afterMove();
  }

  function afterMove() {
    const s = state();
    const r = rules.result(s);
    if (r) return finish(r);
    if (!human(rules.turn(s))) robotMove();
    else render();
  }

  function robotMove() {
    thinking = true; hero.setThinking(true); render();
    // раз за партію суперник щось каже (на одному з перших ходів)
    if (++robotMoves === sayAt && !friend) hero.say();
    clearTimeout(aiTimer);
    // Робот ходить ще раз поспіль (замкнув квадратик, суперник пропускає хід) — пауза коротша
    const again = pos > 0 && rules.turn(history[pos - 1]) === rules.turn(state());
    aiTimer = setTimeout(() => {
      const s = state();
      const move = aiMove(rules, s, level);
      thinking = false; hero.setThinking(false);
      if (!move) return render();
      commit(move);
      render();
      afterMove();
    }, again ? 400 : 850 + Math.random() * 450); // «думає» трохи менше за півтори секунди — не миттєво
  }

  function finish(r) {
    over = true; render();
    const again = { onAgain: newGame };
    const autoClose = typeof cfg.autoClose === 'function' ? cfg.autoClose() : cfg.autoClose;
    if (autoClose) again.autoClose = autoClose; // швидкі ігри: вікно саме зникає
    if (friend && r.winner !== 'draw') return LG.win('Переможець: ' + names[r.winner] + '!', { ...again, reward: true });
    if (r.winner === 'draw') LG.draw(r.text || 'Нічия!', again);
    else if (r.winner === player) LG.win(r.text || 'Перемога!', { ...again, reward: true });
    else LG.lose(r.text || 'Цього разу виграв суперник.', again);
  }

  function newGame() {
    clearTimeout(aiTimer); thinking = false; over = false; hero.setThinking(false);
    robotMoves = 0; sayAt = 2 + Math.floor(Math.random() * 5);
    history = [rules.initial(cfg.options ? cfg.options() : {})];
    pos = 0; lastHint = null;
    if (friend) player = 'w';
    hintsLeft = Number(LG.store.get('hints', '3'));
    undosLeft = Number(LG.store.get('undos', '3'));
    if (board) board.setOrientation(colorName(player));
    paintQuick();
    render(false);
    if (!human(rules.turn(state()))) robotMove();
  }

  // ---------- кнопки ----------
  function undo() {
    if (friend) return;
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
    if (friend) return;
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
    if (friend || over || thinking || rules.turn(s) !== player) return;
    if (board) board.cg.selectSquare(null);
    const key = rules.key(s);
    if (!lastHint || lastHint.key !== key) {          // та сама позиція — та сама підказка
      if (hintsLeft <= 0) return LG.play('error');
      const m = hintMove(rules, s);
      if (!m) return;
      hintsLeft--;
      lastHint = { key, m };
    }
    if (view) view.hint(lastHint.m);
    else if (lastHint.m.pass && rules.passSquare) board.shapes([{ orig: rules.passSquare(s), brush: 'hint' }]);
    else board.hint(lastHint.m.from, lastHint.m.to);
  }
  $('.lg-pass').addEventListener('click', () => {
    const s = state();
    const m = !over && !thinking && human(rules.turn(s)) && rules.moves(s).find(x => x.pass);
    if (!m) return;
    commit(m); render(); afterMove();
  });
  root.querySelector('.lg-controls').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b || b.disabled) return;
    ({
      flip: () => { player = player === 'w' ? 'b' : 'w'; newGame(); },
      level: toggleLevelPop,
      new: newGame, hint, undo, redo
    })[b.dataset.act]();
  });

  // ---------- кнопки під дошкою (розмір поля тощо) ----------
  // Посеред партії — двома тапами: перший лише просить «натисни ще раз», щоб випадково не стерти гру
  if (cfg.quick) {
    const q = cfg.quick, box = $('.lg-quick');
    let pending = null, pendingTimer = null;
    paintQuick = () => box.querySelectorAll('button').forEach(b => b.setAttribute('aria-checked', String(b.dataset.v === String(LG.store.get(q.key, q.def)))));
    box.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.v === String(LG.store.get(q.key, q.def))) return;
      const started = pos > 0 && !over;
      if (started && pending !== b) {
        box.querySelectorAll('.confirm').forEach(x => x.classList.remove('confirm'));
        pending = b; b.classList.add('confirm'); LG.play('tap');
        LG.toast('Натисни ще раз — почнемо нову гру');
        clearTimeout(pendingTimer); pendingTimer = setTimeout(() => { pending = null; b.classList.remove('confirm'); }, 2500);
        return;
      }
      pending = null; b.classList.remove('confirm');
      LG.store.set(q.key, b.dataset.v); paintQuick(); newGame();
    });
  }

  // ---------- налаштування (спільні для всіх ігор) ----------
  LG.addSettings(() => {
    const w = document.createElement('div');
    const OPTS = ['0', '1', '2', '3', '5', '10'];
    const sel = (id, v) => `<select id="${id}">${OPTS.map(o => `<option ${o === String(v) ? 'selected' : ''}>${o}</option>`).join('')}</select>`;
    w.innerHTML = `
      <div class="lg-set-title">Сила робота</div>
      <div class="lg-levels">${LEVEL_NAMES.map((n, i) => `<button type="button" data-l="${i + 1}" title="${n}" class="${i + 1 === level ? 'on' : ''}">${i + 1}</button>`).join('')}</div>
      <label class="lg-set-row"><span>👫 Грати з другом (на одному телефоні)</span><input type="checkbox" id="friend" ${friend ? 'checked' : ''}></label>
      <label class="lg-set-row"><span>Тваринка-суперник і фон</span><input type="checkbox" id="show-opp" ${LG.store.get('showOpponent', true) ? 'checked' : ''}></label>
      ${board ? `<label class="lg-set-row"><span>Показувати, куди можна піти</span><input type="checkbox" id="show-dests" ${LG.store.get('showDests', true) ? 'checked' : ''}></label>` : ''}
      <div class="lg-set-row"><span>Підказок за гру</span>${sel('hints-n', LG.store.get('hints', '3'))}</div>
      <div class="lg-set-row"><span>Ходів назад</span>${sel('undos-n', LG.store.get('undos', '3'))}</div>
      ${board ? `<div class="lg-set-title">Колір дошки</div>
      <div class="lg-swatches">${BOARD_THEMES.map(t => `<button type="button" data-t="${t.id}" title="${t.id}" style="background-image:url('${boardUrl(t.file)}')"></button>`).join('')}</div>` : ''}`;
    w.querySelectorAll('.lg-levels button').forEach(b => b.addEventListener('click', () => {
      level = +b.dataset.l; hero.setLevel(level); paintLevel();
      w.querySelectorAll('.lg-levels button').forEach(x => x.classList.toggle('on', x === b));
    }));
    w.querySelector('#friend').addEventListener('change', e => {
      friend = e.target.checked; LG.store.set('friend:' + gameId, friend);
      applyHero(); newGame();
    });
    w.querySelector('#show-opp').addEventListener('change', e => { LG.store.set('showOpponent', e.target.checked); applyHero(); });
    w.querySelector('#show-dests')?.addEventListener('change', e => { LG.store.set('showDests', e.target.checked); applyDests(); });
    w.querySelector('#hints-n').addEventListener('change', e => { LG.store.set('hints', e.target.value); hintsLeft = +e.target.value; });
    w.querySelector('#undos-n').addEventListener('change', e => { LG.store.set('undos', e.target.value); undosLeft = +e.target.value; });
    w.querySelectorAll('.lg-swatches button').forEach(b => b.addEventListener('click', () => {
      LG.setBoardTheme(b.dataset.t); applyBoardLook();
    }));
    return w;
  });
  if (board) LG.addSettings(() => LG.pieceSetPicker(() => { applyBoardLook(); board.redraw(); }));
  if (cfg.extraSettings) LG.addSettings(cfg.extraSettings);

  const applyDests = () => board && board.cg.set({ movable: { showDests: LG.store.get('showDests', true) } });
  applyDests();

  // Сторінку не гортаємо пальцем (крім вікон і вибору тварин)
  document.addEventListener('touchmove', e => {
    if (!e.target.closest('.lg-modal, .lg-picker-card')) e.preventDefault();
  }, { passive: false });

  applyHero();
  newGame(); paintLevel();
  return { newGame, state, board, setPlayer: c => { player = c; newGame(); } };
}
