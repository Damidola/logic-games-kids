/* Практика після уроків: фігура проти пішаків (гра «Фігури й пішаки»).
   Мапа уроків малюється застосунком Lichess Learn — додаємо свій розділ одразу після «Шахових фігур». */
const ITEMS = [
  ['r_p5', 'R', 'Тура проти 5 пішаків', 'Тура з кута — збий усіх!'],
  ['b_p3', 'B', 'Слон проти 3 пішаків', 'Чорний слон — не пропусти пішаків'],
  ['q_p8', 'Q', 'Ферзь проти 8 пішаків', 'Ферзь сильний — збий усю армію'],
  ['n_p3', 'N', 'Кінь проти 3 пішаків', 'Стрибай літерою «Г»'],
  ['bb_p8', 'B', 'Два слони проти 8 пішаків', 'Слони разом — сила'],
  ['nn_p6', 'N', 'Два коні проти 6 пішаків', 'Коні разом']
];
function add() {
  const stages = document.querySelector('.learn-stages');
  if (!stages || stages.querySelector('.lg-practice')) return;
  const el = document.createElement('div');
  el.className = 'categ lg-practice';
  el.innerHTML = `<h2>Практика: фігури проти пішаків</h2><div class="categ_stages">${ITEMS.map(([k, p, t, s]) =>
    `<a class="stage" href="../wolfs/index.html#${k}"><img src="./assets/images/learn/pieces/${p}.svg" alt=""><div class="text"><h3>${t}</h3><p class="subtitle">${s}</p></div></a>`).join('')}</div>`;
  const first = stages.querySelector('.categ');
  stages.insertBefore(el, first ? first.nextSibling : null);
}
new MutationObserver(add).observe(document.getElementById('learn-app'), { childList: true, subtree: true });
add();
