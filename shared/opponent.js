/* Суперник-тваринка для всіх ігор з роботом: картинка з фоном-сценою,
   маленькі стрілочки, вибір на весь екран. Тварина = рівень робота (1–5).
   У налаштуваннях тварину з фоном можна сховати. */
const ROOT = new URL('..', import.meta.url).href;
const A = f => ROOT + 'shared/opponents/' + f;

// Рівень 1 — піддається … 5 — сильний. Італійські «брейнроти» — в кінці списку.
// У кожного суперника свій фон (shared/bg/*.svg) — жоден не повторюється.
export const OPPONENTS = [
  ['Хом’ячок', 1, 'hamster.png', 'wildwest'],
  ['Капібара', 3, 'capybara.jpg', 'summer'], ['Сова', 3, 'owl.jpg', 'nightforest'], ['Кіт Очі-блюдця', 3, 'bigeyes.jpg', 'candy'],
  ['Мавпочка', 2, 'monkey.jpg', 'jungle', 'center bottom'], // на фото зверху зайве порожнє тло — показуємо низ, тварина більша
  ['Зелений робот', 3, 'robot-green.jpg', 'space'],
  ['Кіт', 4, 'cat.jpg', 'room'], ['Драматичний мопс', 4, 'pug.jpg', 'stage'], ['Кіт Смадж', 4, 'smudge.jpg', 'kitchen'],
  ['Собака', 4, 'dog.jpg', 'beach'], ['Хитрий кіт', 4, 'evilcat.jpg', 'rooftops'],
  ['Жовтий робот', 5, 'robot-yellow.jpg', 'factory'],
  ['Балерина Капучина', 2, 'ballerina.jpg', 'rainbow'],
  ['Лірілі Ларіла', 3, 'lirili.jpg', 'savanna'], ['Тралалело Тралала', 3, 'tralalero.jpg', 'underwater'], ['Тун-тун-тун-сахур', 4, 'tung-tung.jpg', 'lanterns'],
  ['Брр Брр Патапім', 4, 'patapim.jpg', 'autumn']
].map(([name, level, file, bg, pos]) => ({ name, level, avatar: A(file), bg, pos: pos || 'center' }));

const scene = n => ROOT + 'shared/bg/' + n + '.svg';

export const LEVEL_NAMES = ['Піддається', 'Слабкий', 'Новачок', 'Бадьорий', 'Сильний'];

/* mountOpponent(el, { onLevel(level) }) → { level(), setThinking(on) }
   el — порожній контейнер над дошкою. */
export function mountOpponent(el, opts = {}) {
  const LG = window.LG;
  let index = OPPONENTS.findIndex(o => o.avatar.endsWith('monkey.jpg')); // щоразу при відкритті — мавпочка
  let level = OPPONENTS[index].level;
  el.classList.add('lg-hero');
  el.innerHTML = `
    <button type="button" class="lg-hero-pic" aria-label="Обрати суперника"><img alt=""></button>
    <button type="button" class="lg-hero-arrow l" aria-label="Попередній суперник">‹</button>
    <button type="button" class="lg-hero-arrow r" aria-label="Наступний суперник">›</button>`;
  const pic = el.querySelector('.lg-hero-pic'), img = pic.querySelector('img');
  const prev = el.querySelector('.l'), next = el.querySelector('.r');

  // Сцени й картинки вантажимо одразу — тоді нічого не блимає
  OPPONENTS.forEach(o => { new Image().src = scene(o.bg); new Image().src = o.avatar; });

  function placeArrows() {
    const w = el.getBoundingClientRect(), a = img.getBoundingClientRect();
    if (!w.width || !a.width) return;
    prev.style.left = Math.max(2, a.left - w.left - 38) + 'px';
    next.style.right = Math.max(2, w.right - a.right - 38) + 'px';
  }
  window.addEventListener('resize', placeArrows);
  img.addEventListener('load', placeArrows);

  function show(i, first) {
    index = (i + OPPONENTS.length) % OPPONENTS.length;
    const o = OPPONENTS[index];
    level = o.level;
    pic.setAttribute('aria-label', 'Суперник: ' + o.name + '. Натисни, щоб обрати іншого');
    // Плавно: нова картинка спершу вантажиться, потім з'являється
    const pre = new Image();
    pre.onload = pre.onerror = () => {
      if (OPPONENTS[index] !== o) return;
      // Фон, обрізка й картинка міняються разом — інакше стара тваринка на мить стрибає на чужому фоні
      el.dataset.scene = o.bg;
      el.style.setProperty('--scene', `url("${scene(o.bg)}")`);
      el.style.setProperty('--pic-pos', o.pos);
      img.src = o.avatar; img.alt = o.name;
      el.classList.remove('switching');
      requestAnimationFrame(placeArrows);
    };
    if (!first) el.classList.add('switching');
    pre.src = o.avatar;
    if (!first && opts.onLevel) opts.onLevel(level);
  }

  // ---------- вибір на весь екран ----------
  const picker = document.createElement('div');
  picker.className = 'lg-picker';
  picker.hidden = true;
  picker.innerHTML = `<div class="lg-picker-card"><div class="lg-picker-head"><b>Обери суперника</b>
    <button type="button" class="lg-picker-x" aria-label="Закрити">✕</button></div><div class="lg-picker-grid"></div></div>`;
  document.body.appendChild(picker);
  const grid = picker.querySelector('.lg-picker-grid');
  function openPicker() {
    grid.innerHTML = OPPONENTS.map((o, i) => `<button type="button" class="lg-pick ${i === index ? 'current' : ''}" data-i="${i}">
      <img src="${o.avatar}" alt="" style="object-position: ${o.pos}"><span>${o.name}</span></button>`).join('');
    picker.hidden = false;
    requestAnimationFrame(() => picker.classList.add('open'));
    grid.querySelector('.current')?.scrollIntoView({ block: 'center' });
  }
  const closePicker = () => { picker.classList.remove('open'); setTimeout(() => { picker.hidden = true; }, 150); };
  picker.addEventListener('click', e => {
    const b = e.target.closest('.lg-pick');
    if (b) { closePicker(); if (+b.dataset.i !== index) show(+b.dataset.i); return; }
    if (e.target === picker || e.target.closest('.lg-picker-x')) closePicker();
  });
  img.addEventListener('click', openPicker);
  prev.addEventListener('click', () => show(index - 1));
  next.addEventListener('click', () => show(index + 1));

  // Показувати тваринку з фоном можна вимкнути в налаштуваннях
  const applyVisible = () => { el.hidden = !LG.store.get('showOpponent', true); };
  applyVisible();
  show(index, true);

  return {
    level: () => level,
    setLevel: l => { level = l; },
    setThinking: on => el.classList.toggle('thinking', !!on),
    applyVisible
  };
}
