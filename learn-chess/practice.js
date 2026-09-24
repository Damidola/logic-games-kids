/* Наші розділи на мапі уроків Lichess Learn (мапу малює застосунок — додаємо свої розділи
   одразу після «Шахових фігур»): урок «Цінність фігур» і практика проти робота. */
const P = './assets/images/learn/pieces/';
const SECTIONS = [
  ['Цінність фігур і шах', [
    ['value.html', P + 'Q.svg', 'Цінність фігур', 'Пішак — 1, кінь і слон — 3, тура — 5, ферзь — 9'],
    ['check.html', P + 'K.svg', 'Шах', 'Що таке шах і три способи від нього врятуватися']]],
  ['Практика: постав мат', [
    ['../chess-puzzles/index.html#kqk', P + 'Q.svg', 'Ферзь і король проти короля', 'Постав мат — ходів скільки завгодно'],
    ['../chess-puzzles/index.html#krk', P + 'R.svg', 'Тура і король проти короля', 'Заганяй короля до краю дошки'],
    ['../chess-puzzles/index.html#kbbk', P + 'B.svg', 'Два слони і король', 'Слони разом — і король у куті'],
    ['../chess-puzzles/index.html#kpk', P + 'P.svg', 'Король і пішак проти короля', 'Проведи пішака у ферзі й постав мат']]],
  ['Практика: фігури проти пішаків', [
    ['../pieces-vs-pawns/index.html#r_p5', P + 'R.svg', 'Тура проти 5 пішаків', 'Тура з кута — збий усіх!'],
    ['../pieces-vs-pawns/index.html#b_p3', P + 'B.svg', 'Слон проти 3 пішаків', 'Чорний слон — не пропусти пішаків'],
    ['../pieces-vs-pawns/index.html#q_p8', P + 'Q.svg', 'Ферзь проти 8 пішаків', 'Ферзь сильний — збий усю армію'],
    ['../pieces-vs-pawns/index.html#n_p3', P + 'N.svg', 'Кінь проти 3 пішаків', 'Стрибай літерою «Г»'],
    ['../pieces-vs-pawns/index.html#bb_p8', P + 'B.svg', 'Два слони проти 8 пішаків', 'Слони разом — сила'],
    ['../pieces-vs-pawns/index.html#nn_p6', P + 'N.svg', 'Два коні проти 6 пішаків', 'Коні разом']]]
];
function add() {
  const stages = document.querySelector('.learn-stages');
  if (!stages || stages.querySelector('.lg-practice')) return;
  let after = stages.querySelector('.categ');
  for (const [title, items] of SECTIONS) {
    const el = document.createElement('div');
    el.className = 'categ lg-practice';
    el.innerHTML = `<h2>${title}</h2><div class="categ_stages">${items.map(([href, img, t, s]) =>
      `<a class="stage" href="${href}"><img src="${img}" alt=""><div class="text"><h3>${t}</h3><p class="subtitle">${s}</p></div></a>`).join('')}</div>`;
    stages.insertBefore(el, after ? after.nextSibling : null);
    after = el;
  }
}
new MutationObserver(add).observe(document.getElementById('learn-app'), { childList: true, subtree: true });
add();
